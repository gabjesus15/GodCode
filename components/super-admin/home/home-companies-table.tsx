"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
	ArrowDown,
	ArrowUp,
	Building2,
	ExternalLink,
	MoreHorizontal,
	Search,
	Settings2,
} from "lucide-react";

import { SaasStatusBadge } from "@/components/super-admin/shared/saas-status-badge";
import { HOME_DEMO_PARAM, homeQuery } from "@/lib/super-admin/home-demo";
import type { HomeCompanyGroup, HomeCompanyRow } from "@/lib/super-admin/home-overview-types";
import { cn } from "@/utils/cn";

import { CompanyLogo, expiryHint, fmtDate } from "./home-company-shared";
import { RowAlertBanner } from "./row-alert-banner";

type GroupFilter = "all" | "payments" | HomeCompanyGroup;
type SortKey = "name" | "endsAt" | "createdAt";
type Sort = { key: SortKey; dir: "asc" | "desc" };

const GROUP_OPTIONS: Array<{ value: GroupFilter; label: string }> = [
	{ value: "all", label: "Todos los estados" },
	{ value: "cancelling", label: "Quieren darse de baja" },
	{ value: "payments", label: "Pagos que no cuadran" },
	{ value: "application", label: "Solicitudes de alta" },
	{ value: "active", label: "Activas" },
	{ value: "expiring", label: "Por vencer" },
	{ value: "pending", label: "Pago pendiente" },
	{ value: "churned", label: "Dadas de baja" },
];

const ALERT_RANK = { cancellation: 0, payment: 1, application: 2 } as const;

/** Las filas con aviso van primero (bajas, pagos que no cuadran, solicitudes); después, el orden elegido. */
function alertRank(row: HomeCompanyRow): number {
	return row.alert ? ALERT_RANK[row.alert.kind] : 3;
}

function compare(a: HomeCompanyRow, b: HomeCompanyRow, sort: Sort): number {
	const rank = alertRank(a) - alertRank(b);
	if (rank !== 0) return rank;
	const dir = sort.dir === "asc" ? 1 : -1;
	if (sort.key === "name") return a.name.localeCompare(b.name, "es") * dir;
	const av = a[sort.key] ? new Date(a[sort.key] as string).getTime() : null;
	const bv = b[sort.key] ? new Date(b[sort.key] as string).getTime() : null;
	// Las filas sin fecha van siempre al final, en cualquier sentido de orden.
	if (av == null && bv == null) return 0;
	if (av == null) return 1;
	if (bv == null) return -1;
	return (av - bv) * dir;
}

