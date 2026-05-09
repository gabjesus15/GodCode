import { NextRequest, NextResponse } from "next/server";
import { parseThemeLogoUrl } from "@/lib/tenant/tenant-favicon-utils";
import { getCloudinaryOptimizedUrl } from "@/components/tenant/utils/cloudinary";
import { createSupabasePublicServerClient } from "../../../utils/supabase/server";

export const dynamic = "force-dynamic";

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase());
  return initials.join("") || "GC";
};

const buildFallbackSvg = (name: string, color: string) => {
  const initials = getInitials(name);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="22" fill="${color}"/><text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="36" font-weight="700">${initials}</text></svg>`;
};

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ subdomain: string }> }
) {
  const { subdomain } = await context.params;

  const supabase = createSupabasePublicServerClient();
  const { data: company } = await supabase
    .from("companies")
    .select("id,name,subscription_status,theme_config")
    .eq("public_slug", subdomain)
    .maybeSingle();

  const theme = company?.theme_config as Record<string, unknown> | null | undefined;
  const displayName =
    typeof theme?.displayName === "string" ? theme.displayName.trim() : "";
  const name = displayName || company?.name || "GodCode";
  const primaryColor =
    (typeof theme?.primaryColor === "string" && theme.primaryColor.trim()) || "#111827";
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

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
