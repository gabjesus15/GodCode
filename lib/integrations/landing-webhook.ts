import "server-only";

import { supabaseAdmin } from "../infra/supabase-admin";

export type LandingWebhookEvent = "lead.created" | "contact.created";

type LandingWebhookRow = {
  id: string;
  name: string;
  destination_type: "slack" | "email";
  url: string;
  events: string[] | null;
  is_active: boolean;
  secret: string | null;
};

type NotifyPayload = {
  id?: string;
  email?: string | null;
  name?: string | null;
  message?: string | null;
  createdAt?: string;
  source?: string;
};

type LandingWebhookSubscription = {
  id: string;
  name: string;
  destinationType: "slack" | "email";
  url: string;
  events: string[];
  isActive: boolean;
  secret: string | null;
};

function buildSlackPayload(event: LandingWebhookEvent, payload: NotifyPayload) {
  const title = event === "lead.created" ? "Nuevo lead de landing" : "Nuevo contacto de landing";
  const lines = [
    payload.email ? `Email: ${payload.email}` : null,
    payload.name ? `Nombre: ${payload.name}` : null,
    payload.source ? `Source: ${payload.source}` : null,
    payload.message ? `Mensaje: ${payload.message}` : null,
    payload.id ? `ID: ${payload.id}` : null,
  ].filter(Boolean);

  return {
    text: `${title}${lines.length ? `\n${lines.join("\n")}` : ""}`,
  };
}

async function sendToLandingWebhook(
  row: LandingWebhookSubscription,
  event: LandingWebhookEvent,
  payload: NotifyPayload,
): Promise<void> {
  const body =
    row.destinationType === "slack"
      ? buildSlackPayload(event, payload)
      : {
          event,
          destinationType: row.destinationType,
          payload,
          sentAt: new Date().toISOString(),
        };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (row.secret?.trim()) {
    headers["x-landing-webhook-secret"] = row.secret.trim();
  }

  const res = await fetch(row.url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Webhook respondió ${res.status}`);
  }
}

export async function sendLandingWebhookTestById(
  id: string,
  event: LandingWebhookEvent = "lead.created",
): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("landing_webhook_subscriptions")
    .select("id,name,destination_type,url,events,is_active,secret")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Webhook no encontrado");

  const row: LandingWebhookSubscription = {
    id: data.id,
    name: data.name,
    destinationType: data.destination_type,
    url: data.url,
    events: Array.isArray(data.events) ? data.events : [],
    isActive: Boolean(data.is_active),
    secret: data.secret,
  };

  if (!row.isActive) throw new Error("Webhook inactivo");

  await sendToLandingWebhook(row, event, {
    id: `test-${Date.now()}`,
    name: "Lead de prueba",
    email: "test@godcode.me",
    message: "Mensaje de prueba generado desde super-admin.",
    source: "landing_test",
    createdAt: new Date().toISOString(),
  });
}

export async function notifyLandingWebhooks(
  event: LandingWebhookEvent,
  payload: NotifyPayload,
): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("landing_webhook_subscriptions")
    .select("id,name,destination_type,url,events,is_active,secret")
    .eq("is_active", true);

  if (error) {
    console.error("[notifyLandingWebhooks:list]", error.message);
    return;
  }

  const rows = ((data ?? []) as LandingWebhookRow[]).filter((row) =>
    Array.isArray(row.events) ? row.events.includes(event) : false,
  );

  await Promise.all(
    rows.map(async (row) => {
      try {
        await sendToLandingWebhook(
          {
            id: row.id,
            name: row.name,
            destinationType: row.destination_type,
            url: row.url,
            events: Array.isArray(row.events) ? row.events : [],
            isActive: row.is_active,
            secret: row.secret,
          },
          event,
          payload,
        );
      } catch (sendErr) {
        console.error("[notifyLandingWebhooks:error]", row.name, sendErr);
      }
    }),
  );
}
