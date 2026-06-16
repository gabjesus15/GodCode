import Link from "next/link";
import { Suspense } from "react";
import { Activity, BarChart3, ScrollText, ShieldAlert } from "lucide-react";

import { DashboardPeriodTabs } from "../../../components/super-admin/analytics/dashboard-period-tabs";
import {
	type DashboardPeriod,
	DASHBOARD_PERIODS,
	fetchCompanyStatusCounts,
	fetchMrrFromPlans,
	fetchNewCompaniesInPeriod,
	fetchOnboardingFunnelCounts,
	fetchOpenTicketsCount,
	fetchRevenueInPeriod,
	periodStartIso,
} from "@/lib/super-admin/super-admin-metrics";
import { MetricCardClient } from "./MetricCardClient";

export const dynamic = "force-dynamic";

function parsePeriod(raw: string | undefined): DashboardPeriod {
	const allowed = new Set(DASHBOARD_PERIODS.map((p) => p.value));
	if (raw && allowed.has(raw as DashboardPeriod)) return raw as DashboardPeriod;
	return "30";
}

function fmtUsd(n: number): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 0,
	}).format(Math.round(n));
}

const FUNNEL_LABELS: Record<string, string> = {
	pending_verification: "Pend. verificación",
	email_verified: "Email verificado",
	form_completed: "Formulario listo",
	payment_pending: "Pago pendiente",
	active: "Activo",
	rejected: "Rechazado",
};

export default async function DashboardPage({
	searchParams,
}: {
	searchParams: Promise<{ period?: string | string[] }>;
}) {
	const sp = await searchParams;
	const periodRaw = Array.isArray(sp.period) ? sp.period[0] : sp.period;
	const period = parsePeriod(periodRaw);
	const fromIso = periodStartIso(period);

	const [mrrRes, revRes, newCo, funnel, tickets, statusCo] = await Promise.all([
		fetchMrrFromPlans(),
		fetchRevenueInPeriod(fromIso),
		fetchNewCompaniesInPeriod(fromIso),
		fetchOnboardingFunnelCounts(fromIso),
		fetchOpenTicketsCount(),
		fetchCompanyStatusCounts(),
	]);

	const loadError =
		mrrRes.error ||
		revRes.error ||
		newCo.error ||
		funnel.error ||
		tickets.error ||
		statusCo.error ||
		null;

	const conversionActivePct =
		funnel.total > 0 ? Math.round((1000 * (funnel.counts.active ?? 0)) / funnel.total) / 10 : 0;

	return (
		<div className="min-w-0 space-y-8">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Resumen operativo</h2>
					<p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
						MRR según planes de empresas activas. Ingresos y altas filtrados por periodo.
					</p>
				</div>
				<Suspense fallback={<div className="h-9 w-full max-w-md animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-800" />}>
					<DashboardPeriodTabs current={period} />
				</Suspense>
			</div>

			{loadError ? (
				<div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
					Algunos datos no cargaron: {loadError}
				</div>
			) : null}

			<div className="grid min-w-0 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
				<MetricCardClient
					label="MRR estimado (planes)"
					value={mrrRes.error ? "—" : fmtUsd(mrrRes.mrr)}
					helper={
						mrrRes.error
							? mrrRes.error
							: `${mrrRes.activeWithPlan} empresas activas con plan asignado. Sin add-ons recurrentes.`
					}
					href="/plans"
				/>
				<MetricCardClient
					label={`Ingresos cobrados (${DASHBOARD_PERIODS.find((p) => p.value === period)?.label ?? period})`}
					value={revRes.error ? "—" : fmtUsd(revRes.total)}
					helper={
						revRes.error
							? revRes.error
							: `${revRes.count} pagos con estado pagado/aprobado en el periodo.`
					}
					href="/dashboard/salud-pagos"
				/>
				<MetricCardClient
					label="Empresas nuevas (periodo)"
					value={newCo.error ? "—" : `${newCo.count}`}
					helper={newCo.error ? newCo.error : "Altas registradas en companies.created_at."}
					href="/companies"
				/>
				<MetricCardClient
					label="Tickets sin resolver"
					value={tickets.error ? "—" : `${tickets.count}`}
					helper={tickets.error ? tickets.error : "resolved_at vacío en saas_tickets."}
					href="/tickets"
				/>
				<MetricCardClient
					label="Conversión a activo (embudo)"
					value={`${conversionActivePct}%`}
					helper={
						funnel.total > 0
							? `${funnel.counts.active ?? 0} activos de ${funnel.total} solicitudes totales.`
							: "Sin solicitudes en base."
					}
					href="/dashboard/onboarding-embudo"
				/>
				<MetricCardClient
					label="Empresas activas / suspendidas"
					value={
						statusCo.error
							? "—"
							: `${statusCo.active} · ${statusCo.suspended}`
					}
					helper={
						statusCo.error
							? statusCo.error
							: "Totales por subscription_status en companies."
					}
					href="/companies"
				/>
			</div>

			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<Link
					href="/dashboard/salud-pagos"
					className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white/90 px-4 py-4 text-sm font-semibold text-zinc-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/60 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-200 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/30"
				>
					<ShieldAlert className="h-4.5 w-4.5 shrink-0 text-indigo-500" />
					Salud de pagos
				</Link>
				<Link
					href="/dashboard/onboarding-embudo"
					className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white/90 px-4 py-4 text-sm font-semibold text-zinc-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/60 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-200 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/30"
				>
					<Activity className="h-4.5 w-4.5 shrink-0 text-indigo-500" />
					Embudo onboarding
				</Link>
				<Link
					href="/dashboard/analytics-global"
					className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white/90 px-4 py-4 text-sm font-semibold text-zinc-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/60 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-200 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/30"
				>
					<BarChart3 className="h-4.5 w-4.5 shrink-0 text-indigo-500" />
					Analytics global
				</Link>
				<Link
					href="/dashboard/auditoria"
					className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white/90 px-4 py-4 text-sm font-semibold text-zinc-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/60 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-200 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/30"
				>
					<ScrollText className="h-4.5 w-4.5 shrink-0 text-indigo-500" />
					Auditoría admin
				</Link>
			</div>

			<div className="rounded-2xl border border-zinc-200 bg-white/80 p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
				<h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Embudo (todas las solicitudes)</h3>
				<p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
					Conteo por estado en onboarding_applications — útil para ver cuellos de botella.
				</p>
				<ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
					{Object.entries(funnel.counts).map(([key, count]) => (
						<li
							key={key}
							className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800/50"
						>
							<span className="text-zinc-600 dark:text-zinc-300">{FUNNEL_LABELS[key] ?? key}</span>
							<span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{count}</span>
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}
