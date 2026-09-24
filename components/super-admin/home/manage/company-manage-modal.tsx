"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, X } from "lucide-react";

import { CopyFieldButton } from "@/components/super-admin/shared/copy-field-button";
import { SaasStatusBadge } from "@/components/super-admin/shared/saas-status-badge";
import type { StatusTone } from "@/lib/status/status-labels";
import type { HomeAlertKind } from "@/lib/super-admin/home-overview-types";
import { cn } from "@/utils/cn";

import { RowAlertBanner } from "../row-alert-banner";

export type ManageModalHeader = {
	id: string;
	name: string;
	host: string;
	publicSlug: string | null;
	logoUrl: string | null;
	status: { label: string; variant: StatusTone };
	menuUrl: string;
	panelUrl: string;
	facts: Array<{ label: string; value: string; hint?: string; hintTone?: "muted" | "warning" | "danger" }>;
};

export type ManageModalTab = { id: string; label: string; content: React.ReactNode };

/** Aviso fijo sobre las pestañas (p. ej. "Quiere darse de baja"). */
export type ManageModalNotice = { kind: HomeAlertKind; title: string; detail: string };

const HINT_TONE = {
	muted: "text-zinc-400",
	warning: "text-amber-600 dark:text-amber-400",
	danger: "text-red-600 dark:text-red-400",
} as const;

/**
 * Ventana de gestión de una empresa. No usa <dialog> nativo: su capa superior tapaba los
 * cajones y confirmaciones que abren las secciones (p. ej. eliminar empresa).
 */
export function CompanyManageModal({
	header,
	tabs,
	actions,
	notice,
	closeHref,
}: {
	header: ManageModalHeader;
	tabs: ManageModalTab[];
	actions?: React.ReactNode;
	notice?: ManageModalNotice | null;
	closeHref: string;
}) {
	const router = useRouter();
	const panelRef = useRef<HTMLDivElement>(null);
	const [activeId, setActiveId] = useState(tabs[0]?.id ?? "");
	const [logoFailed, setLogoFailed] = useState(false);
	const titleId = useId();
	const tabsId = useId();

	const close = () => router.push(closeHref, { scroll: false });

	useEffect(() => {
		const previous = document.activeElement as HTMLElement | null;
		panelRef.current?.focus();
		const { overflow } = document.body.style;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = overflow;
			previous?.focus?.();
		};
	}, []);

	return (
		<div className="fixed inset-0 z-[130] flex items-end justify-center sm:items-center sm:p-4">
			<button
				type="button"
				tabIndex={-1}
				aria-label="Cerrar"
				className="absolute inset-0 cursor-default bg-zinc-950/40 backdrop-blur-[2px]"
				onClick={close}
			/>
			<div
				ref={panelRef}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				tabIndex={-1}
				// Esc solo desde dentro de la ventana: los cajones que abre van en otro portal y
				// cierran solos sin cerrar también esta ventana.
				onKeyDown={(e) => {
					if (e.key === "Escape" && !e.defaultPrevented) {
						e.stopPropagation();
						close();
					}
				}}
				className="relative flex h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-t-2xl border border-zinc-200 bg-zinc-50 shadow-2xl outline-none dark:border-zinc-800 dark:bg-zinc-950 sm:h-[min(92dvh,56rem)] sm:max-w-5xl sm:rounded-2xl"
			>
				<header className="border-b border-zinc-200 bg-white px-4 pt-4 dark:border-zinc-800 dark:bg-zinc-900 sm:px-6 sm:pt-5">
					<div className="flex items-start gap-3 sm:gap-4">
						{header.logoUrl && !logoFailed ? (
							// eslint-disable-next-line @next/next/no-img-element -- logo firmado de Storage
							<img
								src={header.logoUrl}
								alt=""
								className="h-12 w-12 shrink-0 rounded-xl border border-zinc-100 bg-white object-contain dark:border-zinc-800"
								onError={() => setLogoFailed(true)}
							/>
						) : (
							<span
								className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-base font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
								aria-hidden
							>
								{header.name.slice(0, 1).toUpperCase()}
							</span>
						)}
						<div className="min-w-0 flex-1">
							<div className="flex min-w-0 flex-wrap items-center gap-2">
								<h2 id={titleId} className="truncate text-lg font-semibold text-zinc-950 dark:text-zinc-50">
									{header.name}
								</h2>
								<SaasStatusBadge label={header.status.label} variant={header.status.variant} />
							</div>
							<div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
								{header.host ? <span className="truncate text-zinc-500 dark:text-zinc-400">{header.host}</span> : null}
								{header.menuUrl ? <HeaderLink href={header.menuUrl}>Menú</HeaderLink> : null}
								{header.panelUrl ? <HeaderLink href={header.panelUrl}>Panel</HeaderLink> : null}
								<span className="flex gap-1.5">
									<CopyFieldButton value={header.id} label="ID" />
									{header.publicSlug ? <CopyFieldButton value={header.publicSlug} label="Subdominio" /> : null}
								</span>
							</div>
						</div>
						<button
							type="button"
							onClick={close}
							aria-label="Cerrar"
							className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
						>
							<X className="h-4 w-4" aria-hidden />
						</button>
					</div>

					<dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
						{header.facts.map((fact) => (
							<div key={fact.label} className="min-w-0">
								<dt className="text-xs text-zinc-500 dark:text-zinc-400">{fact.label}</dt>
								<dd className="mt-0.5 truncate text-sm font-medium text-zinc-950 dark:text-zinc-50">
									{fact.value}
									{fact.hint ? (
										<span className={cn("ml-1.5 text-xs font-normal", HINT_TONE[fact.hintTone ?? "muted"])}>{fact.hint}</span>
									) : null}
								</dd>
							</div>
						))}
					</dl>

					<div
						role="tablist"
						aria-label="Secciones de la empresa"
						className="-mb-px mt-4 flex gap-1 overflow-x-auto [scrollbar-width:none]"
					>
						{tabs.map((tab) => {
							const active = tab.id === activeId;
							return (
								<button
									key={tab.id}
									type="button"
									role="tab"
									id={`${tabsId}-${tab.id}`}
									aria-selected={active}
									aria-controls={`${tabsId}-${tab.id}-panel`}
									onClick={() => setActiveId(tab.id)}
									className={cn(
										"shrink-0 border-b-2 px-3 pb-2.5 pt-1 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900/20",
										active
											? "border-zinc-900 font-medium text-zinc-950 dark:border-zinc-100 dark:text-zinc-50"
											: "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
									)}
								>
									{tab.label}
								</button>
							);
						})}
					</div>
				</header>

				<div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
					{notice ? (
						<div className="mb-4">
							<RowAlertBanner alert={notice} />
						</div>
					) : null}
					{/* Todas montadas: cambiar de pestaña no pierde lo que se estaba editando. */}
					{tabs.map((tab) => (
						<div
							key={tab.id}
							role="tabpanel"
							id={`${tabsId}-${tab.id}-panel`}
							aria-labelledby={`${tabsId}-${tab.id}`}
							hidden={tab.id !== activeId}
						>
							{tab.content}
						</div>
					))}
				</div>

				{actions ? (
					<footer className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900 sm:px-6">
						{actions}
					</footer>
				) : null}
			</div>
		</div>
	);
}

