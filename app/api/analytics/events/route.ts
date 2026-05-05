import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { getSubdomainFromHost, isMainDomain } from "@/lib/tenant/main-domain-host";

type EventBody = {
  event?: string;
  path?: string;
  referrer?: string | null;
  title?: string | null;
  visitorId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
};

function sanitize(value: unknown, maxLen: number): string {
  return String(value ?? "").trim().slice(0, maxLen);
}

function normalizeHost(rawHost: string | null): string {
  const host = (rawHost || "").split(":")[0].trim().toLowerCase();
  if (host.startsWith("www.")) return host.slice(4);
  return host;
}

function looksLikeBot(ua: string): boolean {
  return /(bot|crawler|spider|preview|facebookexternalhit|slurp|bingpreview)/i.test(ua);
}

function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  const salt = process.env.ANALYTICS_IP_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "analytics-ip-salt";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as EventBody;
    const eventName = sanitize(body.event || "page_view", 50) || "page_view";
    const path = sanitize(body.path || "/", 500) || "/";
    const referrer = sanitize(body.referrer, 500) || null;
    const title = sanitize(body.title, 200) || null;
    const visitorId = sanitize(body.visitorId, 120) || null;
    const sessionId = sanitize(body.sessionId, 120) || null;

    const userAgent = sanitize(req.headers.get("user-agent"), 500);
    if (!userAgent || looksLikeBot(userAgent)) {
      return NextResponse.json({ ok: true, dropped: true });
    }

    const host = normalizeHost(req.headers.get("x-forwarded-host") || req.headers.get("host"));
    const countryCodeRaw = sanitize(
      req.headers.get("x-vercel-ip-country") || req.headers.get("cf-ipcountry") || req.headers.get("x-country-code"),
      8,
    );
    const countryCode = countryCodeRaw ? countryCodeRaw.toUpperCase() : null;

    let pageType: "landing" | "tenant" | "saas" | "unknown" = "unknown";
    let tenantSlug: string | null = null;
    let companyId: string | null = null;

    if (host && isMainDomain(host)) {
      if (path === "/" || path.startsWith("/landing")) pageType = "landing";
      else pageType = "saas";
    } else if (host) {
      const bySubdomain = getSubdomainFromHost(host);
      if (bySubdomain) {
        tenantSlug = bySubdomain;
      }

      if (!tenantSlug) {
        const { data: byDomain } = await supabaseAdmin
          .from("companies")
          .select("id, public_slug")
          .eq("custom_domain", host)
          .maybeSingle();
        if (byDomain?.public_slug) {
          tenantSlug = byDomain.public_slug;
          companyId = byDomain.id;
        }
      }

      if (tenantSlug && !companyId) {
        const { data: bySlug } = await supabaseAdmin
          .from("companies")
          .select("id")
          .eq("public_slug", tenantSlug)
          .maybeSingle();
        companyId = bySlug?.id ?? null;
      }

      pageType = tenantSlug ? "tenant" : "unknown";
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
    const ipHash = hashIp(ip);

    const { error } = await supabaseAdmin.from("analytics_events").insert({
      event_name: eventName,
      page_type: pageType,
      path,
      host: host || null,
      referrer,
      title,
      visitor_id: visitorId,
      session_id: sessionId,
      tenant_slug: tenantSlug,
      company_id: companyId,
      country_code: countryCode,
      user_agent: userAgent,
      ip_hash: ipHash,
      metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {},
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }
}
