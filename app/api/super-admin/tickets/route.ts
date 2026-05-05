import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { SAAS_MUTATE_ROLES, SAAS_READ_ROLES, validateAdminRolesOnServer } from "@/utils/admin/server-auth";
import { sanitizeServerText } from "@/lib/infra/server-sanitize";

type TicketStatus = "open" | "in_progress" | "waiting_customer" | "resolved" | "closed";
type TicketPriority = "low" | "medium" | "high" | "critical";
type TicketCategory = "general" | "billing" | "technical" | "product" | "account";

type TicketRow = {
  id: string;
  company_id: string;
  created_by_email: string;
  source: "tenant" | "saas";
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assigned_to: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  first_response_due_at: string | null;
  resolution_due_at: string | null;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  companies?:
    | { id: string; name: string | null; public_slug: string | null }
    | { id: string; name: string | null; public_slug: string | null }[]
    | null;
};

const STATUS_VALUES = new Set(["open", "in_progress", "waiting_customer", "resolved", "closed"]);
const PRIORITY_VALUES = new Set(["low", "medium", "high", "critical"]);
const CATEGORY_VALUES = new Set(["general", "billing", "technical", "product", "account"]);

const SLA_HOURS: Record<TicketPriority, { firstResponse: number; resolution: number }> = {
  low: { firstResponse: 24, resolution: 120 },
  medium: { firstResponse: 12, resolution: 48 },
  high: { firstResponse: 4, resolution: 24 },
  critical: { firstResponse: 2, resolution: 8 },
};

const addHours = (iso: string, hours: number) => {
  const base = new Date(iso);
  if (Number.isNaN(base.getTime())) return iso;
  return new Date(base.getTime() + hours * 60 * 60 * 1000).toISOString();
};

const computeSla = (row: TicketRow) => {
  const now = Date.now();
  const firstDue = row.first_response_due_at ? new Date(row.first_response_due_at).getTime() : null;
  const resolutionDue = row.resolution_due_at ? new Date(row.resolution_due_at).getTime() : null;

  const firstResponseBreached =
    !row.first_response_at &&
    typeof firstDue === "number" &&
    !Number.isNaN(firstDue) &&
    now > firstDue;

  const resolutionBreached =
    !row.resolved_at &&
    row.status !== "closed" &&
    typeof resolutionDue === "number" &&
    !Number.isNaN(resolutionDue) &&
    now > resolutionDue;

  const escalationLevel = resolutionBreached ? "critical" : firstResponseBreached ? "warning" : "none";

  return {
    firstResponseBreached,
    resolutionBreached,
    escalationLevel,
  };
};

const toDto = (row: TicketRow) => ({
  ...(Array.isArray(row.companies)
    ? {
        companyName: row.companies[0]?.name ?? null,
        companySlug: row.companies[0]?.public_slug ?? null,
      }
    : {
        companyName: row.companies?.name ?? null,
        companySlug: row.companies?.public_slug ?? null,
      }),
  id: row.id,
  companyId: row.company_id,
  createdByEmail: row.created_by_email,
  source: row.source,
  subject: row.subject,
  description: row.description,
  category: row.category,
  priority: row.priority,
  status: row.status,
  assignedTo: row.assigned_to,
  firstResponseAt: row.first_response_at,
  resolvedAt: row.resolved_at,
  firstResponseDueAt: row.first_response_due_at,
  resolutionDueAt: row.resolution_due_at,
  sla: computeSla(row),
  lastMessageAt: row.last_message_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

async function validateSuperAdminRead() {
  const result = await validateAdminRolesOnServer([...SAAS_READ_ROLES]);
  if (!result.ok) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: result.error ?? "No autorizado" }, { status: result.status }),
    };
  }

  return { ok: true as const, email: result.email ?? null };
}

async function validateSuperAdminMutate() {
  const result = await validateAdminRolesOnServer([...SAAS_MUTATE_ROLES]);
  if (!result.ok) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: result.error ?? "No autorizado" }, { status: result.status }),
    };
  }

  return { ok: true as const, email: result.email ?? null };
}

