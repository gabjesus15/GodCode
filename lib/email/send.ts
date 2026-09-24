import type { SupabaseClient } from "@supabase/supabase-js";

import { getEmailBrand } from "./brand";
import { claimDelivery, finishDelivery } from "./deliveries";
import { renderEmail } from "./render";
import { buildEmailContent, type EmailKind, type EmailTemplates } from "./templates";

/**
 * Único punto de salida de correos (Resend). Arma el contenido, lo registra en
 * `email_deliveries` y lo envía con versión HTML y texto, respuesta al soporte y una
 * clave de idempotencia para que Resend tampoco lo duplique.
 *
 * Variables: RESEND_API_KEY, RESEND_FROM («Gcode POS <hola@dominio>» o solo la dirección;
 * sin nombre se antepone el del producto).
 */

const RESEND_API = "https://api.resend.com/emails";

export type SendEmailInput<K extends EmailKind> = {
	kind: K;
	to: string;
	data: EmailTemplates[K];
	companyId?: string | null;
	applicationId?: string | null;
	/** Si ya salió un correo con esta clave, no se manda otro. */
	dedupeKey?: string;
	/**
	 * Qué hacer si no se puede registrar el envío (p. ej. falta la tabla): los avisos de un
	 * hecho puntual salen igual (`send`); los recordatorios del cron no (`skip`), porque
	 * sin registro no hay forma de evitar mandarlos todos los días.
	 */
	whenLedgerUnavailable?: "send" | "skip";
	metadata?: Record<string, unknown>;
	/** Antepuesto al asunto (p. ej. «[Prueba] » en los envíos de prueba del super admin). */
	subjectPrefix?: string;
	client?: SupabaseClient;
};

export type SendEmailResult =
	| { status: "sent"; id?: string }
	| { status: "duplicate" }
	| { status: "skipped"; reason: string }
	| { status: "failed"; error: string };

export function resolveFromAddress(raw: string | undefined, product = getEmailBrand().product): string {
	const from = String(raw ?? "").trim();
	if (!from) return "";
	return from.includes("<") ? from : `${product} <${from}>`;
}

function isValidEmail(value: string): boolean {
	return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
}

/** Etiquetas de Resend: solo letras, números, guion y guion bajo. */
function tag(name: string, value: string): { name: string; value: string } {
	return { name, value: value.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 256) };
}

export async function sendEmail<K extends EmailKind>(input: SendEmailInput<K>): Promise<SendEmailResult> {
	const to = String(input.to ?? "").trim();
	if (!isValidEmail(to)) return { status: "skipped", reason: "Destinatario inválido" };

	const apiKey = process.env.RESEND_API_KEY?.trim() ?? "";
	const from = resolveFromAddress(process.env.RESEND_FROM);
	if (!apiKey || !from) return { status: "skipped", reason: "Correo no configurado (RESEND_API_KEY / RESEND_FROM)" };

	const brand = getEmailBrand();
	const content = buildEmailContent(input.kind, input.data);
	const rendered = renderEmail(input.subjectPrefix ? { ...content, subject: `${input.subjectPrefix}${content.subject}` } : content, brand);

	const claim = await claimDelivery(
		{
			kind: input.kind,
			recipient: to,
			subject: rendered.subject,
			companyId: input.companyId,
			applicationId: input.applicationId,
			dedupeKey: input.dedupeKey,
			metadata: input.metadata,
		},
		input.client,
	);
	if (!claim.ok && claim.reason === "duplicate") return { status: "duplicate" };
	if (!claim.ok && (input.whenLedgerUnavailable ?? "send") === "skip") {
		return { status: "skipped", reason: `Sin registro de envíos: ${claim.error}` };
	}
	const deliveryId = claim.ok ? claim.id : null;

	try {
		const res = await fetch(RESEND_API, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
				...(input.dedupeKey ? { "Idempotency-Key": input.dedupeKey.slice(0, 256) } : {}),
			},
			body: JSON.stringify({
				from,
				to,
				subject: rendered.subject,
				html: rendered.html,
				text: rendered.text,
				reply_to: brand.replyTo,
				tags: [tag("kind", input.kind)],
			}),
		});
		const payload = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
		if (!res.ok) {
			const error = payload.message || `Resend respondió ${res.status}`;
			if (deliveryId) await finishDelivery(deliveryId, { status: "failed", error }, input.client);
			return { status: "failed", error };
		}
		if (deliveryId) await finishDelivery(deliveryId, { status: "sent", providerId: payload.id ?? null }, input.client);
		return { status: "sent", id: payload.id };
	} catch (err) {
		const error = err instanceof Error ? err.message : "Error de red al enviar";
		if (deliveryId) await finishDelivery(deliveryId, { status: "failed", error }, input.client);
		return { status: "failed", error };
	}
}

/** Bandeja del equipo para los avisos internos: ONBOARDING_TEAM_EMAIL o, si falta, la de soporte. */
export function teamInbox(): string {
	return process.env.ONBOARDING_TEAM_EMAIL?.trim() || getEmailBrand().supportEmail;
}
