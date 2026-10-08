import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";

import { createSecretBox, secretLast4 } from "./secret-box";

/**
 * Resend propio de una empresa con dominio propio, para los cupones que manda a sus
 * clientes desde el panel (Edge Function `coupon-emails` en GodCode-Panel).
 *
 * Vive en `company_email_senders` (RLS sin políticas, solo service role). La API key
 * se guarda sellada con `secret-box` y `EMAIL_SENDER_SECRET_KEY`, la misma llave que
 * tiene la Edge Function. Aquí la usa el super admin cuando el dueño no sabe
 * configurarlo: se guarda solo si el correo de prueba sale.
 */

const TABLE = "company_email_senders";
const RESEND_API = "https://api.resend.com/emails";
const EMAIL_RE = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]+$/;

export type CompanySenderStatus = {
	fromEmail: string;
	fromName: string;
	replyTo: string;
	apiKeyLast4: string;
	verifiedAt: string | null;
	lastError: string | null;
	updatedBy: string | null;
	updatedAt: string | null;
};

export type SaveCompanySenderInput = {
	companyId: string;
	/** Vacía: se reusa la guardada (para cambiar solo el remitente). */
	apiKey?: string;
	fromEmail: string;
	fromName?: string;
	replyTo?: string;
	/** A quién va el correo de prueba: quien está configurando. */
	testTo: string;
	actorEmail: string;
};

export type SaveCompanySenderResult = { ok: true } | { ok: false; status: number; error: string };

function db(client?: SupabaseClient): SupabaseClient {
	return client ?? supabaseAdmin;
}

export function isValidSenderEmail(value: unknown): value is string {
	return typeof value === "string" && EMAIL_RE.test(value.trim());
}

/** El nombre va entre comillas en el encabezado «De:»: sin comillas, saltos ni `<>`. */
export function cleanSenderName(value: string): string {
	return value.replace(/["<>\\\r\n\t]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export async function getCompanySender(companyId: string, client?: SupabaseClient): Promise<CompanySenderStatus | null> {
	const { data, error } = await db(client)
		.from(TABLE)
		.select("from_email, from_name, reply_to, api_key_last4, verified_at, last_error, updated_by, updated_at")
		.eq("company_id", companyId)
		.maybeSingle();
	if (error) throw new Error(error.message);
	if (!data) return null;
	const row = data as Record<string, string | null>;
	return {
		fromEmail: row.from_email ?? "",
		fromName: row.from_name ?? "",
		replyTo: row.reply_to ?? "",
		apiKeyLast4: row.api_key_last4 ?? "",
		verifiedAt: row.verified_at ?? null,
		lastError: row.last_error ?? null,
		updatedBy: row.updated_by ?? null,
		updatedAt: row.updated_at ?? null,
	};
}

export async function saveCompanySender(
	input: SaveCompanySenderInput,
	client?: SupabaseClient,
): Promise<SaveCompanySenderResult> {
	const fromEmail = input.fromEmail.trim().toLowerCase();
	const fromName = cleanSenderName(input.fromName ?? "");
	const replyTo = (input.replyTo ?? "").trim().toLowerCase();
	const newKey = (input.apiKey ?? "").trim();
	if (!isValidSenderEmail(fromEmail)) return { ok: false, status: 400, error: "El correo remitente no es válido" };
	if (replyTo && !isValidSenderEmail(replyTo)) return { ok: false, status: 400, error: "El correo para respuestas no es válido" };
	if (newKey && !/^re_[A-Za-z0-9_]{8,}$/.test(newKey)) {
		return { ok: false, status: 400, error: "La API key de Resend empieza con «re_»" };
	}
	if (!isValidSenderEmail(input.testTo)) return { ok: false, status: 400, error: "No hay a quién mandar la prueba" };

	let box;
	try {
		box = await createSecretBox(process.env.EMAIL_SENDER_SECRET_KEY ?? "");
	} catch {
		return { ok: false, status: 503, error: "Falta EMAIL_SENDER_SECRET_KEY en el servidor" };
	}

	const { data: current, error: loadError } = await db(client)
		.from(TABLE)
		.select("api_key_sealed, api_key_last4")
		.eq("company_id", input.companyId)
		.maybeSingle();
	if (loadError) return { ok: false, status: 500, error: loadError.message };
	const saved = current as { api_key_sealed: string; api_key_last4: string | null } | null;
	if (!newKey && !saved) return { ok: false, status: 400, error: "Falta la API key de Resend" };

	let apiKey = newKey;
	if (!apiKey) {
		try {
			apiKey = await box.open(saved!.api_key_sealed);
		} catch {
			return { ok: false, status: 400, error: "La key guardada no se puede abrir: vuelve a pegarla" };
		}
	}

	const from = fromName ? `"${fromName}" <${fromEmail}>` : fromEmail;
	const text = `Este es un correo de prueba. Si te llegó, los cupones de este negocio van a salir desde ${from}.`;
	let res: Response;
	try {
		res = await fetch(RESEND_API, {
			method: "POST",
			headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
			body: JSON.stringify({
				from,
				to: input.testTo.trim(),
				subject: "Prueba de correo de cupones",
				text,
				html: `<p>${text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`,
				...(replyTo ? { reply_to: replyTo } : {}),
				tags: [{ name: "kind", value: "sender_test" }],
			}),
		});
	} catch (err) {
		return { ok: false, status: 502, error: err instanceof Error ? err.message : "No se pudo contactar a Resend" };
	}
	if (!res.ok) {
		const body = (await res.json().catch(() => ({}))) as { message?: string };
		return { ok: false, status: 400, error: `Resend no envió la prueba: ${body.message || `respondió ${res.status}`}` };
	}

	const nowIso = new Date().toISOString();
	const { error } = await db(client)
		.from(TABLE)
		.upsert(
			{
				company_id: input.companyId,
				provider: "resend",
				api_key_sealed: newKey ? await box.seal(newKey) : saved!.api_key_sealed,
				api_key_last4: newKey ? secretLast4(newKey) : saved!.api_key_last4 ?? "",
				from_email: fromEmail,
				from_name: fromName,
				reply_to: replyTo || null,
				verified_at: nowIso,
				last_error: null,
				updated_by: input.actorEmail,
				updated_at: nowIso,
			},
			{ onConflict: "company_id" },
		);
	if (error) return { ok: false, status: 500, error: error.message };
	return { ok: true };
}

export async function deleteCompanySender(companyId: string, client?: SupabaseClient): Promise<void> {
	const { error } = await db(client).from(TABLE).delete().eq("company_id", companyId);
	if (error) throw new Error(error.message);
}
