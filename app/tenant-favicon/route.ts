import { NextRequest, NextResponse } from "next/server";

import { parseThemeLogoUrl, tenantBrandingIconVersionSeed } from "@/lib/tenant/tenant-favicon-utils";
import { resolveTenantSlugFromCustomDomainHost } from "@/lib/tenant/custom-domain-resolve";
import { getCachedCompany } from "@/utils/tenant-cache";
import { getCloudinaryOptimizedUrl } from "@/components/tenant/utils/cloudinary";

export const dynamic = "force-dynamic";

const tenantBaseDomain = (process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN ?? "")
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "")
  .toLowerCase();

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase());
  return initials.join("") || "GC";
};

const buildFallbackSvg = (name: string, color: string) => {
  const initials = getInitials(name);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="22" fill="${color}"/><text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="36" font-weight="700">${initials}</text></svg>`;
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
  const customDomainSlug = await resolveTenantSlugFromCustomDomainHost(hostHeader);
  const hostSlug = resolveSlugFromHost(hostHeader);
  const tenantSlug = customDomainSlug ?? hostSlug;

  if (!tenantSlug) {
    return new NextResponse(buildFallbackSvg("GodCode", "#111827"), {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  const company = await getCachedCompany(tenantSlug);
  const theme = company?.theme_config as Record<string, unknown> | null | undefined;
  const displayName = typeof theme?.displayName === "string" ? theme.displayName.trim() : "";
  const name = displayName || company?.name || "GodCode";
  const primaryColor = (typeof theme?.primaryColor === "string" && theme.primaryColor.trim()) || "#111827";
  const logoUrl = parseThemeLogoUrl(company?.theme_config);
  const status = company?.subscription_status?.toLowerCase();

  if (logoUrl && status !== "suspended" && status !== "cancelled") {
    try {
      const optimizedLogo = getCloudinaryOptimizedUrl(logoUrl, {
        width: 128,
        height: 128,
        crop: "fill",
        gravity: "auto",
      });
      const normalizedLogoUrl =
        typeof optimizedLogo === "string" && optimizedLogo.startsWith("//")
          ? `https:${optimizedLogo}`
          : optimizedLogo;

      const upstream = await fetch(String(normalizedLogoUrl), {
        cache: "no-store",
        redirect: "follow",
        headers: {
          Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/png,image/jpeg,image/*,*/*;q=0.8",
          "User-Agent": "GodCode-TenantFavicon/1.0",
        },
      });
      if (upstream.ok) {
        const buf = await upstream.arrayBuffer();
        if (buf.byteLength > 0) {
          const rawType = upstream.headers.get("content-type") || "";
          const contentType = rawType.split(";")[0]?.trim() || "image/png";

          return new NextResponse(buf, {
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "public, max-age=300, s-maxage=120",
            },
          });
        }
      }
    } catch {
      // Fallback handled below.
    }
  }

  const svg = buildFallbackSvg(name, primaryColor);
  const versionSeed = company ? tenantBrandingIconVersionSeed(company) : tenantSlug;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": `public, max-age=300, s-maxage=120, ${versionSeed ? `stale-while-revalidate=600` : ""}`.replace(/,\s*$/, ""),
    },
  });
}