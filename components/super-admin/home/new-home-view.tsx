import Link from "next/link";
import { Plus } from "lucide-react";
import { Suspense } from "react";

import { fetchHomeOverview } from "@/lib/super-admin/home-overview";
import { type DashboardPeriod, DASHBOARD_PERIODS } from "@/lib/super-admin/super-admin-dashboard-shared";

import { HomeCompaniesTable } from "./home-companies-table";
import { HomeKpiCard } from "./home-kpi-card";
import { HomePeriodSelect } from "./home-period-select";

/** Contenido del Inicio (lo usan la página y el `default` de la ruta con ventana). */
export async function NewHomeView({ period, demo = false }: { period: DashboardPeriod; demo?: boolean }) {
	const periodLabel =
		period === "all" ? "en total" : `en ${DASHBOARD_PERIODS.find((p) => p.value === period)?.label.toLowerCase()}`;
	const { kpis, companies, error } = await fetchHomeOverview(period, { demo });

	return (
		<div className="min-w-0 space-y-6">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">Inicio</h1>
					<p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Empresas, bajas, solicitudes y tickets de un vistazo.</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Suspense fallback={<div className="h-8 w-72 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />}>
						<HomePeriodSelect current={period} />
					</Suspense>
					<Link
						href="/companies/new"
						className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-zinc-900 px-3 text-xs font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
					>
						<Plus className="h-3.5 w-3.5" aria-hidden />
						Nueva empresa
					</Link>
				</div>
			</div>

			{demo ? (
				<div
					className="rounded-xl border border-dashed border-indigo-300 bg-indigo-50/60 px-4 py-3 text-sm text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-100"
					role="status"
				>
					<strong className="font-semibold">Simulación.</strong> Oishi aparece pidiendo la baja y hay una solicitud de ejemplo. Nada de
					esto se guardó; quita <code className="rounded bg-white/70 px-1 dark:bg-black/30">?simular=1</code> para volver a los datos
					reales.
				</div>
			) : null}

			{error ? (
				<div
					className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"
					role="status"
				>
					Algunos datos no cargaron. Recarga la página en unos segundos.
				</div>
			) : null}

			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				{kpis.map((kpi) => (
					<HomeKpiCard key={kpi.key} kpi={kpi} periodLabel={periodLabel} />
				))}
			</div>

			<Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />}>
				<HomeCompaniesTable companies={companies} />
			</Suspense>
		</div>
	);
}
