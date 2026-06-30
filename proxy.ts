import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseAuthScope } from "./utils/supabase/auth-scope";
import { getAppHostname, buildAppUrl } from "@/lib/tenant/app-url";
import {
  normalizeHostForLookup,
  resolveTenantSlugFromCustomDomainHost,
} from "@/lib/tenant/custom-domain-resolve";
import { publicApiCorsHeaders } from "@/lib/infra/api-cors";
import {
	MAIN_DOMAIN_RESERVED_PATH_SEGMENTS,
	resolveTenantSlugFromPathname,
} from "@/lib/tenant/reserved-path-segments";

const SECURITY_HEADERS: [string, string][] = [
  ["X-Content-Type-Options", "nosniff"],
  ["X-Frame-Options", "SAMEORIGIN"],
  ["Referrer-Policy", "strict-origin-when-cross-origin"],
  ["Permissions-Policy", "camera=(), microphone=(), geolocation=(self)"],
  ["X-DNS-Prefetch-Control", "on"],
  ["Content-Security-Policy", "object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'self';"],
];

function applySecurityHeaders(res: NextResponse): NextResponse {
  for (const [key, value] of SECURITY_HEADERS) {
    res.headers.set(key, value);
  }
  return res;
}

const adminPaths = [
  "/dashboard",
  "/companies",
  "/login",
  "/post-login",
  "/cuenta",
  "/plans",
  "/onboarding/solicitudes",
  "/addons",
  "/plan-payment-methods",
  "/tickets",
  "/herramientas",
];
// /onboarding debe servirse en el dominio principal; no reescribir a /[subdomain]/onboarding
const tenantBypassPaths = ["/api", "/_next", "/favicon.ico", "/onboarding", "/saas-admin"];
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const tenantBaseDomain = (process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN ?? "")
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "")
  .toLowerCase();
const canonicalAppHost = getAppHostname();

function maybeRedirectToCanonicalHost(req: NextRequest): NextResponse | null {
  if (!canonicalAppHost) return null;

  const hostHeader = req.headers.get("host");
  if (!hostHeader) return null;

  const currentHost = hostHeader.split(":")[0].toLowerCase();
  if (
    currentHost === "localhost" ||
    currentHost === "127.0.0.1" ||
    currentHost.endsWith(".localhost") ||
    currentHost.endsWith(".vercel.app")
  ) {
    return null;
  }

  const tenantBaseNoWww = tenantBaseDomain.replace(/^www\./, "");
  const currentNoWww = currentHost.replace(/^www\./, "");
  const canonicalNoWww = canonicalAppHost.replace(/^www\./, "");

  const isMainDomainVariant =
    (tenantBaseNoWww && currentNoWww === tenantBaseNoWww) ||
    (canonicalNoWww && currentNoWww === canonicalNoWww);

  // Never normalize tenant/custom domains here; only apex/www variants of the main site.
  if (!isMainDomainVariant || currentHost === canonicalAppHost) {
    return null;
  }

  const target = new URL(buildAppUrl(req.nextUrl.pathname, req.nextUrl.search));

  return NextResponse.redirect(target, 308);
}

const extractSubdomain = (hostHeader: string | null) => {
  if (!hostHeader) {
    return null;
  }

  const hostname = hostHeader.split(":")[0].toLowerCase();

  if (hostname === "localhost" || hostname === "www.localhost") {
    return null;
  }

  if (hostname === "www" || hostname === "www.") {
    return null;
  }

  if (hostname.endsWith(".vercel.app")) {
    return null;
  }

  const parts = hostname.split(".");

  if (hostname.endsWith("localhost")) {
    // Comentario: soporta subdominio.localhost durante desarrollo.
    const candidate = parts.length >= 2 ? parts[0] : null;
    if (!candidate || candidate === "www") return null;
    return candidate;
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

    return null;
  }

  // Comentario: para dominios reales esperamos algo como subdominio.godcode.com.
  const candidate = parts.length >= 3 ? parts[0] : null;
  if (!candidate || candidate === "www") return null;
  return candidate;
};

async function applySessionRefresh(
  request: NextRequest,
  response: NextResponse,
  scope: SupabaseAuthScope
) {

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: {
      name: scope === "super-admin" ? "sb-super-admin-auth-token" : "sb-tenant-auth-token",
    },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  try {
    await supabase.auth.getUser();
  } catch {
    // Red o Supabase no disponible (p. ej. CI con URL placeholder): no tumbar la petición.
  }
  return response;
}

const resolveTenantSlugFromReferer = (refererHeader: string | null) => {
  if (!refererHeader) return null;

  try {
    const refererUrl = new URL(refererHeader);
    const segments = refererUrl.pathname.split("/").filter(Boolean);
    if (segments.length === 0) return null;

    const first = segments[0]?.toLowerCase();

    return MAIN_DOMAIN_RESERVED_PATH_SEGMENTS.has(first) ? null : segments[0];
  } catch {
    return null;
  }
};

const PUBLIC_DELIVERY_API_PATHS = new Set([
  "/api/geo/delivery-quote",
  "/api/tenant/public-order-delivery",
]);

