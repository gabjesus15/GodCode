import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";

import { CustomerAccountClient } from "./CustomerAccountClient";
import { getCustomerMembership } from "@/lib/super-admin/account-access";
import { getCurrentLocale } from "@/lib/i18n/server";
import { resolvePlanName } from "@/lib/plans/plan-i18n";
import { resolveAddonOfferForPlan } from "@/lib/plans/plan-offer-rules";
import { BranchSummary } from "@/components/customer-portal/shared/customer-account-types";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { resolveTenantPanelLoginUrl } from "@/lib/tenant/panel-url";
import { buildBillingOptionsResponse, getCustomerAccountBillingContext } from "@/lib/tenant/customer-account-billing";
import { createSupabaseServerClient } from "../../../utils/supabase/server";
import { getCountryConfig } from "@/lib/geo/country-registry";
import { LANDING_SUPPORT_EMAIL } from "@/lib/landing/brand";

const getCachedActivePlans = unstable_cache(
  async () => {
    const { data } = await supabaseAdmin
      .from("plans")
      .select("id,name,name_i18n,price,max_branches,max_users,features,marketing_lines")
      .eq("is_active", true)
      .order("price", { ascending: true });
    return data ?? [];
  },
  ["customer-account-plans-catalog"],
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

export default async function CustomerAccountPage() {
  const locale = await getCurrentLocale();
  const supabase = await createSupabaseServerClient("super-admin");
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    redirect("/login");
  }

  const membership = await getCustomerMembership({ authUserId: user.id, email: user.email });
  if (!membership || membership.role !== "ceo") {
    redirect("/login?error=no-access");
  }

  const companyId = membership.companyId;
  const initialSyncedAt = new Date().toISOString();

  const [plans, addons, billingCtx] = await Promise.all([
    getCachedActivePlans(),
    getCachedActiveAddons(),
    getCustomerAccountBillingContext(companyId),
  ]);

  const [{ data: company }, { data: branches }, { data: payments }, { data: companyAddons }, { data: tickets }, { data: branchEntitlements }] = await Promise.all([
    supabaseAdmin
      .from("companies")
      .select("id,name,public_slug,custom_domain,country,subscription_status,subscription_ends_at,plan_id,plan:plans(id,name,name_i18n,price,max_branches,max_users,features)")
      .eq("id", companyId)
      .maybeSingle(),
    supabaseAdmin
      .from("branches")
      .select("id,name,address,is_active")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("payments_history")
      .select("id,amount_paid,status,payment_date,payment_method,months_paid,payment_reference,reference_file_url")
      .eq("company_id", companyId)
      .order("payment_date", { ascending: false })
      .limit(20),
    supabaseAdmin
      .from("company_addons")
      .select("id,addon_id,status,expires_at,addon:addons(id,name,slug,type)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("saas_tickets")
      .select("id,subject,description,category,priority,status,created_at,updated_at,last_message_at")
      .eq("company_id", companyId)
      .order("last_message_at", { ascending: false })
      .limit(50),
    supabaseAdmin
      .from("company_branch_extra_entitlements")
      .select("id,quantity,months_purchased,amount_paid,unit_price,status,starts_at,expires_at,created_at,payment:payments_history(payment_reference)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const supportEmail = LANDING_SUPPORT_EMAIL;
  const rawCountry = (company as { country?: string | null } | null)?.country ?? null;
  const countryConfig = getCountryConfig(rawCountry);

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
    planPrice: ((company?.plan as { price?: number | null } | null)?.price ?? null) as number | null,
    planMaxBranches: ((company?.plan as { max_branches?: number | null } | null)?.max_branches ?? null) as number | null,
    planMaxUsers: ((company?.plan as { max_users?: number | null } | null)?.max_users ?? null) as number | null,
    supportEmail,
    tenantAdminUrl: resolveTenantAdminUrl((company?.public_slug as string | null) ?? null),
    country: rawCountry,
    currency: countryConfig?.currency ?? "USD",
    locale: countryConfig?.locale ?? "es-CL",
    timezone: countryConfig?.timezone ?? "America/Santiago",
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

  return (
    <CustomerAccountClient
        company={snapshot}
        branches={(branches ?? []) as BranchSummary[]}
        payments={
          ((payments ?? []) as Array<{
            id: string;
            amount_paid: number | null;
            status: string | null;
            payment_date: string | null;
            payment_method: string | null;
            months_paid: number | null;
            payment_reference: string | null;
            reference_file_url: string | null;
          }>)
        }
        activeAddons={activeAddons}
        availablePlans={
          ((plans ?? []) as Array<{ id: string; name: string; name_i18n?: unknown; price: number | null; max_branches: number | null; max_users: number | null; features?: unknown; marketing_lines?: unknown }>).map((plan) => ({
            id: plan.id,
            name: resolvePlanName({ locale, name: plan.name, nameI18n: plan.name_i18n }),
            price: plan.price,
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
