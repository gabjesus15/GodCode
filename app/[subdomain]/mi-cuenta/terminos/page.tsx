import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCachedCompany } from "../../../../utils/tenant-cache";
import { isTenantSubscriptionAccessible } from "@/lib/plans/tenant-subscription";
import { MENU_ACCOUNT_ENABLED } from "@/lib/menu-account/feature";
import { normalizeStoreThemeConfig } from "@/lib/store-theme/theme-config";
import { resolveStorefrontThemeAssets } from "@/lib/storage/storefront-branding";
import { parseThemeLogoUrl } from "@/lib/tenant/tenant-favicon-utils";
import { AccountTermsPageClient } from "../../../../components/tenant/account/account-terms-page-client";

import "../../styles/Account.css";

export const metadata: Metadata = {
  title: "Términos y Condiciones",
  robots: { index: false, follow: true },
};

interface TenantAccountTermsPageProps {
  params: Promise<{ subdomain: string }>;
}

export default async function TenantAccountTermsPage({ params }: TenantAccountTermsPageProps) {
  // Mismo gate que /mi-cuenta: sin cuenta de cliente no hay términos que aceptar.
  if (!MENU_ACCOUNT_ENABLED) {
    notFound();
  }

  const resolvedParams = await params;
  const company = await getCachedCompany(resolvedParams.subdomain);

  if (!company || !isTenantSubscriptionAccessible(company)) {
    notFound();
  }

  const theme = await resolveStorefrontThemeAssets(
    normalizeStoreThemeConfig(company.theme_config, company.name ?? resolvedParams.subdomain),
    String(company.id),
  );
  const businessName = theme.displayName || company.name || resolvedParams.subdomain;
  const logoUrl = theme.logoUrl?.trim() || parseThemeLogoUrl(company.theme_config) || null;

  return (
    <AccountTermsPageClient
      businessName={businessName}
      logoUrl={logoUrl}
      companySlug={company.public_slug ?? resolvedParams.subdomain}
    />
  );
}
