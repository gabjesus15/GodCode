import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { SAAS_MUTATE_ROLES, SAAS_READ_ROLES, validateAdminRolesOnServer } from "../../../../../utils/admin/server-auth";

const STATUS_VALUES = new Set(["new", "contacted", "closed"]);

export async function GET(req: NextRequest) {
  const access = await validateAdminRolesOnServer([...SAAS_READ_ROLES]);
  if (!access.ok) {
    return NextResponse.json({ error: access.error ?? "No autorizado" }, { status: access.status });
  }

  const search = req.nextUrl.searchParams;
  const status = String(search.get("status") ?? "").trim().toLowerCase();
  const q = String(search.get("q") ?? "").trim();
  const limit = Math.min(200, Math.max(1, Number(search.get("limit") ?? 50) || 50));

  let query = supabaseAdmin
    .from("landing_leads")
    .select("id,email,status,source,metadata,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (STATUS_VALUES.has(status)) query = query.eq("status", status);
  if (q) query = query.ilike("email", `%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    data: (data ?? []).map((row) => ({
      id: row.id,
      email: row.email,
      status: row.status,
      source: row.source,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
  });
}

export async function PATCH(req: NextRequest) {
  const access = await validateAdminRolesOnServer([...SAAS_MUTATE_ROLES]);
  if (!access.ok) {
    return NextResponse.json({ error: access.error ?? "No autorizado" }, { status: access.status });
  }

  const body = await req.json().catch(() => ({} as { id?: string; status?: string }));
  const id = String(body.id ?? "").trim();
  const status = String(body.status ?? "").trim().toLowerCase();

  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });
  if (!STATUS_VALUES.has(status)) return NextResponse.json({ error: "Estado inválido" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("landing_leads")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id,email,status,source,metadata,created_at,updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    ok: true,
    item: {
      id: data.id,
      email: data.email,
      status: data.status,
      source: data.source,
      metadata: data.metadata,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    },
  });
}
