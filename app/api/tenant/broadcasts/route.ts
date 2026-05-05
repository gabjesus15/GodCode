import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { parseJsonBody } from "@/lib/api/response";
import { tenantBroadcastAckSchema } from "@/lib/api/schemas/tenant/broadcasts";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { createSupabaseServerClient } from "@/utils/supabase/server";

type MessageError = { message: string } | null;

type TenantUserRow = {
  id: string;
  company_id: string;
  role: string;
};

type CompanyRow = {
  id: string;
  plan_id: string | null;
  public_slug: string | null;
};

type BroadcastRow = {
  id: string;
  title: string;
  message: string;
  broadcast_type: "general" | "maintenance" | "incident" | "billing" | "release";
  priority: "low" | "medium" | "high" | "critical";
  target_scope: "all" | "plans" | "companies" | "subdomains";
  target_plan_ids: string[] | null;
  target_company_ids: string[] | null;
  target_subdomains: string[] | null;
  starts_at: string;
  ends_at: string | null;
  requires_ack: boolean;
  is_active: boolean;
  created_at: string;
};

type ReadRow = {
  broadcast_id: string;
  read_at: string;
};

const TENANT_ALLOWED_ROLES = new Set(["admin", "ceo", "cashier", "staff"]);

async function getTenantContext(admin: SupabaseClient) {
  const supabase = await createSupabaseServerClient("tenant");
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    return { error: "No autenticado" };
  }

  const email = user.email.trim().toLowerCase();
  const { data: rows, error: userRowError } = await admin
    .from("users")
    .select("id,company_id,role")
    .ilike("email", email) as { data: TenantUserRow[] | null; error: MessageError };

  if (userRowError) return { error: userRowError.message };

  const userRow = (rows ?? []).find((row) => TENANT_ALLOWED_ROLES.has(String(row.role || "").toLowerCase()));
  if (!userRow?.company_id) {
    return { error: "No tienes permisos de panel tenant" };
  }

  const { data: company, error: companyError } = await admin
    .from("companies")
    .select("id,plan_id,public_slug")
    .eq("id", userRow.company_id)
    .maybeSingle() as { data: CompanyRow | null; error: MessageError };

  if (companyError || !company) {
    return { error: companyError?.message || "No se encontró la empresa" };
  }

  return {
    companyId: company.id,
    companyPlanId: company.plan_id,
    companySlug: String(company.public_slug || "").toLowerCase(),
    email,
  };
}

const shouldIncludeBroadcast = (
  item: BroadcastRow,
  ctx: { companyId: string; companyPlanId: string | null; companySlug: string }
) => {
  if (!item.is_active) return false;

  const scope = item.target_scope;
  if (scope === "all") return true;

  if (scope === "companies") {
    const ids = Array.isArray(item.target_company_ids) ? item.target_company_ids : [];
    return ids.includes(ctx.companyId);
  }

  if (scope === "plans") {
    const planIds = Array.isArray(item.target_plan_ids) ? item.target_plan_ids : [];
    return !!ctx.companyPlanId && planIds.includes(ctx.companyPlanId);
  }

  if (scope === "subdomains") {
    const slugs = Array.isArray(item.target_subdomains)
      ? item.target_subdomains.map((slug) => String(slug).toLowerCase())
      : [];
    return !!ctx.companySlug && slugs.includes(ctx.companySlug);
  }

  return false;
};

export async function GET() {
  try {
    const ctx = await getTenantContext(supabaseAdmin);

    if ("error" in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("saas_broadcasts")
      .select("id,title,message,broadcast_type,priority,target_scope,target_plan_ids,target_company_ids,target_subdomains,starts_at,ends_at,requires_ack,is_active,created_at")
      .eq("is_active", true)
      .lte("starts_at", new Date().toISOString())
      .or(`ends_at.is.null,ends_at.gte.${new Date().toISOString()}`)
      .order("priority", { ascending: false })
      .order("starts_at", { ascending: false }) as { data: BroadcastRow[] | null; error: MessageError };

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const visible = (data ?? []).filter((item) => shouldIncludeBroadcast(item, ctx));

    const ids = visible.map((item) => item.id);
    let readMap = new Map<string, string>();

    if (ids.length > 0) {
      const { data: reads, error: readsError } = await supabaseAdmin
        .from("saas_broadcast_reads")
        .select("broadcast_id,read_at")
        .eq("company_id", ctx.companyId)
        .eq("email", ctx.email)
        .in("broadcast_id", ids) as { data: ReadRow[] | null; error: MessageError };

      if (!readsError) {
        readMap = new Map((reads ?? []).map((row) => [row.broadcast_id, row.read_at]));
      }
    }

    return NextResponse.json({
      broadcasts: visible.map((item) => ({
        id: item.id,
        title: item.title,
        message: item.message,
        broadcastType: item.broadcast_type,
        priority: item.priority,
        startsAt: item.starts_at,
        endsAt: item.ends_at,
        requiresAck: item.requires_ack,
        readAt: readMap.get(item.id) ?? null,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error en el servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getTenantContext(supabaseAdmin);

    if ("error" in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: 403 });
    }

    const parsed = await parseJsonBody(req, tenantBroadcastAckSchema);
    if (!parsed.ok) return parsed.response;
    const { broadcastId } = parsed.data;

    const { data: broadcast, error: broadcastError } = await supabaseAdmin
      .from("saas_broadcasts")
      .select("id,title,message,broadcast_type,priority,target_scope,target_plan_ids,target_company_ids,target_subdomains,starts_at,ends_at,requires_ack,is_active,created_at")
      .eq("id", broadcastId)
      .maybeSingle() as { data: BroadcastRow | null; error: MessageError };

    if (broadcastError || !broadcast) {
      return NextResponse.json({ error: broadcastError?.message || "Comunicado no encontrado" }, { status: 404 });
    }

    if (!shouldIncludeBroadcast(broadcast, ctx)) {
      return NextResponse.json({ error: "No autorizado para este comunicado" }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from("saas_broadcast_reads")
      .upsert(
        {
          broadcast_id: broadcastId,
          company_id: ctx.companyId,
          email: ctx.email,
          read_at: new Date().toISOString(),
        },
        { onConflict: "broadcast_id,company_id,email" }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error en el servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
