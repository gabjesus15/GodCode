import { notFound } from "next/navigation";

import { createSupabasePublicServerClient } from "../../utils/supabase/server";
import { getCachedCompany } from "../../utils/tenant-cache";
import { getCachedMenuStaticData } from "@/lib/tenant/cached-menu";
import { HomeClient } from "../../components/tenant/home/home-client";
import { isTenantSubscriptionAccessible } from "@/lib/plans/tenant-subscription";
import { parseThemeLogoUrl } from "@/lib/tenant/tenant-favicon-utils";
import { createStorefrontAssetSignedUrl } from "@/lib/storage/storefront-branding";

import "./styles/Home.css";
import "./styles/BranchSelectorModal.css";

interface TenantPageProps {
  params: Promise<{ subdomain: string }>;
}

interface TenantPageThemeConfig {
  displayName?: string;
  logoUrl?: string;
}

export default async function TenantPage({ params }: TenantPageProps) {
  const resolvedParams = await params;
  const company = await getCachedCompany(resolvedParams.subdomain);

  if (!company || !isTenantSubscriptionAccessible(company)) {
    notFound();
  }

  const supabase = createSupabasePublicServerClient();

  const [staticData, { data: openShifts }] = await Promise.all([
    getCachedMenuStaticData(company.id, resolvedParams.subdomain),
    supabase
      .from("cash_shifts")
      .select("branch_id")
      .eq("company_id", company.id)
      .eq("status", "open"),
  ]);

  const openBranchIds = (openShifts ?? [])
    .map((shift) => String(shift.branch_id))
    .filter(Boolean);

  const branchesWithStatus = staticData.branches.map((branch) => {
    const rawName = branch.name ?? "";
    if (rawName.includes("ABIERTO") || rawName.includes("CERRADO")) {
      return branch;
    }
    const isOpen = openBranchIds.includes(String(branch.id));
    const suffix = isOpen ? "ABIERTO" : "CERRADO";
    const name = rawName ? `${rawName} ${suffix}` : suffix;
    return { ...branch, name };
  });

  const theme = (company?.theme_config as unknown as TenantPageThemeConfig) ?? {};
  const name = theme.displayName || company.name || resolvedParams.subdomain || "GodCode";
  const storedLogoUrl = parseThemeLogoUrl(company?.theme_config);
  const logoUrl = await createStorefrontAssetSignedUrl(storedLogoUrl, String(company.id)) || null;

  return (
    <HomeClient
      name={name}
      logoUrl={logoUrl}
      schedule={staticData.businessInfo?.schedule ?? null}
      branches={branchesWithStatus}
      publicSlug={resolvedParams.subdomain}
    />
  );
}
