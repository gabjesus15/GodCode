import { unstable_cache } from "next/cache";

import { CustomerAccountClient } from "./CustomerAccountClient";
import { requireCustomerPortalSession } from "@/lib/tenant/customer-portal-session";
import { getCurrentLocale } from "@/lib/i18n/server";
import { resolvePlanName } from "@/lib/plans/plan-i18n";
import { resolveAddonOfferForPlan } from "@/lib/plans/plan-offer-rules";
import { resolveRegionalPlanPrice } from "@/lib/plans/plan-regional-pricing";
import { BranchSummary, BusinessInfoSummary, type PortalTab } from "@/components/customer-portal/shared/customer-account-types";
import { PORTAL_TAB_ORDER } from "@/components/customer-portal/shared/customer-account-constants";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { sanitizeBranchPaymentConfig } from "@/lib/payments/branch-payment-config";
import { resolveTenantPanelLoginUrl } from "@/lib/tenant/panel-url";
import { buildBillingOptionsResponse, getCustomerAccountBillingContext } from "@/lib/tenant/customer-account-billing";
import { getCountryConfig } from "@/lib/geo/country-registry";
import { LANDING_SUPPORT_EMAIL } from "@/lib/landing/brand";

/** @service-role tenant-session
 *
 * getCustomerMembership fija el company_id; los catálogos cacheados son públicos.
 */

const getCachedActivePlans = unstable_cache(
  async () => {
    const { data } = await supabaseAdmin
      .from("plans")
      .select("id,name,name_i18n,price,prices_by_continent,max_branches,max_users,features,marketing_lines")
      .eq("is_active", true)
      // Los planes internos (dev, promos) no se ofrecen al dueño; su plan actual se
      // muestra igual desde la ficha de la empresa.
      .eq("is_public", true)
      .order("price", { ascending: true });
    return data ?? [];
  },
  ["customer-account-plans-catalog-public"],
  { revalidate: 600 },
);

const getCachedActiveAddons = unstable_cache(
  async () => {
    const { data } = await supabaseAdmin
      .from("addons")
      .select("id,slug,name,description,type,price_monthly,price_one_time")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    return data ?? [];
  },
  ["customer-account-addons-catalog"],
  { revalidate: 600 },
);

type TicketRow = {
  id: string;
  subject: string;
  description: string;
  category: "general" | "billing" | "technical" | "product" | "account";
  priority: "low" | "medium" | "high" | "critical";
  status: "open" | "in_progress" | "waiting_customer" | "resolved" | "closed";
  created_at: string;
  updated_at: string;
  last_message_at: string;
};

type BranchEntitlementRow = {
  id: string;
  quantity: number;
  months_purchased: number;
  amount_paid: number;
  unit_price: number;
  status: string;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
  payment:
    | {
        payment_reference?: string | null;
      }
    | Array<{
        payment_reference?: string | null;
      }>
    | null;
};

function resolveTenantAdminUrl(publicSlug: string | null): string | null {
  if (!publicSlug) return null;
  return resolveTenantPanelLoginUrl(publicSlug);
}

export const dynamic = "force-dynamic";

/** `/cuenta?tab=plan`: los correos llevan directo a la sección que corresponde. */
function parseInitialTab(raw: string | string[] | undefined): PortalTab | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return PORTAL_TAB_ORDER.find((tab) => tab === value);
}

