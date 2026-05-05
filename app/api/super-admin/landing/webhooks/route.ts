import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { SAAS_MUTATE_ROLES, SAAS_READ_ROLES, validateAdminRolesOnServer } from "../../../../../utils/admin/server-auth";

const DESTINATIONS = new Set(["slack", "email"]);
const EVENTS = new Set(["lead.created", "contact.created"]);

function normalizeEvents(value: unknown): string[] {
  if (!Array.isArray(value)) return ["lead.created", "contact.created"];
  const list = value
    .map((item) => String(item).trim())
    .filter((item) => EVENTS.has(item));
  return list.length > 0 ? [...new Set(list)] : ["lead.created", "contact.created"];
}

export async function GET() {
  const access = await validateAdminRolesOnServer([...SAAS_READ_ROLES]);
  if (!access.ok) {
    return NextResponse.json({ error: access.error ?? "No autorizado" }, { status: access.status });
  }

  const { data, error } = await supabaseAdmin
    .from("landing_webhook_subscriptions")
    .select("id,name,destination_type,url,events,is_active,secret,created_at,updated_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    data: (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      destinationType: row.destination_type,
      url: row.url,
      events: row.events,
      isActive: row.is_active,
      secret: row.secret,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
  });
}

export async function POST(req: NextRequest) {
  const access = await validateAdminRolesOnServer([...SAAS_MUTATE_ROLES]);
  if (!access.ok) {
    return NextResponse.json({ error: access.error ?? "No autorizado" }, { status: access.status });
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const name = String(body.name ?? "").trim();
  const destinationType = String(body.destinationType ?? "").trim().toLowerCase();
  const url = String(body.url ?? "").trim();
  const events = normalizeEvents(body.events);
  const isActive = body.isActive !== false;
  const secret = String(body.secret ?? "").trim() || null;

  if (!name) return NextResponse.json({ error: "Falta nombre" }, { status: 400 });
  if (!DESTINATIONS.has(destinationType)) return NextResponse.json({ error: "Destino inválido" }, { status: 400 });
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return NextResponse.json({ error: "URL inválida" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("landing_webhook_subscriptions")
    .insert({
      name,
      destination_type: destinationType,
      url,
      events,
      is_active: isActive,
      secret,
      updated_at: new Date().toISOString(),
    })
    .select("id,name,destination_type,url,events,is_active,secret,created_at,updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    ok: true,
    item: {
      id: data.id,
      name: data.name,
      destinationType: data.destination_type,
      url: data.url,
      events: data.events,
      isActive: data.is_active,
      secret: data.secret,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    },
  });
}

export async function PUT(req: NextRequest) {
  const access = await validateAdminRolesOnServer([...SAAS_MUTATE_ROLES]);
  if (!access.ok) {
    return NextResponse.json({ error: access.error ?? "No autorizado" }, { status: access.status });
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const id = String(body.id ?? "").trim();
  const name = String(body.name ?? "").trim();
  const destinationType = String(body.destinationType ?? "").trim().toLowerCase();
  const url = String(body.url ?? "").trim();
  const events = normalizeEvents(body.events);
  const isActive = body.isActive !== false;
  const secret = String(body.secret ?? "").trim() || null;

  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });
  if (!name) return NextResponse.json({ error: "Falta nombre" }, { status: 400 });
  if (!DESTINATIONS.has(destinationType)) return NextResponse.json({ error: "Destino inválido" }, { status: 400 });
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return NextResponse.json({ error: "URL inválida" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("landing_webhook_subscriptions")
    .update({
      name,
      destination_type: destinationType,
      url,
      events,
      is_active: isActive,
      secret,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id,name,destination_type,url,events,is_active,secret,created_at,updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    ok: true,
    item: {
      id: data.id,
      name: data.name,
      destinationType: data.destination_type,
      url: data.url,
      events: data.events,
      isActive: data.is_active,
      secret: data.secret,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    },
  });
}

export async function DELETE(req: NextRequest) {
  const access = await validateAdminRolesOnServer([...SAAS_MUTATE_ROLES]);
  if (!access.ok) {
    return NextResponse.json({ error: access.error ?? "No autorizado" }, { status: access.status });
  }

  const body = await req.json().catch(() => ({} as { id?: string }));
  const id = String(body.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  const { error } = await supabaseAdmin.from("landing_webhook_subscriptions").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
