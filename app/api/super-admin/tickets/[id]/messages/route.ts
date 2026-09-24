import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { SAAS_MUTATE_ROLES, SAAS_READ_ROLES, validateSuperAdminAccess } from "@/utils/admin/server-auth";
import { cleanMultilineText } from "@/lib/infra/server-sanitize";

/** @service-role super-admin */

type MessageRow = {
  id: string;
  ticket_id: string;
  author_type: "tenant" | "super_admin" | "system";
  author_email: string | null;
  is_internal: boolean;
  message: string;
  created_at: string;
};

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const access = await validateSuperAdminAccess(SAAS_READ_ROLES);
  if (!access.ok) return access.response;

  const params = await context.params;
  const ticketId = String(params.id ?? "").trim();
  if (!ticketId) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("saas_ticket_messages")
    .select("id,ticket_id,author_type,author_email,is_internal,message,created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ messages: (data ?? []) as MessageRow[] });
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const access = await validateSuperAdminAccess(SAAS_MUTATE_ROLES);
  if (!access.ok) return access.response;

  const params = await context.params;
  const ticketId = String(params.id ?? "").trim();
  if (!ticketId) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  const body = await req.json();
  const message = cleanMultilineText(String(body.message ?? ""));
  const isInternal = Boolean(body.isInternal ?? false);

  if (!message) return NextResponse.json({ error: "El mensaje es obligatorio" }, { status: 400 });

  const nowIso = new Date().toISOString();

  const { data: ticket, error: ticketError } = await supabaseAdmin
    .from("saas_tickets")
    .select("id,status,first_response_at")
    .eq("id", ticketId)
    .maybeSingle();

  if (ticketError || !ticket) {
    return NextResponse.json({ error: ticketError?.message || "Ticket no encontrado" }, { status: 404 });
  }

  const { error } = await supabaseAdmin.from("saas_ticket_messages").insert({
    ticket_id: ticketId,
    author_type: "super_admin",
    author_email: access.email,
    is_internal: isInternal,
    message,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Una nota interna no cuenta como respuesta ni reordena la conversación del cliente.
  const patch: Record<string, unknown> = {
    updated_at: nowIso,
    ...(isInternal ? {} : { last_message_at: nowIso }),
  };

  if (!ticket.first_response_at && !isInternal) {
    patch.first_response_at = nowIso;
  }

  if (!isInternal) {
    patch.status = "waiting_customer";
    patch.resolved_at = null;
  }

  await supabaseAdmin
    .from("saas_tickets")
    .update(patch)
    .eq("id", ticketId);

  return NextResponse.json({ success: true });
}
