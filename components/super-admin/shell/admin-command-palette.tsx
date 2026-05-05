"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";

import { SUPER_ADMIN_NAV } from "@/lib/super-admin/super-admin-nav";

type CompanyHit = {
	id: string;
	name: string | null;
	public_slug: string | null;
	subscription_status: string | null;
};

export function AdminCommandPalette() {
	const [open, setOpen] = useState(false);
	const [q, setQ] = useState("");
	const [companies, setCompanies] = useState<CompanyHit[]>([]);
	const [companiesLoading, setCompaniesLoading] = useState(false);
	const router = useRouter();
	const openRef = useRef(false);
	useEffect(() => {
		openRef.current = open;
	}, [open]);

	useEffect(() => {
		const onKeyCapture = (e: KeyboardEvent) => {
			if (e.key === "Escape" && openRef.current) {
				e.preventDefault();
				e.stopPropagation();
				setOpen(false);
			}
		};
		document.addEventListener("keydown", onKeyCapture, true);
		return () => document.removeEventListener("keydown", onKeyCapture, true);
	}, []);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				setOpen((o) => !o);
			}
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, []);

	useEffect(() => {
		if (!open) {
			setCompanies([]);
			setCompaniesLoading(false);
			return;
		}

		const t = q.trim();
		if (t.length < 2) {
			setCompanies([]);
			setCompaniesLoading(false);
			return;
		}

		const ac = new AbortController();
		setCompaniesLoading(true);
		const timer = window.setTimeout(() => {
			void (async () => {
				try {
					const res = await fetch(
						`/api/super-admin/companies-search?q=${encodeURIComponent(t)}`,
						{ signal: ac.signal, cache: "no-store" },
					);
					const data = (await res.json()) as { companies?: CompanyHit[] };
					if (!ac.signal.aborted) {
						setCompanies(Array.isArray(data.companies) ? data.companies : []);
					}
				} catch (e: unknown) {
					const aborted =
						typeof e === "object" &&
						e !== null &&
						"name" in e &&
						(e as { name: string }).name === "AbortError";
					if (aborted) return;
					if (!ac.signal.aborted) setCompanies([]);
				} finally {
					if (!ac.signal.aborted) setCompaniesLoading(false);
				}
			})();
		}, 280);

		return () => {
			clearTimeout(timer);
			ac.abort();
			setCompaniesLoading(false);
		};
	}, [open, q]);

	const filtered = useMemo(() => {
		const s = q.trim().toLowerCase();
		if (!s) return SUPER_ADMIN_NAV;
		return SUPER_ADMIN_NAV.filter(
			(item) =>
				item.label.toLowerCase().includes(s) ||
				item.href.toLowerCase().includes(s) ||
				(item.keywords ?? "").toLowerCase().includes(s),
		);
	}, [q]);

	const go = useCallback(
		(href: string) => {
			router.push(href);
			setOpen(false);
			setQ("");
			setCompanies([]);
		},
		[router],
	);

	const empty =
		filtered.length === 0 &&
		companies.length === 0 &&
		!companiesLoading &&
		q.trim().length >= 2;

	if (!open) return null;

	const showCompaniesHint = q.trim().length > 0 && q.trim().length < 2;

	return (
		<div
			className="fixed inset-0 z-[200] flex items-start justify-center px-4 pt-[12vh] sm:pt-[15vh]"
			role="dialog"
			aria-modal="true"
			aria-label="Buscar en el panel"
		>
			<button
				type="button"
				className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
				onClick={() => setOpen(false)}
				aria-label="Cerrar"
			/>
			<div className="relative z-[1] w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-600 dark:bg-zinc-900">
				<input
					autoFocus
					value={q}
					onChange={(e) => setQ(e.target.value)}
					placeholder="Página o empresa (2+ letras para buscar)…"
					className="w-full border-b border-zinc-200 bg-transparent px-4 py-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:border-zinc-700 dark:text-zinc-100"
				/>
				<ul className="max-h-72 overflow-y-auto py-1">
					{companiesLoading ? (
						<li className="px-4 py-2 text-xs text-zinc-500">Buscando empresas…</li>
					) : null}
					{companies.length > 0 ? (
						<>
							<li className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
								Empresas
							</li>
							{companies.map((c) => {
								const title = (c.name ?? "").trim() || "Sin nombre";
								const sub = [c.public_slug, c.subscription_status].filter(Boolean).join(" · ");
								return (
									<li key={c.id}>
										<button
											type="button"
											onClick={() => go(`/companies/${c.id}`)}
											className="flex w-full min-w-0 items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
										>
											<Building2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
											<span className="min-w-0 flex-1">
												<span className="block truncate font-medium text-zinc-900 dark:text-zinc-100">
													{title}
												</span>
												{sub ? (
													<span className="block truncate text-[11px] text-zinc-500">{sub}</span>
												) : null}
											</span>
											<span className="shrink-0 truncate font-mono text-[10px] text-zinc-400">{c.id.slice(0, 8)}…</span>
										</button>
									</li>
								);
							})}
						</>
					) : null}
					{filtered.length > 0 ? (
						<>
							<li className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
								Páginas
							</li>
							{filtered.map((item) => {
								const Icon = item.icon;
								return (
									<li key={item.href}>
										<button
											type="button"
											onClick={() => go(item.href)}
											className="flex w-full min-w-0 items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
										>
											<Icon className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden />
											<span className="min-w-0 shrink font-medium text-zinc-900 dark:text-zinc-100">
												{item.label}
											</span>
											<span className="ml-auto shrink-0 truncate text-xs text-zinc-400">{item.href}</span>
										</button>
									</li>
								);
							})}
						</>
					) : null}
					{showCompaniesHint ? (
						<li className="px-4 py-3 text-center text-xs text-zinc-500">
							Escribe al menos 2 caracteres para buscar empresas.
						</li>
					) : null}
					{empty ? (
						<li className="px-4 py-6 text-center text-sm text-zinc-500">Sin coincidencias</li>
					) : null}

				</ul>
				<p className="border-t border-zinc-100 px-4 py-2 text-[11px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
					<span className="font-mono">Ctrl+K</span> abrir / cerrar · Esc cerrar · empresas por nombre, slug o id
				</p>
			</div>
		</div>
	);
}
