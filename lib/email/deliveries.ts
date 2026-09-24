import type { SupabaseClient } from "@supabase/supabase-js";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";

/**
 * Registro de correos enviados (`email_deliveries`, migración 20260924_email_deliveries).
 *
 * Sirve para dos cosas: que un recordatorio no salga dos veces (la `dedupe_key` es única)
 * y que el super admin vea qué se le mandó a cada negocio. Para reservar un envío se
 * inserta primero la fila (`sending`) y solo si entra se manda el correo: si el cron corre
 * dos veces a la vez, el segundo choca con la clave y no envía nada.
 */

export type DeliveryClaim =
	| { ok: true; id: string }
	| { ok: false; reason: "duplicate" }
	| { ok: false; reason: "unavailable"; error: string };

export type DeliveryRow = {
	id: string;
	kind: string;
	recipient: string;
	subject: string;
	status: "sending" | "sent" | "failed" | "skipped";
	error: string | null;
	created_at: string;
	sent_at: string | null;
};

const TABLE = "email_deliveries";

function db(client?: SupabaseClient): SupabaseClient {
	return client ?? supabaseAdmin;
}

export async function claimDelivery(
	params: {
		kind: string;
		recipient: string;
		subject: string;
		companyId?: string | null;
		applicationId?: string | null;
		dedupeKey?: string | null;
		metadata?: Record<string, unknown>;
	},
	client?: SupabaseClient,
): Promise<DeliveryClaim> {
	const { data, error } = await db(client)
		.from(TABLE)
		.insert({
			kind: params.kind,
			recipient: params.recipient,
			subject: params.subject.slice(0, 300),
			company_id: params.companyId ?? null,
			application_id: params.applicationId ?? null,
			dedupe_key: params.dedupeKey ?? null,
			status: "sending",
			metadata: params.metadata ?? {},
		})
		.select("id")
		.single();
	if (error) {
		if (error.code === "23505") return { ok: false, reason: "duplicate" };
		return { ok: false, reason: "unavailable", error: error.message };
	}
	return { ok: true, id: String((data as { id: string }).id) };
}

export async function finishDelivery(
	id: string,
	result: { status: "sent"; providerId?: string | null } | { status: "failed" | "skipped"; error: string },
	client?: SupabaseClient,
): Promise<void> {
	const nowIso = new Date().toISOString();
	const patch =
		result.status === "sent"
			? { status: "sent", sent_at: nowIso, provider_message_id: result.providerId ?? null, error: null }
			: // Un envío fallido libera la clave: el próximo cron puede reintentarlo.
				{ status: result.status, error: result.error.slice(0, 500), dedupe_key: null };
	const { error } = await db(client).from(TABLE).update(patch).eq("id", id);
	if (error) console.error("email_deliveries update:", error.message);
}

/** ¿Ya salió (o está saliendo) un correo con esta clave? Solo lectura, para la vista previa. */
export async function findDeliveredKeys(keys: string[], client?: SupabaseClient): Promise<Set<string> | null> {
	if (keys.length === 0) return new Set();
	const { data, error } = await db(client).from(TABLE).select("dedupe_key").in("dedupe_key", keys);
	if (error) return null;
	return new Set(((data ?? []) as Array<{ dedupe_key: string | null }>).map((row) => String(row.dedupe_key)));
}

export async function listCompanyDeliveries(companyId: string, limit = 30, client?: SupabaseClient): Promise<DeliveryRow[] | null> {
	const { data, error } = await db(client)
		.from(TABLE)
		.select("id,kind,recipient,subject,status,error,created_at,sent_at")
		.eq("company_id", companyId)
		.order("created_at", { ascending: false })
		.limit(limit);
	if (error) return null;
	return (data ?? []) as DeliveryRow[];
}

export async function listRecentDeliveries(limit = 50, client?: SupabaseClient): Promise<(DeliveryRow & { company_id: string | null })[] | null> {
	const { data, error } = await db(client)
		.from(TABLE)
		.select("id,kind,recipient,subject,status,error,created_at,sent_at,company_id")
		.order("created_at", { ascending: false })
		.limit(limit);
	if (error) return null;
	return (data ?? []) as (DeliveryRow & { company_id: string | null })[];
}