export default async function CustomerAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const initialTab = parseInitialTab((await searchParams)?.tab);
  const locale = await getCurrentLocale();
  const { membership } = await requireCustomerPortalSession();
  const companyId = membership.companyId;
  const initialSyncedAt = new Date().toISOString();

  const [plans, addons, billingCtx] = await Promise.all([
    getCachedActivePlans(),
    getCachedActiveAddons(),
    getCustomerAccountBillingContext(companyId),
  ]);

  const [{ data: company }, { data: branches }, { data: businessInfoRaw }, { data: payments }, { data: companyAddons }, { data: tickets }, { data: branchEntitlements }, { data: schedule }] = await Promise.all([
    supabaseAdmin
      .from("companies")
      .select("id,name,public_slug,custom_domain,country,subscription_status,subscription_ends_at,plan_id,plan:plans(id,name,name_i18n,price,prices_by_continent,max_branches,max_users,features)")
      .eq("id", companyId)
      .maybeSingle(),
    supabaseAdmin
      .from("branches")
      .select(
        "id,name,address,is_active,phone,schedule,instagram_url,whatsapp_url,map_url,origin_lat,origin_lng,payment_methods,pago_movil,zelle,transferencia_bancaria,stripe,mercadopago,paypal,order_intake_paused,order_intake_pause_message,order_intake_paused_at,order_intake_paused_by",
      )
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("business_info")
      .select("name,phone,address,instagram,schedule")
      .eq("company_id", companyId)
      .maybeSingle(),
    supabaseAdmin
      .from("payments_history")
      .select("id,amount_paid,status,payment_date,payment_method,payment_method_slug,plan_id,months_paid,payment_reference,reference_file_url")
      .eq("company_id", companyId)
      .order("payment_date", { ascending: false, nullsFirst: false })
      .limit(50),
    supabaseAdmin
      .from("company_addons")
      .select("id,addon_id,status,expires_at,addon:addons(id,name,slug,type)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("saas_tickets")
      .select("id,subject,description,category,priority,status,created_at,updated_at,last_message_at")
      .eq("company_id", companyId)
      // Los tickets "system" son registros para el equipo (bajas, cobros a revisar).
      .or("source.is.null,source.neq.system")
      .order("last_message_at", { ascending: false })
      .limit(50),
    supabaseAdmin
      .from("company_branch_extra_entitlements")
      .select("id,quantity,months_purchased,amount_paid,unit_price,status,starts_at,expires_at,created_at,payment:payments_history(payment_reference)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabaseAdmin
      .from("company_plan_change_schedules")
      .select("target_plan_id,effective_at,plan:plans!company_plan_change_schedules_target_plan_id_fkey(name,name_i18n)")
      .eq("company_id", companyId)
      .eq("status", "scheduled")
      .maybeSingle(),
  ]);

  const supportEmail = LANDING_SUPPORT_EMAIL;
  const rawCountry = (company as { country?: string | null } | null)?.country ?? null;
  const countryConfig = getCountryConfig(rawCountry);

  // Los montos del SaaS son en USD y con el precio de la región del negocio (el del alta).
  const regionalPrice = (plan: { price?: number | null; prices_by_continent?: unknown } | null | undefined) =>
    plan
      ? resolveRegionalPlanPrice(
          {
            price: plan.price ?? null,
            prices_by_continent: (plan.prices_by_continent ?? null) as Record<string, { price: number; currency: string }> | null,
          },
          rawCountry,
        ).price
      : null;
  const scheduleRow = schedule as
    | { target_plan_id: string; effective_at: string; plan?: { name?: string | null; name_i18n?: unknown } | Array<{ name?: string | null; name_i18n?: unknown }> | null }
    | null;
  const schedulePlan = Array.isArray(scheduleRow?.plan) ? scheduleRow?.plan[0] : scheduleRow?.plan;

  const snapshot = {
    id: String(company?.id ?? companyId),
    name: String(company?.name ?? "Mi cuenta"),
    publicSlug: (company?.public_slug as string | null) ?? null,
    customDomain: (company?.custom_domain as string | null) ?? null,
    planId: ((company as { plan_id?: string | null } | null)?.plan_id ?? null) as string | null,
    subscriptionStatus: (company?.subscription_status as string | null) ?? null,
    subscriptionEndsAt: (company?.subscription_ends_at as string | null) ?? null,
    planName: resolvePlanName({
      locale,
      name: ((company?.plan as { name?: string | null } | null)?.name ?? null) as string | null,
      nameI18n: (company?.plan as { name_i18n?: unknown } | null)?.name_i18n,
    }),
    planPrice: regionalPrice(company?.plan as { price?: number | null; prices_by_continent?: unknown } | null),
    planMaxBranches: ((company?.plan as { max_branches?: number | null } | null)?.max_branches ?? null) as number | null,
    planMaxUsers: ((company?.plan as { max_users?: number | null } | null)?.max_users ?? null) as number | null,
    supportEmail,
    tenantAdminUrl: resolveTenantAdminUrl((company?.public_slug as string | null) ?? null),
    country: rawCountry,
    currency: countryConfig?.currency ?? "USD",
    locale: countryConfig?.locale ?? "es-CL",
    timezone: countryConfig?.timezone ?? "America/Santiago",
    scheduledPlanChange: scheduleRow
      ? {
          targetPlanId: scheduleRow.target_plan_id,
          targetPlanName: schedulePlan?.name
            ? resolvePlanName({ locale, name: schedulePlan.name, nameI18n: schedulePlan.name_i18n })
            : null,
          effectiveAt: scheduleRow.effective_at,
        }
      : null,
  };

  const activeAddons = (companyAddons ?? []).map((row) => {
    const addonValue = (row as {
      addon?:
        | { id?: string | null; name?: string | null; slug?: string | null; type?: string | null }
        | Array<{ id?: string | null; name?: string | null; slug?: string | null; type?: string | null }>;
    }).addon;
    const addonResolved = Array.isArray(addonValue) ? addonValue[0] : addonValue;
    const addonName = String(addonResolved?.name ?? "Addon");

    return {
      id: String((row as { id: string }).id),
      addonId: String((row as { addon_id?: string | null }).addon_id ?? addonResolved?.id ?? ""),
      addonSlug: String(addonResolved?.slug ?? ""),
      addonType: String(addonResolved?.type ?? ""),
      status: String((row as { status?: string | null }).status ?? "active"),
      expires_at: ((row as { expires_at?: string | null }).expires_at ?? null) as string | null,
      addonName,
    };
  });

  const initialTickets = ((tickets ?? []) as TicketRow[]).map((row) => ({
    id: row.id,
    subject: row.subject,
    description: row.description,
    category: row.category,
    priority: row.priority,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastMessageAt: row.last_message_at,
  }));

  const initialBranchEntitlements = ((branchEntitlements ?? []) as BranchEntitlementRow[]).map((row) => {
    const paymentRef = Array.isArray(row.payment)
      ? row.payment[0]?.payment_reference ?? null
      : row.payment?.payment_reference ?? null;

    return {
      id: row.id,
      quantity: Number(row.quantity ?? 0) || 0,
      monthsPurchased: Number(row.months_purchased ?? 0) || 0,
      amountPaid: Number(row.amount_paid ?? 0) || 0,
      unitPrice: Number(row.unit_price ?? 0) || 0,
      status: String(row.status ?? "pending"),
      startsAt: row.starts_at,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      paymentReference: paymentRef,
    };
  });

  const companyPlanRow = (company?.plan as {
    id?: string;
    name?: string;
    features?: unknown;
    max_branches?: number | null;
    max_users?: number | null;
  } | null) ?? null;
  const planOfferSnapshot = companyPlanRow
    ? {
        id: snapshot.planId ?? companyPlanRow.id ?? "",
        name: companyPlanRow.name ?? snapshot.planName ?? "",
        features: companyPlanRow.features,
        max_branches: companyPlanRow.max_branches ?? snapshot.planMaxBranches,
        max_users: companyPlanRow.max_users ?? snapshot.planMaxUsers,
      }
    : null;

  const filteredAddons = ((addons ?? []) as Array<{ id: string; slug: string | null; name: string; description: string | null; type: string | null; price_monthly: number | null; price_one_time: number | null }>).filter((addon) => {
    const decision = resolveAddonOfferForPlan(planOfferSnapshot, {
      id: addon.id,
      slug: addon.slug,
      name: addon.name,
      type: addon.type,
    });
    return decision.status !== "blocked";
  });

  const initialBillingOptions = billingCtx ? buildBillingOptionsResponse(companyId, billingCtx) : null;

  const businessInfo: BusinessInfoSummary | null = businessInfoRaw
    ? {
        name: (businessInfoRaw as { name?: string | null }).name ?? null,
        phone: (businessInfoRaw as { phone?: string | null }).phone ?? null,
        address: (businessInfoRaw as { address?: string | null }).address ?? null,
        instagram: (businessInfoRaw as { instagram?: string | null }).instagram ?? null,
        schedule: (businessInfoRaw as { schedule?: string | null }).schedule ?? null,
      }
    : null;

  return (
    <CustomerAccountClient
        initialTab={initialTab}
        company={snapshot}
        branches={((branches ?? []) as BranchSummary[]).map(sanitizeBranchPaymentConfig)}
        businessInfo={businessInfo}
        payments={
          ((payments ?? []) as Array<{
            id: string;
            amount_paid: number | null;
            status: string | null;
            payment_date: string | null;
            payment_method: string | null;
            payment_method_slug: string | null;
            plan_id: string | null;
            months_paid: number | null;
            payment_reference: string | null;
            reference_file_url: string | null;
          }>)
        }
        activeAddons={activeAddons}
        availablePlans={
          ((plans ?? []) as Array<{ id: string; name: string; name_i18n?: unknown; price: number | null; prices_by_continent?: unknown; max_branches: number | null; max_users: number | null; features?: unknown; marketing_lines?: unknown }>).map((plan) => ({
            id: plan.id,
            name: resolvePlanName({ locale, name: plan.name, nameI18n: plan.name_i18n }),
            price: regionalPrice(plan),
            max_branches: plan.max_branches,
            max_users: plan.max_users,
            features: plan.features,
            marketing_lines: plan.marketing_lines,
          }))
        }
        availableAddons={filteredAddons}
        initialTickets={initialTickets}
        initialBranchEntitlements={initialBranchEntitlements}
        initialBillingOptions={initialBillingOptions}
        initialSyncedAt={initialSyncedAt}
      />
  );
}
