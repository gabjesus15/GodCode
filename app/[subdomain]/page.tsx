import { notFound } from "next/navigation";

import { createSupabasePublicServerClient } from "../../utils/supabase/server";
import { getCachedCompany } from "../../utils/tenant-cache";
import { HomeClient } from "../../components/tenant/home/home-client";
import { isTenantSubscriptionAccessible } from "@/lib/plans/tenant-subscription";

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
  const { data: branches } = await supabase
    .from("branches")
    .select("id,name,address,whatsapp_url,instagram_url,map_url")
    .eq("company_id", company.id)
    .order("name");

  const { data: openShifts } = await supabase
    .from("cash_shifts")
    .select("branch_id")
    .eq("company_id", company.id)
    .eq("status", "open");

  const openBranchIds = (openShifts ?? [])
    .map((shift) => String(shift.branch_id))
    .filter(Boolean);

  const branchesWithStatus = (branches ?? []).map((branch) => {
    const rawName = branch.name ?? "";
    if (rawName.includes("ABIERTO") || rawName.includes("CERRADO")) {
      return branch;
    }
    const isOpen = openBranchIds.includes(String(branch.id));
    const suffix = isOpen ? "ABIERTO" : "CERRADO";
    const name = rawName ? `${rawName} ${suffix}` : suffix;
    return { ...branch, name };
  });

  const { data: businessInfo } = await supabase
    .from("business_info")
    .select("schedule")
    .eq("company_id", company.id)
    .maybeSingle();

  const theme = (company?.theme_config as unknown as TenantPageThemeConfig) ?? {};
  const name = theme.displayName || company.name || resolvedParams.subdomain || "GodCode";
  const logoUrl = theme.logoUrl ?? null;

  return (
    <HomeClient
      name={name}
      logoUrl={logoUrl}
      schedule={businessInfo?.schedule ?? null}
      branches={branchesWithStatus}
      publicSlug={resolvedParams.subdomain}
    />
  );
}
