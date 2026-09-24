import { readFile } from "fs/promises";
import path from "path";

import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

import { parseThemeLogoUrl, tenantBrandingIconVersionSeed } from "@/lib/tenant/tenant-favicon-utils";
import { buildInitialsIconSvg, fetchTenantLogo, TENANT_ICON_SECURITY_HEADERS } from "@/lib/tenant/favicon-icon";
import { resolveTenantDisplayName } from "@/lib/tenant/seo-metadata";
import { createStorefrontAssetSignedUrl } from "@/lib/storage/storefront-branding";
import { resolveTenantSlugFromCustomDomainHost } from "@/lib/tenant/custom-domain-resolve";
import { getCachedCompany } from "@/utils/tenant-cache";
import { isTenantSubscriptionAccessible } from "@/lib/plans/tenant-subscription";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const tenantBaseDomain = (process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN ?? "")
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "")
  .toLowerCase();

// Google Search exige favicons múltiplo de 48px; los logos originales pesan 1-2 MB.
const ALLOWED_ICON_SIZES = new Set([48, 96, 144, 192]);
const DEFAULT_ICON_SIZE = 96;

function parseIconSize(raw: string | null): number {
  const parsed = Number.parseInt(String(raw ?? ""), 10);
  return ALLOWED_ICON_SIZES.has(parsed) ? parsed : DEFAULT_ICON_SIZE;
}

/** Redimensiona a PNG cuadrado; si sharp falla, sirve el original (ya validado como imagen). */
async function toIconResponse(
  buf: Buffer,
  size: number,
  originalContentType: string,
): Promise<NextResponse> {
  try {
    const resized = await sharp(buf)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    return new NextResponse(new Uint8Array(resized), {
      headers: {
        ...TENANT_ICON_SECURITY_HEADERS,
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
      },
    });
  } catch {
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        ...TENANT_ICON_SECURITY_HEADERS,
        "Content-Type": originalContentType,
        "Cache-Control": "public, max-age=300, s-maxage=120",
      },
    });
  }
}

function resolveSlugFromHost(hostHeader: string | null): string | null {
  if (!hostHeader) return null;

  const hostname = hostHeader.split(":")[0].toLowerCase();
  if (hostname === "localhost" || hostname === "www.localhost" || hostname.endsWith(".vercel.app")) {
    return null;
  }

  if (tenantBaseDomain) {
    if (hostname === tenantBaseDomain || hostname === `www.${tenantBaseDomain}`) {
      return null;
    }

    if (hostname.endsWith(`.${tenantBaseDomain}`)) {
      const candidate = hostname.slice(0, -(`.${tenantBaseDomain}`.length));
      if (!candidate || candidate === "www" || candidate.includes(".")) {
        return null;
      }
      return candidate;
    }
  }

  return null;
}

export async function GET(req: NextRequest) {
  const hostHeader = req.headers.get("host");
  const { searchParams } = new URL(req.url);
  const querySlug = searchParams.get("tenant")?.trim();
  const size = parseIconSize(searchParams.get("size"));
  const customDomainSlug = await resolveTenantSlugFromCustomDomainHost(hostHeader);
  const hostSlug = resolveSlugFromHost(hostHeader);
  const tenantSlug = querySlug || customDomainSlug || hostSlug;

  if (!tenantSlug) {
    try {
      const buf = await readFile(path.join(process.cwd(), "public", "logo.png"));
      return await toIconResponse(buf, size, "image/png");
    } catch {
      return new NextResponse(buildInitialsIconSvg("Gcode", "#111827", size), {
        headers: {
          ...TENANT_ICON_SECURITY_HEADERS,
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": "public, max-age=300",
        },
      });
    }
  }

  const company = await getCachedCompany(tenantSlug);
  const theme = company?.theme_config as Record<string, unknown> | null | undefined;
  const name = resolveTenantDisplayName(company, { slug: tenantSlug });
  const storedLogoUrl = parseThemeLogoUrl(company?.theme_config);
  const logoUrl = company?.id
    ? await createStorefrontAssetSignedUrl(storedLogoUrl, String(company.id))
    : storedLogoUrl;
  if (logoUrl && isTenantSubscriptionAccessible(company)) {
    const logo = await fetchTenantLogo(String(logoUrl));
    if (logo) return await toIconResponse(logo.buf, size, logo.contentType);
  }

  const svg = buildInitialsIconSvg(name, theme?.primaryColor, size);
  const versionSeed = company ? tenantBrandingIconVersionSeed(company) : tenantSlug;

  return new NextResponse(svg, {
    headers: {
      ...TENANT_ICON_SECURITY_HEADERS,
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": `public, max-age=300, s-maxage=120, ${versionSeed ? `stale-while-revalidate=600` : ""}`.replace(/,\s*$/, ""),
    },
  });
}