function HeaderLink({ href, children }: { href: string; children: React.ReactNode }) {
	return (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			className="inline-flex items-center gap-1 font-medium text-zinc-700 hover:text-zinc-950 hover:underline dark:text-zinc-300 dark:hover:text-zinc-50"
		>
			{children}
			<ExternalLink className="h-3 w-3" aria-hidden />
		</a>
	);
}

/** Esqueleto mientras el servidor arma la ventana. */
export function CompanyManageModalSkeleton() {
	return (
		<div className="fixed inset-0 z-[130] flex items-end justify-center sm:items-center sm:p-4" aria-busy="true" aria-label="Cargando empresa">
			<div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-[2px]" />
			<div className="relative flex h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-t-2xl border border-zinc-200 bg-zinc-50 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 sm:h-[min(92dvh,56rem)] sm:max-w-5xl sm:rounded-2xl">
				<div className="border-b border-zinc-200 bg-white px-6 py-5 dark:border-zinc-800 dark:bg-zinc-900">
					<div className="flex items-center gap-4">
						<div className="h-12 w-12 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
						<div className="space-y-2">
							<div className="h-5 w-48 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
							<div className="h-4 w-32 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
						</div>
					</div>
					<div className="mt-5 grid grid-cols-4 gap-6">
						{[0, 1, 2, 3].map((i) => (
							<div key={i} className="h-9 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
						))}
					</div>
				</div>
				<div className="grid grid-cols-2 gap-3 p-6 lg:grid-cols-4">
					{[0, 1, 2, 3].map((i) => (
						<div key={i} className="h-24 animate-pulse rounded-xl bg-white dark:bg-zinc-900" />
					))}
				</div>
			</div>
		</div>
	);
}
