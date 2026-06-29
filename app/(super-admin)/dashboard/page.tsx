import Link from "next/link";
import { Suspense } from "react";
import { Activity, BarChart3, LayoutDashboard, ScrollText, ShieldAlert } from "lucide-react";

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
import { Card } from "@/components/ui/card";
import { ActivityRings } from "@/components/ui/activity-rings";
import { DashboardFunnelSection } from "@/components/super-admin/dashboard/dashboard-funnel-section";
import { SaasPageHeader } from "@/components/super-admin/shared/saas-page-header";
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

  const convertedApplications = (funnel.counts.active ?? 0) + (funnel.counts.payment_validated ?? 0);
  const conversionActivePct =
    funnel.total > 0 ? Math.round((1000 * convertedApplications) / funnel.total) / 10 : 0;

  const totalRegistered = statusCo.total;
  const activeCompaniesPercentage =
    totalRegistered > 0 ? Math.round((statusCo.active / totalRegistered) * 100) : 100;
  const newCompaniesPercentage = Math.min(100, Math.round((newCo.count / 15) * 100));

  return (
    <div className="min-w-0 space-y-8">
      <SaasPageHeader
        title="Resumen operativo"
        description="MRR según planes de empresas activas. Ingresos y altas filtrados por periodo."
        icon={LayoutDashboard}
        action={
          <Suspense
            fallback={
              <div className="h-9 w-full max-w-md animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-800" />
            }
          >
            <DashboardPeriodTabs current={period} />
          </Suspense>
        }
      />

      {loadError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
          Algunos datos no cargaron: {loadError}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* KPIs grid */}
        <div className="space-y-6 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
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
                  ? `${convertedApplications} convertidas (activas + validadas) de ${funnel.total} solicitudes en el periodo.`
                  : "Sin solicitudes en base."
              }
              href="/dashboard/onboarding-embudo"
            />
            <MetricCardClient
              label="Empresas activas / suspendidas"
              value={statusCo.error ? "—" : `${statusCo.active} · ${statusCo.suspended}`}
              helper={
                statusCo.error
                  ? statusCo.error
                  : `${statusCo.active} activas de ${statusCo.total} empresas registradas.`
              }
              href="/companies"
            />
          </div>
        </div>

        {/* Activity Rings Column */}
        <div className="min-w-0 lg:col-span-1">
          <Card className="flex h-full min-w-0 flex-col justify-between overflow-visible rounded-3xl border border-zinc-200/60 bg-white p-5 dark:border-zinc-800/60 dark:bg-zinc-900/80">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Objetivos del Negocio
              </h3>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Progreso operativo y de salud general del SaaS en este periodo.
              </p>
            </div>
            <div className="my-6 min-w-0">
              <ActivityRings
                rings={[
                  {
                    label: "Altas nuevas",
                    value: `${newCo.count} / 15`,
                    percentage: newCompaniesPercentage,
                    color: "#f43f5e",
                    backgroundColor: "rgba(244, 63, 94, 0.1)",
                  },
                  {
                    label: "Salud de clientes",
                    value: `${activeCompaniesPercentage}%`,
                    percentage: activeCompaniesPercentage,
                    color: "#10b981",
                    backgroundColor: "rgba(16, 185, 129, 0.1)",
                  },
                  {
                    label: "Conversión de embudo",
                    value: `${conversionActivePct}%`,
                    percentage: conversionActivePct,
                    color: "#6366f1",
                    backgroundColor: "rgba(99, 102, 241, 0.1)",
                  },
                ]}
                size={170}
                strokeWidth={11}
                gap={5}
              />
            </div>
            <div className="border-t border-zinc-100 pt-4 text-[11px] text-zinc-400 dark:border-zinc-800">
              Metas operacionales y de conversión calculadas dinámicamente.
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/dashboard/salud-pagos" className="block">
          <Card className="flex items-center gap-3 rounded-3xl border border-zinc-200/60 bg-white px-4 py-4 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800/60 dark:bg-zinc-900/80 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/60">
            <ShieldAlert className="h-5 w-5 shrink-0 text-indigo-500" />
            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              Salud de pagos
            </span>
          </Card>
        </Link>
        <Link href="/dashboard/onboarding-embudo" className="block">
          <Card className="flex items-center gap-3 rounded-3xl border border-zinc-200/60 bg-white px-4 py-4 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800/60 dark:bg-zinc-900/80 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/60">
            <Activity className="h-5 w-5 shrink-0 text-emerald-500" />
            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              Embudo onboarding
            </span>
          </Card>
        </Link>
        <Link href="/dashboard/analytics-global" className="block">
          <Card className="flex items-center gap-3 rounded-3xl border border-zinc-200/60 bg-white px-4 py-4 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800/60 dark:bg-zinc-900/80 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/60">
            <BarChart3 className="h-5 w-5 shrink-0 text-blue-500" />
            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              Analytics global
            </span>
          </Card>
        </Link>
        <Link href="/dashboard/auditoria" className="block">
          <Card className="flex items-center gap-3 rounded-3xl border border-zinc-200/60 bg-white px-4 py-4 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800/60 dark:bg-zinc-900/80 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/60">
            <ScrollText className="h-5 w-5 shrink-0 text-rose-500" />
            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              Auditoría admin
            </span>
          </Card>
        </Link>
      </div>

      <DashboardFunnelSection counts={funnel.counts} />
    </div>
  );
}
