import { notFound } from "next/navigation";

import { getCachedCompany } from "../../utils/tenant-cache";
import { HomePageView } from "../../components/tenant/home/home-page-view";
import { StoreComingSoon } from "@/components/tenant/store-draft/store-coming-soon";
import { StorePreviewBanner } from "@/components/tenant/store-draft/store-preview-banner";
import { resolveStorefrontAccess, storeDraftPublishHref } from "@/lib/tenant/store-draft-viewer";
import { loadHomePageInput } from "@/lib/tenant/home-page/load-home-page";
import { resolveHomePage } from "@/lib/tenant/home-page/resolve-home-page";

import "../../components/tenant/home/home-page.css";

interface TenantPageProps {
  params: Promise<{ subdomain: string }>;
}

export default async function TenantPage({ params }: TenantPageProps) {
  const { subdomain } = await params;
  const company = await getCachedCompany(subdomain);

  if (!company) notFound();
  const access = await resolveStorefrontAccess(company);
  if (access === "closed") notFound();
  if (access === "coming-soon") return <StoreComingSoon company={company} />;

  const model = resolveHomePage(await loadHomePageInput(company, subdomain));
  const panelBase = (process.env.NEXT_PUBLIC_TENANT_PANEL_URL ?? "").trim().replace(/\/$/, "");

  return (
    <>
      {access === "preview" ? <StorePreviewBanner publishHref={storeDraftPublishHref()} /> : null}
      <HomePageView model={model} publicSlug={subdomain} adminHref={panelBase ? `${panelBase}/` : null} />
    </>
  );
}
