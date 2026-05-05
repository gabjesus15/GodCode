import { NextRequest, NextResponse } from "next/server";

import { sendLandingWebhookTestById, type LandingWebhookEvent } from "@/lib/integrations/landing-webhook";
import { SAAS_MUTATE_ROLES, validateAdminRolesOnServer } from "../../../../../../utils/admin/server-auth";

const EVENT_VALUES = new Set<LandingWebhookEvent>(["lead.created", "contact.created"]);

export async function POST(req: NextRequest) {
  const access = await validateAdminRolesOnServer([...SAAS_MUTATE_ROLES]);
  if (!access.ok) {
    return NextResponse.json({ error: access.error ?? "No autorizado" }, { status: access.status });
  }

  const body = await req.json().catch(() => ({} as { id?: string; event?: string }));
  const id = String(body.id ?? "").trim();
  const eventRaw = String(body.event ?? "lead.created").trim() as LandingWebhookEvent;
  const event: LandingWebhookEvent = EVENT_VALUES.has(eventRaw) ? eventRaw : "lead.created";

  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  try {
    await sendLandingWebhookTestById(id, event);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No se pudo enviar prueba" },
      { status: 400 },
    );
  }
}