function attachPublicDeliveryApiCors(req: NextRequest, res: NextResponse): NextResponse {
  if (!PUBLIC_DELIVERY_API_PATHS.has(req.nextUrl.pathname)) return res;
  const cors = publicApiCorsHeaders(req);
  cors.forEach((value: string, key: string) => res.headers.set(key, value));
  return res;
}

export async function proxy(req: NextRequest) {
  const result = await _proxy(req);
  applySecurityHeaders(result);
  if (req.nextUrl.pathname.startsWith("/api/")) {
    result.headers.set("Cache-Control", "no-store");
  }
  return result;
}

async function _proxy(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  const canonicalRedirect = maybeRedirectToCanonicalHost(req);
  if (canonicalRedirect) {
    return canonicalRedirect;
  }

  if (PUBLIC_DELIVERY_API_PATHS.has(pathname) && req.method === "OPTIONS") {
    const cors = publicApiCorsHeaders(req);
    if ([...cors.keys()].length > 0) {
      return new NextResponse(null, { status: 204, headers: cors });
    }
  }
  const hostHeader = req.headers.get("host");
  let subdomain = extractSubdomain(hostHeader);
  if (!subdomain) {
    const normalized = normalizeHostForLookup(hostHeader);
    const base = tenantBaseDomain;
    let skipCustom = false;
    if (normalized && base) {
      const baseNoWww = base.replace(/^www\./, "");
      const hostNoWww = normalized.replace(/^www\./, "");
      skipCustom = hostNoWww === baseNoWww;
    }
    if (!skipCustom) {
      try {
        subdomain = await resolveTenantSlugFromCustomDomainHost(hostHeader);
      } catch {
        subdomain = null;
      }
    }
  }

  const resolvedTenantSlug = subdomain || resolveTenantSlugFromPathname(pathname);
  const requestHeaders = new Headers(req.headers);
  if (resolvedTenantSlug) {
    requestHeaders.set("x-tenant-slug", resolvedTenantSlug);
  }

  if (pathname === "/favicon.ico") {
    let tenantSlug = subdomain ?? resolveTenantSlugFromReferer(req.headers.get("referer"));
    if (!tenantSlug && hostHeader) {
      try {
        const custom = await resolveTenantSlugFromCustomDomainHost(hostHeader);
        tenantSlug = custom ?? tenantSlug;
      } catch {
        // ignore
      }
    }

    if (tenantSlug) {
      const rewriteUrl = new URL(`/${tenantSlug}/tenant-favicon`, req.nextUrl.origin);
      rewriteUrl.search = req.nextUrl.search;
      const response = NextResponse.rewrite(rewriteUrl, {
        request: {
          headers: requestHeaders,
        },
      });
      return attachPublicDeliveryApiCors(
        req,
        await applySessionRefresh(req, response, "tenant"),
      );
    }

    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    return attachPublicDeliveryApiCors(
      req,
      await applySessionRefresh(req, response, "super-admin"),
    );
  }

  if (subdomain) {
    // Onboarding es del dominio principal: redirigir a godcode.me/onboarding (o APP_URL)
    if (pathname.startsWith("/onboarding")) {
      const target = new URL(buildAppUrl(pathname, req.nextUrl.search));
      return attachPublicDeliveryApiCors(req, NextResponse.redirect(target, 302));
    }
    if (
      tenantBypassPaths.some((path) => pathname.startsWith(path)) ||
      (pathname.includes(".") &&
        !pathname.startsWith("/menu/") &&
        pathname !== "/llms.txt" &&
        pathname !== "/llms-full.txt")
    ) {
      const response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
      return attachPublicDeliveryApiCors(
        req,
        await applySessionRefresh(req, response, "tenant"),
      );
    }

    // Si la ruta es '/', reescribe a '/[subdomain]'
    if (pathname === "/") {
      const rewriteUrl = new URL(`/${subdomain}`, req.url);
      rewriteUrl.search = req.nextUrl.search;
      const response = NextResponse.rewrite(rewriteUrl, {
        request: {
          headers: requestHeaders,
        },
      });
      return attachPublicDeliveryApiCors(
        req,
        await applySessionRefresh(req, response, "tenant"),
      );
    }

    // If the pathname already starts with the resolved subdomain, don't rewrite again.
    if (pathname.startsWith(`/${subdomain}`)) {
      const response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
      return attachPublicDeliveryApiCors(
        req,
        await applySessionRefresh(req, response, "tenant"),
      );
    }

    const prefixedPath = `/${subdomain}${pathname}`;
    const rewriteUrl = new URL(prefixedPath, req.nextUrl.origin);
    rewriteUrl.search = req.nextUrl.search;
    const response = NextResponse.rewrite(rewriteUrl, {
      request: {
        headers: requestHeaders,
      },
    });
    return attachPublicDeliveryApiCors(
      req,
      await applySessionRefresh(req, response, "tenant"),
    );
  }

  if (adminPaths.some((path) => pathname.startsWith(path))) {
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    return attachPublicDeliveryApiCors(
      req,
      await applySessionRefresh(req, response, "super-admin"),
    );
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  return attachPublicDeliveryApiCors(
    req,
    await applySessionRefresh(req, response, "super-admin"),
  );
}

export const config = {
  matcher: [
    // Exclude asset-like paths and next internals; keep /favicon.ico in the middleware so tenants can serve their own icon.
    "/((?!api/|_next/static|_next/image|tenant-favicon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
