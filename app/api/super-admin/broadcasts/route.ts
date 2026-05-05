import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { SAAS_MUTATE_ROLES, SAAS_READ_ROLES, validateAdminRolesOnServer } from "@/utils/admin/server-auth";

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
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

const TYPE_VALUES = new Set(["general", "maintenance", "incident", "billing", "release"]);
const PRIORITY_VALUES = new Set(["low", "medium", "high", "critical"]);
const SCOPE_VALUES = new Set(["all", "plans", "companies", "subdomains"]);

const normalizeStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))];
  }

  if (typeof value === "string") {
    return [...new Set(value.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean))];
  }

  return [];
};

const toDto = (row: BroadcastRow) => ({
  id: row.id,
  title: row.title,
  message: row.message,
  broadcastType: row.broadcast_type,
  priority: row.priority,
  targetScope: row.target_scope,
  targetPlanIds: Array.isArray(row.target_plan_ids) ? row.target_plan_ids : [],
  targetCompanyIds: Array.isArray(row.target_company_ids) ? row.target_company_ids : [],
  targetSubdomains: Array.isArray(row.target_subdomains) ? row.target_subdomains : [],
  startsAt: row.starts_at,
  endsAt: row.ends_at,
  requiresAck: row.requires_ack,
  isActive: row.is_active,
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

async function validateSaasRead() {
  const result = await validateAdminRolesOnServer([...SAAS_READ_ROLES]);
  if (!result.ok) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: result.error ?? "No autorizado" },
        { status: result.status }
      ),
    };
  }
  return { ok: true as const, email: result.email ?? null };
}

async function validateSaasMutate() {
  const result = await validateAdminRolesOnServer([...SAAS_MUTATE_ROLES]);
  if (!result.ok) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: result.error ?? "No autorizado" },
        { status: result.status }
      ),
    };
  }
  return { ok: true as const, email: result.email ?? null };
}

