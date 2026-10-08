import { notFound } from "next/navigation";

import { getCachedCompany } from "../../utils/tenant-cache";
import { HomePageView } from "../../components/tenant/home/home-page-view";
import { isTenantSubscriptionAccessible } from "@/lib/plans/tenant-subscription";
import { loadHomePageInput } from "@/lib/tenant/home-page/load-home-page";
import { resolveHomePage } from "@/lib/tenant/home-page/resolve-home-page";

import "../../components/tenant/home/home-page.css";

interface TenantPageProps {
  params: Promise<{ subdomain: string }>;
}

export default async function TenantPage({ params }: TenantPageProps) {
  const { subdomain } = await params;
  const company = await getCachedCompany(subdomain);

  if (!company || !isTenantSubscriptionAccessible(company)) {
    notFound();
  }

  const model = resolveHomePage(await loadHomePageInput(company, subdomain));
  const panelBase = (process.env.NEXT_PUBLIC_TENANT_PANEL_URL ?? "").trim().replace(/\/$/, "");

  return <HomePageView model={model} publicSlug={subdomain} adminHref={panelBase ? `${panelBase}/` : null} />;
}
