import type { SupabaseClient } from "@supabase/supabase-js";

import { sendEmail } from "@/lib/email/send";
import { kvStore } from "@/lib/infra/kv-store";
import { logger } from "@/lib/infra/logger";
import { getAppUrl } from "@/lib/tenant/app-url";
import { ensureOnboardingOwnerAccess } from "./complete-onboarding-payment";
import { isMissingColumnError } from "./db-compat";
import { expireUnverifiedApplications } from "./expire-unverified";
import { captureOnboardingPayPalOrder, isChargedFailure } from "./paypal-onboarding";
import { loadPanelOnlyPlanIds } from "./store-draft-service";
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
/** Un aviso por Telegram por solicitud trabada, como mucho uno al día. */
const ALERT_INTERVAL_MS = DAY;
/**
 * N: cuántas veces el barrido vuelve a cerrar un alta cobrada que se cayó (reprovisionar la
 * empresa desde la orden de PayPal). El barrido corre cada hora: si en tres intentos no se
 * arregló sola, necesita al equipo, y repetirla cada hora solo vuelve a crear empresas a
 * medias. Desde ahí solo se avisa, una vez al día. El contador vive en el KV (Upstash o
 * memoria) por 7 días: si el KV se reinicia, vuelve a tener N intentos.
 */
export const MAX_RECLAIM_ATTEMPTS = 3;
const RECLAIM_COUNTER_TTL_SECONDS = 7 * 24 * 60 * 60;

/** Columna del SQL de octubre de 2026 (marca del último aviso de altas trabadas). */
const ALERTED_COLUMN = "reconcile_alerted_at";

type Row = {
	id: string;
	status: string | null;
	payment_status: string | null;
	payment_reference: string | null;
	business_name: string | null;
	email: string | null;
	company_id: string | null;
	updated_at: string;
	reconcile_alerted_at?: string | null;
};

const COLUMNS = "id,status,payment_status,payment_reference,business_name,email,company_id,updated_at";

export type ReconcileSummary = {
	paypal_checked: number;
	paypal_completed: number;
	owners_checked: number;
	owners_fixed: number;
	stuck: number;
	/** Altas cobradas que ya llegaron al tope de reintentos: solo se avisan. */
	retries_capped: number;
	alerts_sent: number;
	/** Trabadas que ya se avisaron en las últimas 24 horas. */
	alerts_skipped: number;
	errors: string[];
};

type Stuck = { row: Row; problem: string };
type DbError = { message: string; code?: string | null };
type RowsQuery = PromiseLike<{ data: unknown; error: DbError | null }>;

function isPayPalReference(ref: string | null): boolean {
	const value = String(ref ?? "").trim();
	return Boolean(value) && !value.startsWith("manual-") && !value.startsWith("coupon-");
}

const reclaimKey = (applicationId: string) => `onboarding_reconcile:reclaim:${applicationId}`;

async function readReclaimFailures(applicationId: string): Promise<number> {
	try {
		return Number(await kvStore.get(reclaimKey(applicationId))) || 0;
	} catch {
		return 0;
	}
}

async function countReclaimFailure(applicationId: string): Promise<void> {
	try {
		await kvStore.incr(reclaimKey(applicationId), RECLAIM_COUNTER_TTL_SECONDS);
	} catch (error) {
		logger.warn("reconcile_reclaim_counter_failed", { applicationId, error: error instanceof Error ? error.message : String(error) });
	}
}

async function clearReclaimFailures(applicationId: string): Promise<void> {
	try {
		await kvStore.delete(reclaimKey(applicationId));
	} catch {
		// Vence solo a los 7 días.
	}
}

