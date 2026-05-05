import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { SAAS_MUTATE_ROLES, SAAS_READ_ROLES, validateAdminRolesOnServer } from "@/utils/admin/server-auth";

type ModuleRow = {
  id: string;
  tab_id: string;
  label: string;
  description: string | null;
  nav_group: "root" | "sales" | "menu";
  nav_order: number;
  allowed_roles: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const NAV_GROUPS = new Set(["root", "sales", "menu"]);
const ROLE_VALUES = new Set(["admin", "ceo", "cashier", "staff"]);

const normalizeRoles = (roles: unknown): string[] => {
  if (!Array.isArray(roles)) return ["admin", "ceo"];

  const normalized = roles
    .map((role) => String(role).trim().toLowerCase())
    .map((role) => (role === "staff" ? "cashier" : role))
    .filter((role) => ROLE_VALUES.has(role));

  const unique = [...new Set(normalized)];
  return unique.length > 0 ? unique : ["admin", "ceo"];
};

const toDto = (row: ModuleRow) => ({
  id: row.id,
  tabId: row.tab_id,
  label: row.label,
  description: row.description ?? "",
  navGroup: row.nav_group,
  navOrder: row.nav_order,
  allowedRoles: Array.isArray(row.allowed_roles) ? row.allowed_roles : ["admin", "ceo"],
  isActive: row.is_active,
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
  return { ok: true as const };
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
  return { ok: true as const };
}

export async function GET() {
  const access = await validateSaasRead();
  if (!access.ok) return access.response;

  const { data, error } = await supabaseAdmin
    .from("saas_admin_modules")
    .select("id,tab_id,label,description,nav_group,nav_order,allowed_roles,is_active,created_at,updated_at")
    .order("nav_group", { ascending: true })
    .order("nav_order", { ascending: true })
    .order("label", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    modules: ((data ?? []) as ModuleRow[]).map(toDto),
  });
}

export async function POST(req: NextRequest) {
  const access = await validateSaasMutate();
  if (!access.ok) return access.response;

  const body = await req.json();
  const tabId = String(body.tabId ?? "").trim().toLowerCase();
  const label = String(body.label ?? "").trim();
  const description = String(body.description ?? "").trim();
  const navGroup = String(body.navGroup ?? "root").trim().toLowerCase();
  const navOrder = Number.isFinite(Number(body.navOrder)) ? Number(body.navOrder) : 100;
  const allowedRoles = normalizeRoles(body.allowedRoles);
  const isActive = Boolean(body.isActive ?? true);

  if (!tabId || !tabId.startsWith("module:")) {
    return NextResponse.json({ error: "tabId inválido. Debe comenzar con module:" }, { status: 400 });
  }

  if (!label) {
    return NextResponse.json({ error: "El nombre del módulo es obligatorio" }, { status: 400 });
  }

  if (!NAV_GROUPS.has(navGroup)) {
    return NextResponse.json({ error: "Sección de navbar inválida" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("saas_admin_modules")
    .insert({
      tab_id: tabId,
      label,
      description,
      nav_group: navGroup,
      nav_order: navOrder,
      allowed_roles: allowedRoles,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .select("id,tab_id,label,description,nav_group,nav_order,allowed_roles,is_active,created_at,updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, module: toDto(data as ModuleRow) });
}

export async function PUT(req: NextRequest) {
  const access = await validateSaasMutate();
  if (!access.ok) return access.response;

  const body = await req.json();
  const id = String(body.id ?? "").trim();
  const tabId = String(body.tabId ?? "").trim().toLowerCase();
  const label = String(body.label ?? "").trim();
  const description = String(body.description ?? "").trim();
  const navGroup = String(body.navGroup ?? "root").trim().toLowerCase();
  const navOrder = Number.isFinite(Number(body.navOrder)) ? Number(body.navOrder) : 100;
  const allowedRoles = normalizeRoles(body.allowedRoles);
  const isActive = Boolean(body.isActive ?? true);

  if (!id) {
    return NextResponse.json({ error: "Falta id" }, { status: 400 });
  }

  if (!tabId || !tabId.startsWith("module:")) {
    return NextResponse.json({ error: "tabId inválido. Debe comenzar con module:" }, { status: 400 });
  }

  if (!label) {
    return NextResponse.json({ error: "El nombre del módulo es obligatorio" }, { status: 400 });
  }

  if (!NAV_GROUPS.has(navGroup)) {
    return NextResponse.json({ error: "Sección de navbar inválida" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("saas_admin_modules")
    .update({
      tab_id: tabId,
      label,
      description,
      nav_group: navGroup,
      nav_order: navOrder,
      allowed_roles: allowedRoles,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id,tab_id,label,description,nav_group,nav_order,allowed_roles,is_active,created_at,updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, module: toDto(data as ModuleRow) });
}

export async function DELETE(req: NextRequest) {
  const access = await validateSaasMutate();
  if (!access.ok) return access.response;

  const body = await req.json();
  const id = String(body.id ?? "").trim();

  if (!id) {
    return NextResponse.json({ error: "Falta id" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("saas_admin_modules").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