export async function GET(req: NextRequest) {
  const access = await validateSuperAdminRead();
  if (!access.ok) return access.response;

  const searchParams = req.nextUrl.searchParams;
  const status = String(searchParams.get("status") ?? "").trim().toLowerCase();
  const priority = String(searchParams.get("priority") ?? "").trim().toLowerCase();
  const companyId = String(searchParams.get("companyId") ?? "").trim();
  const q = String(searchParams.get("q") ?? "").trim();

  let query = supabaseAdmin
    .from("saas_tickets")
    .select("id,company_id,created_by_email,source,subject,description,category,priority,status,assigned_to,first_response_at,resolved_at,first_response_due_at,resolution_due_at,last_message_at,created_at,updated_at,companies(id,name,public_slug)")
    .order("last_message_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (STATUS_VALUES.has(status)) query = query.eq("status", status);
  if (PRIORITY_VALUES.has(priority)) query = query.eq("priority", priority);
  if (companyId) query = query.eq("company_id", companyId);
  if (q) query = query.or(`subject.ilike.%${q}%,description.ilike.%${q}%,created_by_email.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ tickets: ((data ?? []) as TicketRow[]).map(toDto) });
}

export async function POST(req: NextRequest) {
  const access = await validateSuperAdminMutate();
  if (!access.ok) return access.response;

  const body = await req.json();
  const companyId = sanitizeServerText(String(body.companyId ?? ""));
  const subject = sanitizeServerText(String(body.subject ?? ""));
  const description = sanitizeServerText(String(body.description ?? ""));
  const category = String(body.category ?? "general").trim().toLowerCase();
  const priority = String(body.priority ?? "medium").trim().toLowerCase() as TicketPriority;
  const assignedTo = String(body.assignedTo ?? "").trim() || null;

  if (!companyId) return NextResponse.json({ error: "Falta companyId" }, { status: 400 });
  if (!subject) return NextResponse.json({ error: "El asunto es obligatorio" }, { status: 400 });
  if (!description) return NextResponse.json({ error: "La descripción es obligatoria" }, { status: 400 });
  if (!CATEGORY_VALUES.has(category)) return NextResponse.json({ error: "Categoría inválida" }, { status: 400 });
  if (!PRIORITY_VALUES.has(priority)) return NextResponse.json({ error: "Prioridad inválida" }, { status: 400 });

  const nowIso = new Date().toISOString();
  const { firstResponse, resolution } = SLA_HOURS[priority];

  const { data, error } = await supabaseAdmin
    .from("saas_tickets")
    .insert({
      company_id: companyId,
      created_by_email: access.email ?? "super-admin@local",
      source: "saas",
      subject,
      description,
      category,
      priority,
      status: "open",
      assigned_to: assignedTo,
      first_response_due_at: addHours(nowIso, firstResponse),
      resolution_due_at: addHours(nowIso, resolution),
      last_message_at: nowIso,
      updated_at: nowIso,
    })
    .select("id,company_id,created_by_email,source,subject,description,category,priority,status,assigned_to,first_response_at,resolved_at,first_response_due_at,resolution_due_at,last_message_at,created_at,updated_at,companies(id,name,public_slug)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabaseAdmin.from("saas_ticket_messages").insert({
    ticket_id: (data as TicketRow).id,
    author_type: "super_admin",
    author_email: access.email,
    is_internal: false,
    message: description,
  });

  return NextResponse.json({ success: true, ticket: toDto(data as TicketRow) });
}

export async function PUT(req: NextRequest) {
  const access = await validateSuperAdminMutate();
  if (!access.ok) return access.response;

  const body = await req.json();
  const id = sanitizeServerText(String(body.id ?? ""));
  const status = sanitizeServerText(String(body.status ?? "")).toLowerCase();
  const assignedTo = sanitizeServerText(String(body.assignedTo ?? "")) || null;
  const responseMessage = sanitizeServerText(String(body.responseMessage ?? ""));
  const internalNote = Boolean(body.internalNote ?? false);

  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });
  if (status && !STATUS_VALUES.has(status)) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("saas_tickets")
    .select("id,status,first_response_at")
    .eq("id", id)
    .maybeSingle();

  if (existingError || !existing) {
    return NextResponse.json({ error: existingError?.message || "Ticket no encontrado" }, { status: 404 });
  }

  const nowIso = new Date().toISOString();
  const nextStatus = (status || existing.status) as TicketStatus;

  const patch: Record<string, unknown> = {
    assigned_to: assignedTo,
    updated_at: nowIso,
  };

  if (status) patch.status = nextStatus;

  if (!existing.first_response_at && (responseMessage || nextStatus === "in_progress" || nextStatus === "waiting_customer" || nextStatus === "resolved" || nextStatus === "closed")) {
    patch.first_response_at = nowIso;
  }

  if ((nextStatus === "resolved" || nextStatus === "closed") && !patch.resolved_at) {
    patch.resolved_at = nowIso;
  }

  if (nextStatus === "open" || nextStatus === "in_progress" || nextStatus === "waiting_customer") {
    patch.resolved_at = null;
  }

  if (responseMessage) {
    patch.last_message_at = nowIso;
  }

  const { data, error } = await supabaseAdmin
    .from("saas_tickets")
    .update(patch)
    .eq("id", id)
    .select("id,company_id,created_by_email,source,subject,description,category,priority,status,assigned_to,first_response_at,resolved_at,first_response_due_at,resolution_due_at,last_message_at,created_at,updated_at,companies(id,name,public_slug)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (responseMessage) {
    await supabaseAdmin.from("saas_ticket_messages").insert({
      ticket_id: id,
      author_type: "super_admin",
      author_email: access.email,
      is_internal: internalNote,
      message: responseMessage,
    });
  }

  return NextResponse.json({ success: true, ticket: toDto(data as TicketRow) });
}
