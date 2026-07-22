import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/revalidate-menu
 *
 * Purges the Next.js ISR cache for a tenant's menu page.
 * Designed to be called from two sources:
 *
 *  1. Supabase Database Webhook — configure in Supabase Dashboard:
 *       URL: https://your-domain.com/api/revalidate-menu
 *       Method: POST
 *       Payload format: { type, table, record: { company_id, ... }, old_record: { ... } }
 *       Authorization header: Bearer <REVALIDATION_SECRET>
 *
 *  2. Internal API routes (e.g. store-theme/publish) — POST with:
 *       { companyId: string }
 *       Authorization: Bearer <REVALIDATION_SECRET>
 *
 * Environment variable required: REVALIDATION_SECRET
 */

interface SupabaseWebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
}

interface DirectPayload {
  companyId?: string;
  table?: string;
}

function extractCompanyId(body: SupabaseWebhookPayload | DirectPayload): string | null {
  // Direct call format
  if ("companyId" in body && typeof body.companyId === "string") {
    return body.companyId.trim() || null;
  }
  // Supabase webhook format
  if ("record" in body) {
    const webhook = body as SupabaseWebhookPayload;
    const id =
      (webhook.record?.company_id as string | undefined) ??
      (webhook.old_record?.company_id as string | undefined) ??
      (webhook.record?.id as string | undefined); // for companies table itself
    return typeof id === "string" ? id.trim() || null : null;
  }
  return null;
}

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.REVALIDATION_SECRET;
  if (!secret) {
    // If no secret is configured, reject all requests in production
    if (process.env.NODE_ENV === "production") return false;
    // Allow in development without secret
    return true;
  }
  const authHeader = req.headers.get("authorization") ?? "";
  const internalHeader = req.headers.get("x-revalidation-secret") ?? "";
  return authHeader === `Bearer ${secret}` || internalHeader === secret;
}

export async function POST(req: NextRequest) {
  // 1. Authorization check
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  // 2. Parse body
  let body: SupabaseWebhookPayload | DirectPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // 3. Extract companyId
  const companyId = extractCompanyId(body);
  if (!companyId) {
    return NextResponse.json(
      { error: "Missing companyId. Provide { companyId } or a Supabase webhook payload with record.company_id" },
      { status: 400 },
    );
  }

  // 4. Invalidate the menu cache for this tenant
  const tag = `menu:${companyId}`;
  revalidateTag(tag, "max");

  const table = (body as SupabaseWebhookPayload).table ?? (body as DirectPayload).table ?? "unknown";
  
  // Invalidate company config cache if companies table is modified
  let companySlugRevalidated = null;
  if (table === "companies" && "record" in body) {
    const webhook = body as SupabaseWebhookPayload;
    const slug = (webhook.record?.public_slug as string | undefined) ?? (webhook.old_record?.public_slug as string | undefined);
    if (slug) {
      companySlugRevalidated = `company-slug:${slug}`;
      revalidateTag(companySlugRevalidated, "max");
    }
  }

  console.warn(`[revalidate-menu] tag="${tag}" companySlugTag="${companySlugRevalidated || 'none'}" table="${table}" at=${new Date().toISOString()}`);

  return NextResponse.json({
    revalidated: true,
    companyId,
    tag,
    companySlugTag: companySlugRevalidated,
    table,
    at: new Date().toISOString(),
  });
}