export function HomeCompaniesTable({ companies }: { companies: HomeCompanyRow[] }) {
	const [query, setQuery] = useState("");
	const [group, setGroup] = useState<GroupFilter>("all");
	const [sort, setSort] = useState<Sort>({ key: "createdAt", dir: "desc" });
	const router = useRouter();
	const searchParams = useSearchParams();
	// La gestión es una ruta propia (/dashboard/empresa|solicitud/[id]) que se pinta en
	// ventana encima del Inicio: se puede recargar o compartir sin perder lo que estaba abierto.
	const openHref = (href: string) => {
		// Los avisos ya traen su query (simulación); si no, se conserva la del Inicio.
		const query = href.includes("?")
			? ""
			: homeQuery({ period: searchParams?.get("period"), demo: searchParams?.get(HOME_DEMO_PARAM) === "1" });
		router.push(`${href}${query}`, { scroll: false });
	};
	const openManage = (row: HomeCompanyRow) =>
		openHref(row.kind === "application" ? `/dashboard/solicitud/${row.id}` : `/dashboard/empresa/${row.id}`);
	const searchId = useId();
	const groupId = useId();

	const rows = useMemo(() => {
		const q = query.trim().toLowerCase();
		return companies
			.filter((c) => group === "all" || (group === "payments" ? c.alert?.kind === "payment" : c.group === group))
			.filter((c) => !q || c.name.toLowerCase().includes(q) || c.host.toLowerCase().includes(q))
			.sort((a, b) => compare(a, b, sort));
	}, [companies, query, group, sort]);

	const companyCount = companies.filter((c) => c.kind === "company").length;
	const applicationCount = companies.length - companyCount;

	const toggleSort = (key: SortKey) =>
		setSort((prev) => (prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "name" ? "asc" : "desc" }));

	return (
		<section className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" aria-labelledby="home-companies-title">
			<div className="flex flex-col gap-3 border-b border-zinc-100 p-4 dark:border-zinc-800 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
				<div>
					<h2 id="home-companies-title" className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
						Todas las empresas
					</h2>
					<p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400" aria-live="polite">
						{rows.length} de {companies.length} · {companyCount} {companyCount === 1 ? "empresa" : "empresas"}
						{applicationCount > 0 ? ` y ${applicationCount} ${applicationCount === 1 ? "solicitud" : "solicitudes"}` : ""}
					</p>
				</div>
				<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
					<label htmlFor={searchId} className="sr-only">
						Buscar por nombre o dirección
					</label>
					<div className="relative sm:w-72">
						<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden />
						<input
							id={searchId}
							type="search"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Buscar por nombre o dirección…"
							className="h-9 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
						/>
					</div>
					<label htmlFor={groupId} className="sr-only">
						Filtrar por estado
					</label>
					<select
						id={groupId}
						value={group}
						onChange={(e) => setGroup(e.target.value as GroupFilter)}
						className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-700 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
					>
						{GROUP_OPTIONS.map((o) => (
							<option key={o.value} value={o.value}>
								{o.label}
							</option>
						))}
					</select>
				</div>
			</div>

			{rows.length === 0 ? (
				<div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
					<Building2 className="h-6 w-6 text-zinc-300" aria-hidden />
					<p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
						{companies.length === 0 ? "Aún no hay empresas" : "Ninguna empresa coincide"}
					</p>
					<p className="text-xs text-zinc-500">
						{companies.length === 0 ? "Aparecerán aquí cuando termine la primera alta." : "Prueba con otro nombre o cambia el estado."}
					</p>
				</div>
			) : (
				<>
					{/* Escritorio y tablet */}
					<div className="hidden overflow-x-auto md:block">
						<table className="w-full min-w-[960px] text-left text-sm">
							<thead>
								<tr className="border-b border-zinc-100 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
									<SortHeader label="Empresa" sortKey="name" sort={sort} onSort={toggleSort} className="pl-5" />
									<th scope="col" className="px-3 py-3 font-medium">Correo</th>
									<th scope="col" className="px-3 py-3 font-medium">WhatsApp</th>
									<th scope="col" className="px-3 py-3 font-medium">Plan</th>
									<th scope="col" className="px-3 py-3 font-medium">Estado</th>
									<SortHeader label="Vence" sortKey="endsAt" sort={sort} onSort={toggleSort} />
									<SortHeader label="Cliente desde" sortKey="createdAt" sort={sort} onSort={toggleSort} />
									<th scope="col" className="py-3 pl-3 pr-5 text-right font-medium">
										<span className="sr-only">Acciones</span>
									</th>
								</tr>
							</thead>
							<tbody>
								{rows.map((row) => {
									const hint = expiryHint(row);
									return (
										<Fragment key={`${row.kind}:${row.id}`}>
											{row.alert ? (
												<tr>
													<td colSpan={8} className="px-4 pb-0 pt-3">
														<RowAlertBanner alert={row.alert} onOpen={openHref} />
													</td>
												</tr>
											) : null}
											<tr className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/70 dark:border-zinc-800 dark:hover:bg-zinc-800/40">
												<td className="py-3 pl-5 pr-3">
													<CompanyCell row={row} onManage={openManage} />
												</td>
												<td className="px-3 py-3 text-[13px] tabular-nums text-zinc-600 dark:text-zinc-300">{row.emailMasked ?? <Empty />}</td>
												<td className="px-3 py-3 text-[13px] tabular-nums text-zinc-600 dark:text-zinc-300">{row.whatsappMasked ?? <Empty />}</td>
												<td className="px-3 py-3 text-zinc-700 dark:text-zinc-200">{row.planName ?? <Empty />}</td>
												<td className="px-3 py-3">
													<SaasStatusBadge label={row.status.label} variant={row.status.variant} />
												</td>
												<td className="px-3 py-3">
													<p className="text-zinc-700 dark:text-zinc-200">{fmtDate(row.endsAt)}</p>
													<p className={cn("text-xs", hint.tone)}>{hint.text}</p>
												</td>
												<td className="px-3 py-3 text-zinc-700 dark:text-zinc-200">{fmtDate(row.createdAt)}</td>
												<td className="py-3 pl-3 pr-5 text-right">
													<RowActions row={row} onManage={openManage} />
												</td>
											</tr>
										</Fragment>
									);
								})}
							</tbody>
						</table>
					</div>

					{/* Móvil: tarjetas */}
					<ul className="divide-y divide-zinc-100 dark:divide-zinc-800 md:hidden">
						{rows.map((row) => {
							const hint = expiryHint(row);
							return (
								<li key={`${row.kind}:${row.id}`} className="p-4">
									{row.alert ? (
										<div className="mb-3">
											<RowAlertBanner alert={row.alert} onOpen={openHref} />
										</div>
									) : null}
									<div className="flex items-start justify-between gap-3">
										<CompanyCell row={row} onManage={openManage} />
										<RowActions row={row} onManage={openManage} />
									</div>
									<dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
										<MobileField label="Estado">
											<SaasStatusBadge label={row.status.label} variant={row.status.variant} />
										</MobileField>
										<MobileField label="Plan">{row.planName ?? "—"}</MobileField>
										<MobileField label="Correo">
											<span className="tabular-nums">{row.emailMasked ?? "—"}</span>
										</MobileField>
										<MobileField label="WhatsApp">
											<span className="tabular-nums">{row.whatsappMasked ?? "—"}</span>
										</MobileField>
										<MobileField label="Vence">
											{fmtDate(row.endsAt)} <span className={hint.tone}>· {hint.text}</span>
										</MobileField>
										<MobileField label={row.kind === "application" ? "Solicitó" : "Cliente desde"}>{fmtDate(row.createdAt)}</MobileField>
									</dl>
								</li>
							);
						})}
					</ul>
				</>
			)}
		</section>
	);
}

