import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { getCachedCompany } from "../../utils/tenant-cache";
import { HomePageView } from "../../components/tenant/home/home-page-view";
import { StoreComingSoon } from "@/components/tenant/store-draft/store-coming-soon";
import { StorePreviewBanner } from "@/components/tenant/store-draft/store-preview-banner";
import { resolveStorefrontAccess, storeDraftPublishHref } from "@/lib/tenant/store-draft-viewer";
import { readStorefrontEntry } from "@/lib/tenant/home-page/home-page-config";
import { loadHomePageInput } from "@/lib/tenant/home-page/load-home-page";
import { resolveHomePage } from "@/lib/tenant/home-page/resolve-home-page";
import { isMainDomain } from "@/lib/tenant/main-domain-host";

import "../../components/tenant/home/home-page.css";

interface TenantPageProps {
  params: Promise<{ subdomain: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TenantPage({ params, searchParams }: TenantPageProps) {
  const { subdomain } = await params;
  const company = await getCachedCompany(subdomain);

  if (!company) notFound();
  const access = await resolveStorefrontAccess(company);
  if (access === "closed") notFound();
  if (access === "coming-soon") return <StoreComingSoon company={company} />;

  // Elegido en el panel CEO: sin portada, se entra a la carta y los enlaces van en su panel lateral.
  if (readStorefrontEntry(company.theme_config) === "menu-panel") {
    const hdrs = await headers();
    const host = hdrs.get("x-forwarded-host")?.split(",")[0]?.trim() ?? hdrs.get("host") ?? "";
    const pathPrefix = isMainDomain(host) ? `/${subdomain}` : "";

    const query = new URLSearchParams();
    for (const [key, value] of Object.entries((await searchParams) ?? {})) {
      for (const item of [value].flat()) {
        if (item !== undefined) query.append(key, item);
      }
    }
    const search = query.toString();

    redirect(`${pathPrefix}/menu${search ? `?${search}` : ""}`);
  }

  const model = resolveHomePage(await loadHomePageInput(company, subdomain));
  const panelBase = (process.env.NEXT_PUBLIC_TENANT_PANEL_URL ?? "").trim().replace(/\/$/, "");

  return (
    <>
      {access === "preview" ? <StorePreviewBanner publishHref={storeDraftPublishHref()} /> : null}
      <HomePageView model={model} publicSlug={subdomain} adminHref={panelBase ? `${panelBase}/` : null} />
    </>
  );
}
