import type { SupabaseClient } from "@supabase/supabase-js";

import { sendEmail } from "@/lib/email/send";
import { getAppUrl } from "@/lib/tenant/app-url";
import { ensureOnboardingOwnerAccess } from "./complete-onboarding-payment";
import { expireUnverifiedApplications } from "./expire-unverified";
import { captureOnboardingPayPalOrder, isChargedFailure } from "./paypal-onboarding";
import { alertOnboardingTeam } from "./team-alerts";

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
/** Lo que pasó hace menos de esto todavía puede estar en curso (la persona sigue en PayPal). */
const SETTLE_MS = 10 * MINUTE;
/** Más allá de esto una orden de PayPal aprobada ya no se puede cobrar. */
const PAYPAL_WINDOW_MS = 3 * DAY;
const OWNER_WINDOW_MS = 7 * DAY;
const MAX_ROWS = 25;
/** Avisos por corrida: si hay más, el siguiente barrido los vuelve a contar. */
const MAX_ALERTS = 5;

type Row = {
	id: string;
	status: string | null;
	payment_status: string | null;
	payment_reference: string | null;
	business_name: string | null;
	email: string | null;
	company_id: string | null;
	updated_at: string;
};

const COLUMNS = "id,status,payment_status,payment_reference,business_name,email,company_id,updated_at";

export type ReconcileSummary = {
	paypal_checked: number;
	paypal_completed: number;
	owners_checked: number;
	owners_fixed: number;
	stuck: number;
	errors: string[];
};

type Stuck = { row: Row; problem: string };

function isPayPalReference(ref: string | null): boolean {
	const value = String(ref ?? "").trim();
	return Boolean(value) && !value.startsWith("manual-") && !value.startsWith("coupon-");
}

/**
 * Barrido de altas que quedaron a medias. Antes solo se reintentaban si el cliente
 * recargaba la página de éxito; ahora corre con el cron diario y, si se programa,
 * cada hora (`/api/system/cron/onboarding-reconcile`):
 *
 * 1. Órdenes de PayPal del alta sin cerrar: si PayPal ya las aprobó o cobró, se cobran y
 *    se cierra el alta (quien aprobó y cerró la pestaña antes de volver). Las que nadie
 *    aprobó se dejan: es un pago abandonado, no un fallo.
 * 2. Cierres que se cayeron después de reclamar el pago: se retoman (PayPal) o se avisan.
 * 3. Empresas ya pagadas sin dueño o sin bienvenida: se reintenta el alta del dueño.
 *
 * Lo que sigue trabado después de reintentar se avisa al equipo por Telegram.
 */
