import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { parseJsonBody } from "@/lib/api/response";
import { tenantTicketCreateSchema } from "@/lib/api/schemas/tenant/tickets";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { createSupabaseServerClient } from "@/utils/supabase/server";

type TicketStatus = "open" | "in_progress" | "waiting_customer" | "resolved" | "closed";
type TicketPriority = "low" | "medium" | "high" | "critical";
type TicketCategory = "general" | "billing" | "technical" | "product" | "account";

type MessageError = { message: string } | null;

type TenantUserRow = {
  id: string;
  company_id: string;
  role: string;
};

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
};

const TENANT_ALLOWED_ROLES = new Set(["admin", "ceo", "cashier", "staff"]);

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

async function getTenantContext(client: SupabaseClient) {
  const supabase = await createSupabaseServerClient("tenant");
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    return { error: "No autenticado" };
  }

  const email = user.email.trim().toLowerCase();
  const { data: rows, error } = await client
    .from("users")
    .select("id,company_id,role")
    .ilike("email", email) as { data: TenantUserRow[] | null; error: MessageError };

  if (error) return { error: error.message };

  const userRow = (rows ?? []).find((row) => TENANT_ALLOWED_ROLES.has(String(row.role || "").toLowerCase()));

  if (!userRow?.company_id) {
    return { error: "No tienes permisos de panel tenant" };
  }

  return {
    companyId: userRow.company_id,
    email,
  };
}

const toDto = (row: TicketRow) => ({
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
  lastMessageAt: row.last_message_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export async function GET() {
  try {
    const ctx = await getTenantContext(supabaseAdmin);

    if ("error" in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("saas_tickets")
      .select("id,company_id,created_by_email,source,subject,description,category,priority,status,assigned_to,first_response_at,resolved_at,first_response_due_at,resolution_due_at,last_message_at,created_at,updated_at")
      .eq("company_id", ctx.companyId)
      .order("last_message_at", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ tickets: ((data ?? []) as TicketRow[]).map(toDto) });
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

    const parsed = await parseJsonBody(req, tenantTicketCreateSchema);
    if (!parsed.ok) return parsed.response;

    const { subject, description, category, priority } = parsed.data;
    const nowIso = new Date().toISOString();
    const { firstResponse, resolution } = SLA_HOURS[priority];

    const { data, error } = await supabaseAdmin
      .from("saas_tickets")
      .insert({
        company_id: ctx.companyId,
        created_by_email: ctx.email,
        source: "tenant",
        subject,
        description,
        category,
        priority,
        status: "open",
        first_response_due_at: addHours(nowIso, firstResponse),
        resolution_due_at: addHours(nowIso, resolution),
        last_message_at: nowIso,
        updated_at: nowIso,
      })
      .select("id,company_id,created_by_email,source,subject,description,category,priority,status,assigned_to,first_response_at,resolved_at,first_response_due_at,resolution_due_at,last_message_at,created_at,updated_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await supabaseAdmin.from("saas_ticket_messages").insert({
      ticket_id: (data as TicketRow).id,
      author_type: "tenant",
      author_email: ctx.email,
      is_internal: false,
      message: description,
    });

    return NextResponse.json({ success: true, ticket: toDto(data as TicketRow) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error en el servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
