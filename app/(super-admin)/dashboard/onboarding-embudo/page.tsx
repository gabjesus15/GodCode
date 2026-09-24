import { HomePeriodSelect } from "@/components/super-admin/home/home-period-select";
import { OnboardingFunnelInteractive } from "@/components/super-admin/analytics/onboarding-funnel-interactive";
import { SaasPageHeader } from "@/components/super-admin/shared/saas-page-header";
import {
  fetchOnboardingFunnelCounts,
  periodStartIso,
} from "@/lib/super-admin/super-admin-metrics";
import { parseDashboardPeriod } from "@/lib/super-admin/super-admin-dashboard-shared";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { requireSuperAdminSession } from "@/lib/super-admin/require-super-admin-session";

export const metadata = { title: "Embudo de altas" };

/** @service-role layout-guard */

export const dynamic = "force-dynamic";

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
  await requireSuperAdminSession();
  const sp = await searchParams;
  const periodRaw = Array.isArray(sp.period) ? sp.period[0] : sp.period;
  const period = parseDashboardPeriod(periodRaw);
  const fromIso = periodStartIso(period);

  const funnel = await fetchOnboardingFunnelCounts(fromIso);

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
      <SaasPageHeader
        title="Embudo de altas"
        description="Cuántos interesados pasan cada paso, desde la visita al landing hasta el pago de activación, y dónde se quedan."
        backHref="/dashboard"
        backLabel="Volver al inicio"
        action={<HomePeriodSelect current={period} />}
      />

      <p className="-mt-3 text-xs text-zinc-500 dark:text-zinc-400">
        Solicitudes desde{" "}
        <span className="tabular-nums text-zinc-700 dark:text-zinc-200">
          {fromIso ? new Date(fromIso).toLocaleDateString("es-CL") : "todo el historial"}
        </span>
      </p>

      {loadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {loadError}
        </div>
      )}

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
