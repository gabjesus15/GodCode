import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { parseJsonBody } from "@/lib/api/response";
import { tenantTicketMessageBodySchema } from "@/lib/api/schemas/tenant/tickets";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { createSupabaseServerClient } from "@/utils/supabase/server";

type MessageError = { message: string } | null;

type TenantUserRow = {
  company_id: string;
  role: string;
};

type MessageRow = {
  id: string;
  ticket_id: string;
  author_type: "tenant" | "super_admin" | "system";
  author_email: string | null;
  is_internal: boolean;
  message: string;
  created_at: string;
};

const TENANT_ALLOWED_ROLES = new Set(["admin", "ceo", "cashier", "staff"]);

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
    .select("company_id,role")
    .ilike("email", email) as { data: TenantUserRow[] | null; error: MessageError };

  if (error) return { error: error.message };

  const userRow = (rows ?? []).find((row) => TENANT_ALLOWED_ROLES.has(String(row.role || "").toLowerCase()));
  if (!userRow?.company_id) return { error: "No tienes permisos de panel tenant" };

  return { companyId: userRow.company_id, email };
}

async function verifyTicketOwnership(client: SupabaseClient, ticketId: string, companyId: string) {
  const { data, error } = await client
    .from("saas_tickets")
    .select("id,company_id")
    .eq("id", ticketId)
    .maybeSingle();

  if (error || !data) return { error: error?.message || "Ticket no encontrado" };
  if (data.company_id !== companyId) return { error: "No autorizado para este ticket" };
  return { ok: true as const };
}

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getTenantContext(supabaseAdmin);
    if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: 403 });

    const params = await context.params;
    const ticketId = String(params.id ?? "").trim();
    if (!ticketId) return NextResponse.json({ error: "Falta id" }, { status: 400 });

    const ownership = await verifyTicketOwnership(supabaseAdmin, ticketId, ctx.companyId);
    if ("error" in ownership) return NextResponse.json({ error: ownership.error }, { status: 403 });

    const { data, error } = await supabaseAdmin
      .from("saas_ticket_messages")
      .select("id,ticket_id,author_type,author_email,is_internal,message,created_at")
      .eq("ticket_id", ticketId)
      .eq("is_internal", false)
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ messages: (data ?? []) as MessageRow[] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error en el servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getTenantContext(supabaseAdmin);
    if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: 403 });

    const params = await context.params;
    const ticketId = String(params.id ?? "").trim();
    if (!ticketId) return NextResponse.json({ error: "Falta id" }, { status: 400 });

    const ownership = await verifyTicketOwnership(supabaseAdmin, ticketId, ctx.companyId);
    if ("error" in ownership) return NextResponse.json({ error: ownership.error }, { status: 403 });

    const parsed = await parseJsonBody(req, tenantTicketMessageBodySchema);
    if (!parsed.ok) return parsed.response;
    const bodyMessage = parsed.data.message;

    const nowIso = new Date().toISOString();

    const { error } = await supabaseAdmin.from("saas_ticket_messages").insert({
      ticket_id: ticketId,
      author_type: "tenant",
      author_email: ctx.email,
      is_internal: false,
      message: bodyMessage,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await supabaseAdmin
      .from("saas_tickets")
      .update({ status: "open", resolved_at: null, last_message_at: nowIso, updated_at: nowIso })
      .eq("id", ticketId);

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error en el servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
