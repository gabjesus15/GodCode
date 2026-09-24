import { CompaniesView, type CompanyListRow } from "@/components/super-admin/companies/companies-view";
import { formatUsd, remainingPaidDays, resolveSubscriptionPhase } from "@/lib/billing/portal-pricing";
import { companySubscriptionStatus } from "@/lib/super-admin/status-maps";
import { requireSuperAdminSession } from "@/lib/super-admin/require-super-admin-session";
import { getEffectiveCustomDomain } from "@/lib/tenant/tenant-effective-custom-domain";
import { getTenantHost, getTenantUrl } from "@/utils/tenant-url";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export const metadata = { title: "Empresas" };

export const dynamic = "force-dynamic";

type PlanInfo = { name: string | null; price: number | null; max_branches: number | null };

type CompanyQueryRow = {
  id: string;
  name: string | null;
  email: string | null;
  public_slug: string | null;
  custom_domain: string | null;
  subscription_status: string | null;
  subscription_ends_at: string | null;
  plans: PlanInfo | PlanInfo[] | null;
};

/**
 * Todo lo que depende del reloj o del dominio se calcula aquí, en el servidor: si lo hacía
 * el navegador (window.location, Date.now) el HTML no coincidía y React fallaba al hidratar.
 */
function toListRow(company: CompanyQueryRow): CompanyListRow {
  const plan = Array.isArray(company.plans) ? company.plans[0] : company.plans;
  const phase = resolveSubscriptionPhase(company.subscription_status, company.subscription_ends_at);
  const status =
    phase === "expired" && company.subscription_status !== "suspended"
      ? { label: "Vencida", variant: "danger" as const }
      : companySubscriptionStatus(company.subscription_status);
  const days = remainingPaidDays(company.subscription_ends_at);
  const expiry = !company.subscription_ends_at
    ? null
    : days == null
      ? null
      : days <= 7
        ? { label: days === 1 ? "Vence mañana" : `Vence en ${days} días`, variant: "warning" as const }
        : { label: `Vence en ${days} días`, variant: "neutral" as const };
  const customDomain = getEffectiveCustomDomain(company.custom_domain, company.subscription_ends_at, company.subscription_status);
  const maxBranches = plan?.max_branches;

  return {
    id: company.id,
    name: company.name ?? "Sin nombre",
    email: company.email,
    publicSlug: company.public_slug,
    subscriptionStatus: company.subscription_status,
    host: company.public_slug ? getTenantHost(company.public_slug, customDomain) : "",
    url: company.public_slug ? getTenantUrl(company.public_slug, customDomain) : "",
    status,
    expiry,
    planName: plan?.name ?? null,
    planDetail: plan
      ? `${formatUsd(plan.price)}/mes · ${maxBranches == null || maxBranches >= 999 ? "Sucursales ilimitadas" : `${maxBranches} ${maxBranches === 1 ? "sucursal" : "sucursales"}`}`
      : null,
  };
}

export default async function CompaniesPage() {
  await requireSuperAdminSession();
  try {
    const supabase = await createSupabaseServerClient();
    const { data: companies, error } = await supabase
      .from("companies")
      .select("id,name,email,public_slug,custom_domain,subscription_status,subscription_ends_at,plans(name,price,max_branches)")
      .order("name", { ascending: true });

    if (error) throw error;

    return <CompaniesView companies={((companies ?? []) as CompanyQueryRow[]).map(toListRow)} />;
  } catch (err) {
    console.error("[super-admin/companies]", err);
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300">
        No se pudo cargar el listado de empresas. Recarga la página en unos segundos.
      </div>
    );
  }
}
