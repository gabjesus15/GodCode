import { CompanyGlobalForm } from "./company-global-form";
import { CompanyHealth } from "./company-health";
import { normalizeStoreThemeConfig } from "@/lib/store-theme/theme-config";
import { resolveStorefrontThemeAssets } from "@/lib/storage/storefront-branding";

interface CompanyGlobalTabProps {
  company: {
    id: string;
    name: string | null;
    legal_rut: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    public_slug: string | null;
    custom_domain?: string | null;
    plan_id: string | null;
    subscription_status: string | null;
    subscription_ends_at?: string | null;
    updated_at?: string | null;
    theme_config?: {
      primaryColor?: string;
      secondaryColor?: string;
      priceColor?: string;
      discountColor?: string;
      hoverColor?: string;
      logoUrl?: string;
      backgroundColor?: string;
      backgroundImageUrl?: string;
      displayName?: string;
      panelAccess?: string[];
      roleNavPermissions?: Record<string, string[]>;
    } | null;
  };
  uberIntegration: {
    clientId: string;
    hasClientSecret: boolean;
    allowTenantExternalDelivery: boolean;
  };
  businessInfo: {
    name: string | null;
    phone: string | null;
    address: string | null;
    instagram: string | null;
    schedule: string | null;
  } | null;
  plans: Array<{
    id: string;
    name: string | null;
    price: number | null;
    max_branches: number | null;
    features?: unknown;
  }>;
  payments: Array<{
    id: string;
    amount_paid: number | null;
    payment_method: string | null;
    status: string | null;
    payment_date: string | null;
    payment_reference: string | null;
    months_paid: number | null;
  }>;
}

export async function CompanyGlobalTab({
  company,
  uberIntegration,
  businessInfo,
  plans,
  payments,
}: CompanyGlobalTabProps) {
  const resolvedAssets = await resolveStorefrontThemeAssets(
    normalizeStoreThemeConfig(company.theme_config, company.name ?? ""),
    company.id,
  );

  return (
    <div className="flex flex-col gap-6">
      <CompanyHealth companyId={company.id} />
      <CompanyGlobalForm
        company={company}
        businessInfo={businessInfo}
        plans={plans}
        payments={payments}
        brandingPreviewUrls={{
          logoUrl: resolvedAssets.logoUrl,
          backgroundImageUrl: resolvedAssets.backgroundImageUrl,
        }}
        uberIntegration={uberIntegration}
      />
    </div>
  );
}
