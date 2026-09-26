import { NextRequest, NextResponse } from "next/server";
import { parseThemeLogoUrl } from "@/lib/tenant/tenant-favicon-utils";
import { buildInitialsIconSvg, fetchTenantLogo, TENANT_ICON_SECURITY_HEADERS } from "@/lib/tenant/favicon-icon";
import { resolveTenantDisplayName } from "@/lib/tenant/seo-metadata";
import { createSupabasePublicServerClient } from "../../../utils/supabase/server";
import { createStorefrontAssetSignedUrl } from "@/lib/storage/storefront-branding";
import { isTenantSubscriptionAccessible } from "@/lib/plans/tenant-subscription";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ subdomain: string }> }
) {
  const { subdomain } = await context.params;

  const supabase = createSupabasePublicServerClient();
  const { data: company } = await supabase
    .from("companies")
    .select("id,name,subscription_status,subscription_ends_at,theme_config")
    .eq("public_slug", subdomain)
    .maybeSingle();

  const theme = company?.theme_config as Record<string, unknown> | null | undefined;
  const name = resolveTenantDisplayName(company, { slug: subdomain });
  const storedLogoUrl = parseThemeLogoUrl(company?.theme_config);
  const logoUrl = company?.id
    ? await createStorefrontAssetSignedUrl(storedLogoUrl, String(company.id))
    : storedLogoUrl;
  if (logoUrl && isTenantSubscriptionAccessible(company)) {
    const logo = await fetchTenantLogo(String(logoUrl));
    if (logo) {
      return new NextResponse(new Uint8Array(logo.buf), {
        headers: {
          ...TENANT_ICON_SECURITY_HEADERS,
          "Content-Type": logo.contentType,
          "Cache-Control": "public, max-age=300, s-maxage=120",
        },
      });
    }
  }

  return new NextResponse(buildInitialsIconSvg(name, theme?.primaryColor), {
    headers: {
      ...TENANT_ICON_SECURITY_HEADERS,
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