function Empty() {
	return <span className="text-zinc-300 dark:text-zinc-600">—</span>;
}

function SortHeader({
	label,
	sortKey,
	sort,
	onSort,
	className,
}: {
	label: string;
	sortKey: SortKey;
	sort: Sort;
	onSort: (key: SortKey) => void;
	className?: string;
}) {
	const active = sort.key === sortKey;
	const Icon = sort.dir === "asc" ? ArrowUp : ArrowDown;
	return (
		<th
			scope="col"
			className={cn("px-3 py-3 font-medium", className)}
			aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
		>
			<button
				type="button"
				onClick={() => onSort(sortKey)}
				className={cn(
					"inline-flex items-center gap-1 rounded transition hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 dark:hover:text-zinc-100",
					active && "text-zinc-900 dark:text-zinc-100",
				)}
			>
				{label}
				{active ? <Icon className="h-3 w-3" aria-hidden /> : null}
			</button>
		</th>
	);
}

function CompanyCell({ row, onManage }: { row: HomeCompanyRow; onManage: (row: HomeCompanyRow) => void }) {
	return (
		<div className="flex min-w-0 items-center gap-3">
			<CompanyLogo row={row} />
			<div className="min-w-0">
				<button
					type="button"
					onClick={() => onManage(row)}
					className="block max-w-full truncate rounded text-left font-medium text-zinc-950 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 dark:text-zinc-50"
				>
					{row.name}
				</button>
				{row.host ? <p className="truncate text-xs text-zinc-400">{row.host}</p> : null}
			</div>
		</div>
	);
}

