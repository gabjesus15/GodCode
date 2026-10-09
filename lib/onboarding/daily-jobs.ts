import type { SupabaseClient } from "@supabase/supabase-js";

import { runLifecycleEmails } from "@/lib/email/lifecycle-job";
import { applyScheduledPlanChangesDue, suspendExpiredSubscriptions } from "./billing-activation";
import { processDueBookingReminders } from "./booking-notifications";
import { reconcileOnboarding, runVerificationJobs, type ReconcileSummary, type VerificationJobsSummary } from "./reconcile";
import { runStoreDraftJobs, type StoreDraftJobsSummary } from "./store-draft-jobs";

export type DailyJobsSummary = {
	ok: boolean;
	error?: string;
	suspended: number;
	applied_plan_changes: number;
	failed_plan_changes: number;
	processed_bookings: number;
	failed_bookings: number;
	reminders: { mode: string; planned: number; sent: number; failed: number; stopped_early: boolean; errors: string[] };
	onboarding: ReconcileSummary | { error: string };
	verification: VerificationJobsSummary | { error: string };
	store_drafts: StoreDraftJobsSummary | { error: string };
};

/**
 * Lo que corre el cron diario (`/api/cron/subscription-status`), en este orden: primero se
 * pasan a suspendidas las vencidas y se aplican los cambios de plan del día, luego el
 * barrido de altas a medias y los recordatorios de verificación, y recién después se
 * calculan los correos, para que lean el estado ya actualizado.
 *
 * Solo falla (500) si no se pudo suspender o aplicar cambios: un correo que no sale no
 * debe hacer que el cron se reintente y vuelva a tocar suscripciones.
 */
export async function runDailySubscriptionJobs(params: {
	supabaseAdmin: SupabaseClient;
	now?: Date;
	/** Hora límite (ms epoch) de la función: los correos paran antes y siguen en la próxima corrida. */
	deadlineMs?: number;
}): Promise<DailyJobsSummary> {
	const { supabaseAdmin } = params;
	const now = params.now ?? new Date();

	const suspended = await suspendExpiredSubscriptions({ supabaseAdmin, now });
	const scheduled = await applyScheduledPlanChangesDue({ supabaseAdmin, now });
	const bookings = await processDueBookingReminders({ supabaseAdmin, now });

	// Altas a medias y correos sin confirmar: un fallo aquí no hace fallar el cron.
	// Se reserva la mitad del tiempo para los correos del día.
	const reconcileDeadline = params.deadlineMs != null ? Date.now() + (params.deadlineMs - Date.now()) / 2 : undefined;
	const onboarding = await reconcileOnboarding({ supabaseAdmin, now, deadlineMs: reconcileDeadline }).catch((e: unknown) => ({
		error: e instanceof Error ? e.message : "Error en el barrido de altas",
	}));
	const verification = await runVerificationJobs({ supabaseAdmin, now }).catch((e: unknown) => ({
		error: e instanceof Error ? e.message : "Error en los recordatorios de verificación",
	}));
	// Tiendas en vista previa: abrir las pagadas que quedaron a medias y borrar las de 30 días.
	const storeDrafts = await runStoreDraftJobs({ supabaseAdmin, now, deadlineMs: reconcileDeadline }).catch((e: unknown) => ({
		error: e instanceof Error ? e.message : "Error con las tiendas en vista previa",
	}));

	let reminders: DailyJobsSummary["reminders"] = { mode: "off", planned: 0, sent: 0, failed: 0, stopped_early: false, errors: [] };
	try {
		const report = await runLifecycleEmails({ client: supabaseAdmin, now, deadlineMs: params.deadlineMs });
		reminders = {
			mode: report.mode,
			planned: report.planned,
			sent: report.sent,
			failed: report.failed,
			stopped_early: report.stoppedEarly,
			errors: report.errors,
		};
	} catch (error) {
		reminders.errors.push(error instanceof Error ? error.message : "Error en los recordatorios");
	}

	const error = suspended.error ?? scheduled.error;
	return {
		ok: !error,
		...(error ? { error } : {}),
		suspended: suspended.suspended,
		applied_plan_changes: scheduled.applied,
		failed_plan_changes: scheduled.failed,
		processed_bookings: bookings.processed,
		failed_bookings: bookings.errors,
		reminders,
		onboarding,
		verification,
		store_drafts: storeDrafts,
	};
}
