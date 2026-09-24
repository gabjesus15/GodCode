import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Building2, ExternalLink } from "lucide-react";

import { BranchesCreateForm } from "@/components/super-admin/branches/branches-create-form";
import { BranchesTable } from "@/components/super-admin/branches/branches-table";
import { CompanyHealth } from "@/components/super-admin/companies/company-health";
import { CompanyEmailsSection } from "@/components/super-admin/companies/detail/company-emails-section";
import { listCompanyDeliveries } from "@/lib/email/deliveries";
import { CompanyTabs } from "@/components/super-admin/companies/company-tabs";
import { CompanyUberCredentialsForm } from "@/components/super-admin/companies/company-uber-credentials-form";
import { CompanyUserManagement } from "@/components/super-admin/companies/company-user-management";
import { CompanyBrandingSection, CompanyPanelAccessSection } from "@/components/super-admin/companies/detail/company-branding-section";
import { CompanyGeneralSection, CompanyPublicInfoSection } from "@/components/super-admin/companies/detail/company-data-sections";
import type { CompanyDetail, CompanyPayment, CompanyPlanOption } from "@/components/super-admin/companies/detail/company-detail-types";
import { CompanyEditProvider, SectionCard } from "@/components/super-admin/companies/detail/company-section";
import {
  CompanyExtendSection,
  CompanyPaymentsSection,
  CompanyPlanSection,
} from "@/components/super-admin/companies/detail/company-subscription-sections";
import { CopyFieldButton } from "@/components/super-admin/shared/copy-field-button";
import { SaasPageHeader } from "@/components/super-admin/shared/saas-page-header";
import { SaasStatusBadge } from "@/components/super-admin/shared/saas-status-badge";
import { formatUsd, remainingPaidDays, resolveSubscriptionPhase } from "@/lib/billing/portal-pricing";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { isTenantExternalDeliveryAllowed } from "@/lib/integrations/company-integration-policy";
import { parseCompanyIntegrationSettingsJson } from "@/lib/integrations/company-integration-json";
import { sanitizeBranchPaymentConfig } from "@/lib/payments/branch-payment-config";
import { resolveStorefrontThemeAssets } from "@/lib/storage/storefront-branding";
import { normalizeStoreThemeConfig } from "@/lib/store-theme/theme-config";
import { formatAdminDay } from "@/lib/super-admin/admin-format";
import { companySubscriptionStatus } from "@/lib/super-admin/status-maps";
import { requireSuperAdminSession } from "@/lib/super-admin/require-super-admin-session";
import { resolveTenantPanelLoginUrl } from "@/lib/tenant/panel-url";
import { getTenantMenuUrl } from "@/utils/tenant-url";