export async function reconcileOnboarding(params: {
	supabaseAdmin: SupabaseClient;
	now?: Date;
	/** Hora límite (ms epoch): lo que no alcance se revisa en la próxima corrida. */
	deadlineMs?: number;
}): Promise<ReconcileSummary> {
	const { supabaseAdmin } = params;
	const outOfTime = () => params.deadlineMs != null && Date.now() > params.deadlineMs;
	const now = params.now ?? new Date();
	const summary: ReconcileSummary = { paypal_checked: 0, paypal_completed: 0, owners_checked: 0, owners_fixed: 0, stuck: 0, errors: [] };
	const stuck: Stuck[] = [];
	const settled = new Date(now.getTime() - SETTLE_MS).toISOString();

	// 1 y 2: pagos sin cerrar (pendientes de PayPal, o reclamados y caídos a medias).
	const { data: pending, error: pendingError } = await supabaseAdmin
		.from("onboarding_applications")
		.select(COLUMNS)
		.in("status", ["form_completed", "payment_pending"])
		.in("payment_status", ["pending", "paid"])
		.lt("updated_at", settled)
		.gt("updated_at", new Date(now.getTime() - PAYPAL_WINDOW_MS).toISOString())
		.order("updated_at", { ascending: true })
		.limit(MAX_ROWS);
	if (pendingError) summary.errors.push(`pendientes: ${pendingError.message}`);

	for (const row of (pending ?? []) as Row[]) {
		if (outOfTime()) break;
		const paid = String(row.payment_status ?? "") === "paid";
		if (!isPayPalReference(row.payment_reference)) {
			// Un pago manual o con cupón reclamado que no terminó: lo cierra el equipo
			// volviendo a validarlo desde «Pagos por validar».
			if (paid) stuck.push({ row, problem: "El pago quedó marcado como pagado pero el alta no terminó. Vuelve a validarlo desde «Pagos por validar»." });
			continue;
		}
		summary.paypal_checked += 1;
		const orderId = String(row.payment_reference);
		const result = await captureOnboardingPayPalOrder({ supabaseAdmin, orderId });
		if (result.ok) {
			summary.paypal_completed += 1;
			continue;
		}
		if (isChargedFailure(result.code) || paid) {
			stuck.push({ row, problem: `PayPal cobró pero el alta no se cerró (orden ${orderId}): ${result.error}` });
		} else if (result.code === "paypal_unavailable") {
			summary.errors.push(`PayPal no respondió para la orden ${orderId}`);
		}
		// `not_completed` y el resto: nadie aprobó el pago, no hay nada que cerrar.
	}

	// 3: empresas activas cuyo dueño no quedó dado de alta o no recibió la bienvenida.
	const { data: owners, error: ownersError } = await supabaseAdmin
		.from("onboarding_applications")
		.select(COLUMNS)
		.eq("status", "active")
		.eq("payment_status", "paid")
		.not("company_id", "is", null)
		.is("welcome_email_sent_at", null)
		.lt("updated_at", settled)
		.gt("updated_at", new Date(now.getTime() - OWNER_WINDOW_MS).toISOString())
		.order("updated_at", { ascending: true })
		.limit(MAX_ROWS);
	if (ownersError) summary.errors.push(`dueños: ${ownersError.message}`);

	for (const row of (owners ?? []) as Row[]) {
		if (outOfTime()) break;
		if (!row.payment_reference) continue;
		summary.owners_checked += 1;
		const access = await ensureOnboardingOwnerAccess({ supabaseAdmin, paymentReference: row.payment_reference, now });
		if (access.status === "paid" && access.ownerReady && access.welcomeSent) {
			summary.owners_fixed += 1;
			continue;
		}
		stuck.push({
			row,
			problem:
				access.status === "paid" && access.ownerReady
					? "La empresa está activa pero el correo de bienvenida no salió. Reenvía el acceso desde la ficha de la empresa."
					: "La empresa está activa pero el dueño no tiene usuario. Créalo desde la ficha de la empresa.",
		});
	}

	summary.stuck = stuck.length;
	for (const item of stuck.slice(0, MAX_ALERTS)) {
		await alertOnboardingTeam({
			kind: "needs_attention",
			businessName: item.row.business_name ?? "",
			email: item.row.email,
			problem: item.problem,
			detail: "Lo detectó el barrido automático; se vuelve a revisar en la próxima corrida.",
		});
	}
	return summary;
}

export type VerificationJobsSummary = { reminders_sent: number; expired_ok: boolean; error?: string };

/**
 * Recordatorio a quien se registró y no confirmó el correo (al día 1 y al día 3), y
 * borrado de las solicitudes sin confirmar de más de 7 días. El borrado existía pero no
 * estaba en ningún cron: solo corría si alguien llamaba la ruta a mano.
 */
export async function runVerificationJobs(params: { supabaseAdmin: SupabaseClient; now?: Date }): Promise<VerificationJobsSummary> {
	const { supabaseAdmin } = params;
	const now = params.now ?? new Date();
	let remindersSent = 0;

	const { data, error } = await supabaseAdmin
		.from("onboarding_applications")
		.select("id,email,business_name,responsible_name,verification_token,created_at")
		.eq("status", "pending_verification")
		.lt("created_at", new Date(now.getTime() - DAY).toISOString())
		.gt("created_at", new Date(now.getTime() - 4 * DAY).toISOString())
		.limit(MAX_ROWS);

	const appUrl = getAppUrl();
	for (const row of (data ?? []) as Array<{
		id: string;
		email: string;
		business_name: string | null;
		responsible_name: string | null;
		verification_token: string | null;
		created_at: string;
	}>) {
		if (!row.verification_token) continue;
		const ageDays = (now.getTime() - new Date(row.created_at).getTime()) / DAY;
		const attempt = ageDays < 2 ? 1 : ageDays >= 3 ? 2 : null;
		if (attempt == null) continue;
		const sent = await sendEmail({
			kind: "verify_email",
			to: row.email,
			applicationId: row.id,
			dedupeKey: `verify-reminder:${row.id}:${attempt}`,
			// Sin registro de envíos no hay forma de no repetirlo cada día.
			whenLedgerUnavailable: "skip",
			client: supabaseAdmin,
			data: {
				name: row.responsible_name ?? "",
				businessName: row.business_name ?? "",
				verifyUrl: `${appUrl}/onboarding/verify/${row.verification_token}`,
			},
		});
		if (sent.status === "sent") remindersSent += 1;
	}

	const expired = await expireUnverifiedApplications(supabaseAdmin, now);
	const problems = [error?.message, expired.ok ? null : expired.error].filter(Boolean);
	return {
		reminders_sent: remindersSent,
		expired_ok: expired.ok,
		...(problems.length ? { error: problems.join(" · ") } : {}),
	};
}