function MobileField({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="min-w-0">
			<dt className="text-zinc-400">{label}</dt>
			<dd className="mt-0.5 truncate text-zinc-700 dark:text-zinc-200">{children}</dd>
		</div>
	);
}

const MENU_WIDTH = 208;

/**
 * Menú de cada fila. Se pinta en un portal con posición fija: dentro de la tabla (que tiene
 * scroll horizontal) quedaba recortado y metía una barra de scroll vertical.
 */
function RowActions({ row, onManage }: { row: HomeCompanyRow; onManage: (row: HomeCompanyRow) => void }) {
	const [open, setOpen] = useState(false);
	const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);
	const menuId = useId();

	useLayoutEffect(() => {
		if (!open) return;
		const place = () => {
			const btn = buttonRef.current?.getBoundingClientRect();
			if (!btn) return;
			const menuHeight = menuRef.current?.offsetHeight ?? 132;
			const below = btn.bottom + 4;
			const top = below + menuHeight > window.innerHeight - 8 ? Math.max(8, btn.top - 4 - menuHeight) : below;
			const left = Math.min(Math.max(8, btn.right - MENU_WIDTH), window.innerWidth - MENU_WIDTH - 8);
			setPos({ top, left });
		};
		place();
		// Al hacer scroll el botón se mueve: se cierra en vez de quedar flotando lejos.
		const close = () => setOpen(false);
		window.addEventListener("resize", close);
		window.addEventListener("scroll", close, true);
		return () => {
			window.removeEventListener("resize", close);
			window.removeEventListener("scroll", close, true);
		};
	}, [open]);

	useEffect(() => {
		if (!open) return undefined;
		const onPointer = (e: PointerEvent) => {
			const target = e.target as Node;
			if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) setOpen(false);
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setOpen(false);
				buttonRef.current?.focus();
			}
		};
		document.addEventListener("pointerdown", onPointer);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("pointerdown", onPointer);
			document.removeEventListener("keydown", onKey);
		};
	}, [open]);

	const itemClass =
		"flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-sm text-zinc-700 transition hover:bg-zinc-100 focus-visible:bg-zinc-100 focus-visible:outline-none dark:text-zinc-200 dark:hover:bg-zinc-800 dark:focus-visible:bg-zinc-800";

	return (
		<>
			<button
				ref={buttonRef}
				type="button"
				onClick={() => {
					setPos(null);
					setOpen((v) => !v);
				}}
				aria-expanded={open}
				aria-haspopup="menu"
				aria-controls={open ? menuId : undefined}
				aria-label={`Acciones de ${row.name}`}
				className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
			>
				<MoreHorizontal className="h-4 w-4" aria-hidden />
			</button>
			{open
				? createPortal(
						<div
							ref={menuRef}
							id={menuId}
							role="menu"
							style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, width: MENU_WIDTH }}
							className="fixed z-[120] rounded-xl border border-zinc-200 bg-white p-1 text-left shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
						>
							<button
								type="button"
								role="menuitem"
								className={itemClass}
								onClick={() => {
									setOpen(false);
									onManage(row);
								}}
							>
								<Settings2 className="h-4 w-4 text-zinc-400" aria-hidden />
								{row.kind === "application" ? "Revisar solicitud" : "Gestionar"}
							</button>
							{row.url ? (
								<a href={row.url} target="_blank" rel="noreferrer" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
									<ExternalLink className="h-4 w-4 text-zinc-400" aria-hidden />
									Ver su menú
								</a>
							) : null}
						</div>,
						document.body,
					)
				: null}
		</>
	);
}
