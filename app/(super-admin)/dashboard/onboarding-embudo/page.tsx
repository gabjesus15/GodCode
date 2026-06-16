import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { DashboardPeriodTabs } from "../../../../components/super-admin/analytics/dashboard-period-tabs";
import { OnboardingFunnelInteractive } from "@/components/super-admin/analytics/onboarding-funnel-interactive";
import {
  DASHBOARD_PERIODS,
  type DashboardPeriod,
  fetchOnboardingFunnelCounts,
  periodStartIso,
} from "@/lib/super-admin/super-admin-metrics";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";

export const dynamic = "force-dynamic";

function parsePeriod(raw: string | undefined): DashboardPeriod {
  const allowed = new Set(DASHBOARD_PERIODS.map((p) => p.value));
  if (raw && allowed.has(raw as DashboardPeriod)) return raw as DashboardPeriod;
  return "30";
}

type OnboardingApp = {
  id: string;
  business_name: string | null;
  responsible_name: string | null;
  email: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export default async function OnboardingEmbudoPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string | string[] }>;
}) {
  const sp = await searchParams;
  const periodRaw = Array.isArray(sp.period) ? sp.period[0] : sp.period;
  const period = parsePeriod(periodRaw);
  const fromIso = periodStartIso(period);

  const funnel = await fetchOnboardingFunnelCounts(fromIso);

  // Fetch recent applications in the selected period to show the stuck CRM leads list
  let appsQuery = supabaseAdmin
    .from("onboarding_applications")
    .select("id, business_name, responsible_name, email, status, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(300);

  if (fromIso) {
    appsQuery = appsQuery.gte("created_at", fromIso);
  }

  const { data: appsData, error: appsError } = await appsQuery;
  const recentApps = (appsData ?? []) as OnboardingApp[];

  const loadError = funnel.error || appsError?.message || null;

  return (
    <div className="min-w-0 space-y-6">
      {/* Header section */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver al dashboard
        </Link>
        <h2 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">Embudo de onboarding</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Analiza el porcentaje de conversión y fuga de tus prospectos desde que visitan la página de inicio hasta que completan su pago de activación.
        </p>
      </div>

      {/* Filter panel */}
      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/80 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <DashboardPeriodTabs current={period} />
          <div className="text-xs text-zinc-500 font-semibold dark:text-zinc-400">
            Filtrando solicitudes desde: <span className="text-zinc-800 dark:text-zinc-200 tabular-nums">{fromIso ? new Date(fromIso).toLocaleDateString("es-CL") : "Todo el historial"}</span>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {loadError}
        </div>
      )}

      {/* Interactive pipeline funnel and stuck leads management CRM */}
      <OnboardingFunnelInteractive
        counts={funnel.counts}
        total={funnel.total}
        onboardingViews={funnel.onboardingViews}
        onboardingVisitors={funnel.onboardingVisitors}
        recentApplications={recentApps}
        period={period}
      />
    </div>
  );
}