/**
 * Barrido de altas que quedaron a medias. Antes solo se reintentaban si el cliente
 * recargaba la página de éxito; ahora corre con el cron diario y, si se programa,
 * cada hora (`/api/system/cron/onboarding-reconcile`):
 *
 * 1. Órdenes de PayPal del alta sin cerrar: si PayPal ya las aprobó o cobró, se cobran y
 *    se cierra el alta (quien aprobó y cerró la pestaña antes de volver). Las que nadie
 *    aprobó se dejan: es un pago abandonado, no un fallo.
 * 2. Cierres que se cayeron después de reclamar el pago: se retoman (PayPal), como mucho
 *    `MAX_RECLAIM_ATTEMPTS` veces, o se avisan.
 * 3. Empresas ya pagadas sin dueño o sin bienvenida: se reintenta el alta del dueño.
 *
 * Lo que sigue trabado después de reintentar se avisa al equipo por Telegram, una vez al día
 * por solicitud (`reconcile_alerted_at`). Si esa columna todavía no existe en la base, el
 * barrido sigue igual y avisa en cada corrida, como antes (queda en el log).
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
	const summary: ReconcileSummary = {
		paypal_checked: 0,
		paypal_completed: 0,
		owners_checked: 0,
		owners_fixed: 0,
		stuck: 0,
		retries_capped: 0,
		alerts_sent: 0,
		alerts_skipped: 0,
		errors: [],
	};
	const stuck: Stuck[] = [];
	const settled = new Date(now.getTime() - SETTLE_MS).toISOString();

	let alertColumn = true;
	/** Lee con `reconcile_alerted_at`; si la columna todavía no existe, sin ella. */
	const loadRows = async (label: string, build: (columns: string) => RowsQuery): Promise<Row[]> => {
		if (alertColumn) {
			const { data, error } = await build(`${COLUMNS},${ALERTED_COLUMN}`);
			if (!error) return (data ?? []) as Row[];
			if (!isMissingColumnError(error, ALERTED_COLUMN)) {
				summary.errors.push(`${label}: ${error.message}`);
				return [];
			}
			alertColumn = false;
			logger.warn("reconcile_alerted_at_missing", {
				detail: "Falta onboarding_applications.reconcile_alerted_at (migración 20261010): se avisa en cada corrida.",
			});
		}
		const { data, error } = await build(COLUMNS);
		if (error) summary.errors.push(`${label}: ${error.message}`);
		return (data ?? []) as Row[];
	};

	// 1 y 2: pagos sin cerrar (pendientes de PayPal, o reclamados y caídos a medias).
	const pending = await loadRows("pendientes", (columns) =>
		supabaseAdmin
			.from("onboarding_applications")
			.select(columns)
			.in("status", ["form_completed", "payment_pending"])
			.in("payment_status", ["pending", "paid"])
			.lt("updated_at", settled)
			.gt("updated_at", new Date(now.getTime() - PAYPAL_WINDOW_MS).toISOString())
			.order("updated_at", { ascending: true })
			.limit(MAX_ROWS),
	);

	for (const row of pending) {
		if (outOfTime()) break;
		const paid = String(row.payment_status ?? "") === "paid";
		if (!isPayPalReference(row.payment_reference)) {
			// Un pago manual o con cupón reclamado que no terminó: lo cierra el equipo
			// volviendo a validarlo desde «Pagos por validar».
			if (paid) stuck.push({ row, problem: "El pago quedó marcado como pagado pero el alta no terminó. Vuelve a validarlo desde «Pagos por validar»." });
			continue;
		}
		const orderId = String(row.payment_reference);
		if ((await readReclaimFailures(row.id)) >= MAX_RECLAIM_ATTEMPTS) {
			summary.retries_capped += 1;
			stuck.push({
				row,
				problem: `PayPal cobró pero el alta no se cerró (orden ${orderId}). Ya se reintentó ${MAX_RECLAIM_ATTEMPTS} veces: ciérrala a mano desde «Pagos por validar» o la ficha de la empresa.`,
			});
			continue;
		}
		summary.paypal_checked += 1;
		const result = await captureOnboardingPayPalOrder({ supabaseAdmin, orderId });
		if (result.ok) {
			summary.paypal_completed += 1;
			await clearReclaimFailures(row.id);
			continue;
		}
		if (isChargedFailure(result.code) || paid) {
			await countReclaimFailure(row.id);
			stuck.push({ row, problem: `PayPal cobró pero el alta no se cerró (orden ${orderId}): ${result.error}` });
		} else if (result.code === "paypal_unavailable") {
			summary.errors.push(`PayPal no respondió para la orden ${orderId}`);
		}
		// `not_completed` y el resto: nadie aprobó el pago, no hay nada que cerrar.
	}

	// 3: empresas activas cuyo dueño no quedó dado de alta o no recibió la bienvenida.
	const owners = await loadRows("dueños", (columns) =>
		supabaseAdmin
			.from("onboarding_applications")
			.select(columns)
			.eq("status", "active")
			.eq("payment_status", "paid")
			.not("company_id", "is", null)
			.is("welcome_email_sent_at", null)
			.lt("updated_at", settled)
			.gt("updated_at", new Date(now.getTime() - OWNER_WINDOW_MS).toISOString())
			.order("updated_at", { ascending: true })
			.limit(MAX_ROWS),
	);

	for (const row of owners) {
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
	for (const item of stuck) {
		if (summary.alerts_sent >= MAX_ALERTS) break;
		const lastAlert = Date.parse(String(item.row.reconcile_alerted_at ?? ""));
		if (alertColumn && Number.isFinite(lastAlert) && now.getTime() - lastAlert < ALERT_INTERVAL_MS) {
			summary.alerts_skipped += 1;
			continue;
		}
		const sent = await alertOnboardingTeam({
			kind: "needs_attention",
			businessName: item.row.business_name ?? "",
			email: item.row.email,
			problem: item.problem,
			detail: alertColumn
				? "Lo detectó el barrido automático. Si sigue igual, se vuelve a avisar en 24 horas."
				: "Lo detectó el barrido automático; se vuelve a revisar en la próxima corrida.",
		});
		summary.alerts_sent += 1;
		// Un aviso que Telegram rechazó se reintenta en la próxima corrida.
		if (!alertColumn || sent === "failed") continue;
		// Sin tocar `updated_at`: de él dependen las ventanas de este mismo barrido.
		const { error } = await supabaseAdmin
			.from("onboarding_applications")
			.update({ [ALERTED_COLUMN]: now.toISOString() })
			.eq("id", item.row.id);
		if (error) {
			if (isMissingColumnError(error, ALERTED_COLUMN)) alertColumn = false;
			summary.errors.push(`aviso de ${item.row.id}: ${error.message}`);
		}
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
		.select("id,email,business_name,responsible_name,verification_token,created_at,plan_id")
		.eq("status", "pending_verification")
		.lt("created_at", new Date(now.getTime() - DAY).toISOString())
		.gt("created_at", new Date(now.getTime() - 4 * DAY).toISOString())
		.limit(MAX_ROWS);

	const rows = (data ?? []) as Array<{
		id: string;
		email: string;
		business_name: string | null;
		responsible_name: string | null;
		verification_token: string | null;
		created_at: string;
		plan_id: string | null;
	}>;
	// «Solo panel CEO»: el recordatorio no promete armar la tienda (mismo correo que el alta).
	const panelOnlyPlans = rows.some((row) => row.plan_id) ? await loadPanelOnlyPlanIds(supabaseAdmin) : new Set<string>();

	const appUrl = getAppUrl();
	for (const row of rows) {
		if (!row.verification_token) continue;
		const ageDays = (now.getTime() - new Date(row.created_at).getTime()) / DAY;
		const attempt = ageDays < 2 ? 1 : ageDays >= 3 ? 2 : null;
		if (attempt == null) continue;
		const panelOnly = Boolean(row.plan_id && panelOnlyPlans.has(String(row.plan_id)));
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
				...(panelOnly ? { panelOnly: true } : {}),
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