export async function GET() {
  const access = await validateSaasRead();
  if (!access.ok) return access.response;

  const { data, error } = await supabaseAdmin
    .from("saas_broadcasts")
    .select("id,title,message,broadcast_type,priority,target_scope,target_plan_ids,target_company_ids,target_subdomains,starts_at,ends_at,requires_ack,is_active,created_by,created_at,updated_at")
    .order("starts_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ broadcasts: ((data ?? []) as BroadcastRow[]).map(toDto) });
}

export async function POST(req: NextRequest) {
  const access = await validateSaasMutate();
  if (!access.ok) return access.response;

  const body = await req.json();
  const title = String(body.title ?? "").trim();
  const message = String(body.message ?? "").trim();
  const broadcastType = String(body.broadcastType ?? "general").trim().toLowerCase();
  const priority = String(body.priority ?? "medium").trim().toLowerCase();
  const targetScope = String(body.targetScope ?? "all").trim().toLowerCase();
  const startsAt = String(body.startsAt ?? "").trim();
  const endsAtRaw = String(body.endsAt ?? "").trim();
  const requiresAck = Boolean(body.requiresAck ?? false);
  const isActive = Boolean(body.isActive ?? true);

  const targetPlanIds = normalizeStringArray(body.targetPlanIds);
  const targetCompanyIds = normalizeStringArray(body.targetCompanyIds);
  const targetSubdomains = normalizeStringArray(body.targetSubdomains).map((item) => item.toLowerCase());

  if (!title) return NextResponse.json({ error: "El título es obligatorio" }, { status: 400 });
  if (!message) return NextResponse.json({ error: "El mensaje es obligatorio" }, { status: 400 });
  if (!TYPE_VALUES.has(broadcastType)) return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  if (!PRIORITY_VALUES.has(priority)) return NextResponse.json({ error: "Prioridad inválida" }, { status: 400 });
  if (!SCOPE_VALUES.has(targetScope)) return NextResponse.json({ error: "Alcance inválido" }, { status: 400 });

  if (!startsAt) return NextResponse.json({ error: "Debes indicar fecha de inicio" }, { status: 400 });

  const startsAtIso = new Date(startsAt).toISOString();
  const endsAtIso = endsAtRaw ? new Date(endsAtRaw).toISOString() : null;

  if (targetScope === "plans" && targetPlanIds.length === 0) {
    return NextResponse.json({ error: "Debes indicar al menos un plan para ese alcance" }, { status: 400 });
  }

  if (targetScope === "companies" && targetCompanyIds.length === 0) {
    return NextResponse.json({ error: "Debes indicar al menos una empresa para ese alcance" }, { status: 400 });
  }

  if (targetScope === "subdomains" && targetSubdomains.length === 0) {
    return NextResponse.json({ error: "Debes indicar al menos un subdominio para ese alcance" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("saas_broadcasts")
    .insert({
      title,
      message,
      broadcast_type: broadcastType,
      priority,
      target_scope: targetScope,
      target_plan_ids: targetPlanIds,
      target_company_ids: targetCompanyIds,
      target_subdomains: targetSubdomains,
      starts_at: startsAtIso,
      ends_at: endsAtIso,
      requires_ack: requiresAck,
      is_active: isActive,
      created_by: access.email,
      updated_at: new Date().toISOString(),
    })
    .select("id,title,message,broadcast_type,priority,target_scope,target_plan_ids,target_company_ids,target_subdomains,starts_at,ends_at,requires_ack,is_active,created_by,created_at,updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, broadcast: toDto(data as BroadcastRow) });
}

export async function PUT(req: NextRequest) {
  const access = await validateSaasMutate();
  if (!access.ok) return access.response;

  const body = await req.json();
  const id = String(body.id ?? "").trim();
  const title = String(body.title ?? "").trim();
  const message = String(body.message ?? "").trim();
  const broadcastType = String(body.broadcastType ?? "general").trim().toLowerCase();
  const priority = String(body.priority ?? "medium").trim().toLowerCase();
  const targetScope = String(body.targetScope ?? "all").trim().toLowerCase();
  const startsAt = String(body.startsAt ?? "").trim();
  const endsAtRaw = String(body.endsAt ?? "").trim();
  const requiresAck = Boolean(body.requiresAck ?? false);
  const isActive = Boolean(body.isActive ?? true);

  const targetPlanIds = normalizeStringArray(body.targetPlanIds);
  const targetCompanyIds = normalizeStringArray(body.targetCompanyIds);
  const targetSubdomains = normalizeStringArray(body.targetSubdomains).map((item) => item.toLowerCase());

  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });
  if (!title) return NextResponse.json({ error: "El título es obligatorio" }, { status: 400 });
  if (!message) return NextResponse.json({ error: "El mensaje es obligatorio" }, { status: 400 });
  if (!TYPE_VALUES.has(broadcastType)) return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  if (!PRIORITY_VALUES.has(priority)) return NextResponse.json({ error: "Prioridad inválida" }, { status: 400 });
  if (!SCOPE_VALUES.has(targetScope)) return NextResponse.json({ error: "Alcance inválido" }, { status: 400 });
  if (!startsAt) return NextResponse.json({ error: "Debes indicar fecha de inicio" }, { status: 400 });

  const startsAtIso = new Date(startsAt).toISOString();
  const endsAtIso = endsAtRaw ? new Date(endsAtRaw).toISOString() : null;

  const { data, error } = await supabaseAdmin
    .from("saas_broadcasts")
    .update({
      title,
      message,
      broadcast_type: broadcastType,
      priority,
      target_scope: targetScope,
      target_plan_ids: targetPlanIds,
      target_company_ids: targetCompanyIds,
      target_subdomains: targetSubdomains,
      starts_at: startsAtIso,
      ends_at: endsAtIso,
      requires_ack: requiresAck,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id,title,message,broadcast_type,priority,target_scope,target_plan_ids,target_company_ids,target_subdomains,starts_at,ends_at,requires_ack,is_active,created_by,created_at,updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, broadcast: toDto(data as BroadcastRow) });
}

export async function DELETE(req: NextRequest) {
  const access = await validateSaasMutate();
  if (!access.ok) return access.response;

  const body = await req.json();
  const id = String(body.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  const { error } = await supabaseAdmin.from("saas_broadcasts").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