/** @service-role layout-guard
 *
 * La lectura del cambio de plan programado usa service role (la tabla no tiene políticas
 * para usuarios); la página ya exige super admin con `requireSuperAdminSession`.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { data: company } = await supabaseAdmin.from("companies").select("name").eq("id", id).maybeSingle();
  return { title: company?.name?.trim() || "Empresa" };
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">{label}</p>
      <div className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">{children}</div>
    </div>
  );
}

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdminSession();
  const { id } = await params;

  const [companyRes, businessRes, branchesRes, plansRes, paymentsRes, scheduleRes, deliveries] = await Promise.all([
    supabaseAdmin
      .from("companies")
      .select(
        "id,name,legal_rut,email,phone,address,public_slug,custom_domain,plan_id,subscription_status,subscription_ends_at,updated_at,theme_config,country,currency,integration_settings",
      )
      .eq("id", id)
      .maybeSingle(),
    supabaseAdmin.from("business_info").select("name,phone,address,instagram,schedule").eq("company_id", id).maybeSingle(),
    supabaseAdmin
      .from("branches")
      .select(
        "id,name,slug,address,phone,is_active,country,currency,instagram,schedule,payment_methods,pago_movil,zelle,transferencia_bancaria,stripe,mercadopago,efectivo,tarjeta,paypal,company_id,delivery_settings",
      )
      .eq("company_id", id)
      .order("created_at", { ascending: false }),
    supabaseAdmin.from("plans").select("id,name,price,max_branches,features,is_active,is_public").order("price", { ascending: true }),
    supabaseAdmin
      .from("payments_history")
      .select("id,amount_paid,payment_method,status,payment_date,payment_reference,months_paid,plan_id,reference_file_url")
      .eq("company_id", id)
      .order("payment_date", { ascending: false, nullsFirst: false })
      .limit(15),
    supabaseAdmin
      .from("company_plan_change_schedules")
      .select("effective_at,plan:plans!company_plan_change_schedules_target_plan_id_fkey(name)")
      .eq("company_id", id)
      .eq("status", "scheduled")
      .maybeSingle(),
    // null si todavía no existe la tabla del registro de correos.
    listCompanyDeliveries(id, 8),
  ]);

  const loadError = companyRes.error ?? businessRes.error ?? branchesRes.error ?? plansRes.error ?? paymentsRes.error;
  if (loadError) {
    console.error("[super-admin/companies/[id]]", loadError);
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300">
        No se pudo cargar la empresa. Recarga la página en unos segundos.
      </div>
    );
  }
  if (!companyRes.data) notFound();

  const raw = companyRes.data;
  const company = raw as unknown as CompanyDetail;
  const plans = (plansRes.data ?? []) as CompanyPlanOption[];
  const payments = (paymentsRes.data ?? []) as CompanyPayment[];
  const plan = plans.find((item) => item.id === company.plan_id) ?? null;
  const schedule = scheduleRes.data as { effective_at: string; plan?: { name?: string | null } | Array<{ name?: string | null }> | null } | null;
  const schedulePlan = Array.isArray(schedule?.plan) ? schedule?.plan[0] : schedule?.plan;
  const scheduledChange = schedule ? { targetPlanName: schedulePlan?.name ?? null, effectiveAt: schedule.effective_at } : null;

  const phase = resolveSubscriptionPhase(company.subscription_status, company.subscription_ends_at);
  const statusBadge = phase === "expired" && company.subscription_status !== "suspended"
    ? { label: "Vencida", variant: "danger" as const }
    : companySubscriptionStatus(company.subscription_status);
  const daysLeft = remainingPaidDays(company.subscription_ends_at);
  const menuUrl = company.public_slug ? getTenantMenuUrl(company.public_slug, company.custom_domain) : "";
  const panelUrl = company.public_slug ? resolveTenantPanelLoginUrl(company.public_slug) : "";

  const integ = parseCompanyIntegrationSettingsJson(raw.integration_settings);
  const resolvedAssets = await resolveStorefrontThemeAssets(normalizeStoreThemeConfig(company.theme_config, company.name ?? ""), company.id);

  return (
    <CompanyEditProvider companyId={company.id} initialUpdatedAt={company.updated_at}>
      <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
        <SaasPageHeader
          title={company.name ?? "Sin nombre"}
          description={company.custom_domain || (company.public_slug ? `/${company.public_slug}` : undefined)}
          icon={Building2}
          backHref="/companies"
          backLabel="Volver a empresas"
        />

        <section className="grid grid-cols-2 gap-4 rounded-3xl border border-zinc-200/60 bg-white p-5 shadow-sm dark:border-zinc-800/60 dark:bg-zinc-900/80 sm:grid-cols-3 lg:grid-cols-5">
          <Fact label="Estado">
            <SaasStatusBadge label={statusBadge.label} variant={statusBadge.variant} />
          </Fact>
          <Fact label="Plan">
            {plan ? (
              <>
                {plan.name}
                <span className="block text-xs font-normal text-zinc-500 dark:text-zinc-400">{formatUsd(plan.price)}/mes</span>
              </>
            ) : (
              "Sin plan"
            )}
          </Fact>
          <Fact label="Vence">
            {company.subscription_ends_at ? (
              <>
                {formatAdminDay(company.subscription_ends_at)}
                <span className={`block text-xs font-normal ${daysLeft == null ? "text-red-600 dark:text-red-400" : daysLeft <= 7 ? "text-amber-700 dark:text-amber-300" : "text-zinc-500 dark:text-zinc-400"}`}>
                  {daysLeft == null ? "Vencida" : daysLeft === 1 ? "Queda 1 día" : `Quedan ${daysLeft} días`}
                </span>
              </>
            ) : (
              "Sin vencimiento"
            )}
          </Fact>
          <Fact label="Accesos">
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {menuUrl ? (
                <a href={menuUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400">
                  Menú <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              ) : null}
              {panelUrl ? (
                <a href={panelUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400">
                  Panel <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              ) : null}
            </div>
          </Fact>
          <Fact label="ID">
            <CopyFieldButton value={company.id} label={`${company.id.slice(0, 8)}…`} />
          </Fact>
        </section>

        <CompanyTabs
          tabs={[
            {
              id: "resumen",
              label: "Resumen",
              content: (
                <div className="flex flex-col gap-6">
                  <CompanyHealth companyId={company.id} currency={company.currency} />
                  <CompanyPaymentsSection payments={payments.slice(0, 5)} plans={plans} />
                  <CompanyEmailsSection deliveries={deliveries} />
                </div>
              ),
            },
            {
              id: "datos",
              label: "Datos",
              content: (
                <div className="flex flex-col gap-6">
                  <CompanyGeneralSection company={company} />
                  <CompanyPublicInfoSection businessInfo={businessRes.data ?? null} companyName={company.name ?? ""} />
                </div>
              ),
            },
            {
              id: "suscripcion",
              label: "Suscripción",
              content: (
                <div className="flex flex-col gap-6">
                  <CompanyPlanSection company={company} plans={plans} scheduledChange={scheduledChange} />
                  <CompanyExtendSection company={company} plans={plans} />
                  <CompanyPaymentsSection payments={payments} plans={plans} />
                </div>
              ),
            },
            {
              id: "marca",
              label: "Marca",
              content: (
                <div className="flex flex-col gap-6">
                  <CompanyBrandingSection
                    company={company}
                    previewUrls={{ logoUrl: resolvedAssets.logoUrl, backgroundImageUrl: resolvedAssets.backgroundImageUrl }}
                  />
                  <CompanyPanelAccessSection company={company} plans={plans} />
                </div>
              ),
            },
            {
              id: "sucursales",
              label: "Sucursales",
              content: (
                <div className="flex min-w-0 flex-col gap-6">
                  <SectionCard title="Nueva sucursal" description="Créala y actívala; el dueño la verá en su panel.">
                    <BranchesCreateForm companyId={company.id} />
                  </SectionCard>
                  <BranchesTable branches={(branchesRes.data ?? []).map(sanitizeBranchPaymentConfig)} />
                </div>
              ),
            },
            {
              id: "usuarios",
              label: "Usuarios",
              content: (
                <SectionCard title="Usuarios y roles" description="Quién entra al panel de esta empresa y con qué permisos.">
                  <CompanyUserManagement companyId={company.id} />
                </SectionCard>
              ),
            },
            {
              id: "integraciones",
              label: "Integraciones",
              content: (
                <CompanyUberCredentialsForm
                  companyId={company.id}
                  initialClientId={integ.uber?.clientId ?? ""}
                  initialCustomerId={integ.uber?.customerId ?? ""}
                  hasClientSecret={Boolean(integ.uber?.clientSecretEncrypted)}
                  initialAllowTenantExternalDelivery={isTenantExternalDeliveryAllowed(raw.integration_settings)}
                />
              ),
            },
          ]}
        />
      </div>
    </CompanyEditProvider>
  );
}
