import { readFile } from "fs/promises";
import path from "path";

import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

import { parseThemeLogoUrl, tenantBrandingIconVersionSeed } from "@/lib/tenant/tenant-favicon-utils";
import { createStorefrontAssetSignedUrl } from "@/lib/storage/storefront-branding";
import { resolveTenantSlugFromCustomDomainHost } from "@/lib/tenant/custom-domain-resolve";
import { getCachedCompany } from "@/utils/tenant-cache";

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

/** Redimensiona a PNG cuadrado; si sharp falla, sirve el original (comportamiento anterior). */
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
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
      },
    });
  } catch {
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": originalContentType,
        "Cache-Control": "public, max-age=300, s-maxage=120",
      },
    });
  }
}

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase());
  return initials.join("") || "GC";
};

const buildFallbackSvg = (name: string, color: string, size: number = DEFAULT_ICON_SIZE) => {
  const initials = getInitials(name);
  const fontSize = Math.round(size * 0.375);
  const radius = Math.round(size * 0.23);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="${color}"/><text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700">${initials}</text></svg>`;
};

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
      return new NextResponse(buildFallbackSvg("GodCode", "#111827", size), {
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": "public, max-age=300",
        },
      });
    }
  }

  const company = await getCachedCompany(tenantSlug);
  const theme = company?.theme_config as Record<string, unknown> | null | undefined;
  const displayName = typeof theme?.displayName === "string" ? theme.displayName.trim() : "";
  const name = displayName || company?.name || "GodCode";
  const primaryColor = (typeof theme?.primaryColor === "string" && theme.primaryColor.trim()) || "#111827";
  const storedLogoUrl = parseThemeLogoUrl(company?.theme_config);
  const logoUrl = company?.id
    ? await createStorefrontAssetSignedUrl(storedLogoUrl, String(company.id))
    : storedLogoUrl;
  const status = company?.subscription_status?.toLowerCase();

  if (logoUrl && status !== "suspended" && status !== "cancelled") {
    try {
      const upstream = await fetch(String(logoUrl), {
        cache: "no-store",
        redirect: "follow",
        headers: {
          Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/png,image/jpeg,image/*,*/*;q=0.8",
          "User-Agent": "GodCode-TenantFavicon/1.0",
        },
      });
      if (upstream.ok) {
        const buf = Buffer.from(await upstream.arrayBuffer());
        if (buf.byteLength > 0) {
          const rawType = upstream.headers.get("content-type") || "";
          const contentType = rawType.split(";")[0]?.trim() || "image/png";

          return await toIconResponse(buf, size, contentType);
        }
      }
    } catch {
      // Fallback handled below.
    }
  }

  const svg = buildFallbackSvg(name, primaryColor, size);
  const versionSeed = company ? tenantBrandingIconVersionSeed(company) : tenantSlug;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": `public, max-age=300, s-maxage=120, ${versionSeed ? `stale-while-revalidate=600` : ""}`.replace(/,\s*$/, ""),
    },
  });
}
