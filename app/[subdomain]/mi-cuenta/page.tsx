import { notFound } from "next/navigation";

import { getCachedCompany } from "../../../utils/tenant-cache";
import { isTenantSubscriptionAccessible } from "@/lib/plans/tenant-subscription";
import { resolveCheckoutCountryCode } from "@/lib/geo/country-forms";
import { createSupabasePublicServerClient } from "@/utils/supabase/server";
import { getMenuAccountSession, toMenuAccountDto } from "@/lib/menu-account/session";
import { AccountPageClient } from "../../../components/tenant/account/account-page-client";

import "../styles/Account.css";

// El layout de tenant declara `revalidate = 60`; sin esto se serviría HTML cacheado
// con el estado de sesión de otra persona.
export const dynamic = "force-dynamic";

interface TenantAccountPageProps {
  params: Promise<{ subdomain: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

interface TenantAccountThemeConfig {
  displayName?: string;
}

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function TenantAccountPage({
  params,
  searchParams,
}: TenantAccountPageProps) {
  const [resolvedParams, resolvedSearch] = await Promise.all([params, searchParams]);
  const company = await getCachedCompany(resolvedParams.subdomain);

  if (!company || !isTenantSubscriptionAccessible(company)) {
    notFound();
  }

  const companyId = String(company.id);

  // Gate de sesión: filtra por company, así que una sesión de otro negocio (posible
  // en dominio principal, donde la cookie es compartida) se trata como no logueada.
  const session = await getMenuAccountSession(companyId);

  const supabase = createSupabasePublicServerClient();
  const { data: branchRows } = await supabase
    .from("branches")
    .select("id, name")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("name");

  const theme = (company.theme_config as unknown as TenantAccountThemeConfig) ?? {};
  const businessName = theme.displayName || company.name || resolvedParams.subdomain;

  const noticeParam = firstParam(resolvedSearch.linked)
    ? "linked"
    : firstParam(resolvedSearch.reset)
      ? "reset"
      : null;

  return (
    <AccountPageClient
      businessName={businessName}
      companySlug={company.public_slug ?? resolvedParams.subdomain}
      countryCode={resolveCheckoutCountryCode({ businessCountry: company.country })}
      branches={(branchRows ?? []).map((branch) => ({
        id: String(branch.id),
        name: branch.name,
      }))}
      account={session ? toMenuAccountDto(session.account) : null}
      notice={noticeParam}
      errorCode={firstParam(resolvedSearch.error)}
    />
  );
}
