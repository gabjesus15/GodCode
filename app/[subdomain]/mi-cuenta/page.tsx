import { notFound } from "next/navigation";

import { getCachedCompany } from "../../../utils/tenant-cache";
import { isTenantSubscriptionAccessible } from "@/lib/plans/tenant-subscription";
import { resolveCheckoutCountryCode } from "@/lib/geo/country-forms";
import { createSupabasePublicServerClient } from "@/utils/supabase/server";
import { MENU_ACCOUNT_ENABLED } from "@/lib/menu-account/feature";
import { getMenuAccountSession, toMenuAccountDto } from "@/lib/menu-account/session";
import { resolveMenuAccountDeliveryOptions } from "@/lib/menu-account/delivery-options";
import { normalizeStoreThemeConfig } from "@/lib/store-theme/theme-config";
import { resolveStorefrontThemeAssets } from "@/lib/storage/storefront-branding";
import { parseThemeLogoUrl } from "@/lib/tenant/tenant-favicon-utils";
import { AccountPageClient } from "../../../components/tenant/account/account-page-client";

import "../styles/Account.css";

// El layout de tenant declara `revalidate = 60`; sin esto se serviría HTML cacheado
// con el estado de sesión de otra persona.
export const dynamic = "force-dynamic";

interface TenantAccountPageProps {
  params: Promise<{ subdomain: string }>;
}

export default async function TenantAccountPage({
  params,
}: TenantAccountPageProps) {
  // La cuenta de cliente del menú aún no está terminada: mientras el flag esté
  // apagado la ruta no existe. Ocultar sólo los botones dejaría el registro
  // alcanzable escribiendo la URL a mano.
  if (!MENU_ACCOUNT_ENABLED) {
    notFound();
  }

  const resolvedParams = await params;
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
    .select("id, name, delivery_settings")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("name");

  // Mismo camino que el menú: el logo puede vivir en un bucket privado y llegar firmado.
  const theme = await resolveStorefrontThemeAssets(
    normalizeStoreThemeConfig(company.theme_config, company.name ?? resolvedParams.subdomain),
    companyId,
  );
  const businessName = theme.displayName || company.name || resolvedParams.subdomain;
  const logoUrl = theme.logoUrl?.trim() || parseThemeLogoUrl(company.theme_config) || null;

  return (
    <AccountPageClient
      businessName={businessName}
      logoUrl={logoUrl}
      companySlug={company.public_slug ?? resolvedParams.subdomain}
      countryCode={resolveCheckoutCountryCode({ businessCountry: company.country })}
      branches={(branchRows ?? []).map((branch) => ({
        id: String(branch.id),
        name: branch.name,
      }))}
      account={session ? toMenuAccountDto(session.account) : null}
      deliveryOptions={resolveMenuAccountDeliveryOptions(
        (branchRows ?? []).map((branch) => ({
          id: String(branch.id),
          name: branch.name,
          delivery_settings: branch.delivery_settings,
        })),
      )}
    />
  );
}
