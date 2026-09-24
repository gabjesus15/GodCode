import type { SupabaseClient } from "@supabase/supabase-js";

import { runLifecycleEmails } from "@/lib/email/lifecycle-job";
import { applyScheduledPlanChangesDue, suspendExpiredSubscriptions } from "./billing-activation";
import { processDueBookingReminders } from "./booking-notifications";

export type DailyJobsSummary = {
	ok: boolean;
	error?: string;
	suspended: number;
	applied_plan_changes: number;
	failed_plan_changes: number;
	processed_bookings: number;
	failed_bookings: number;
	reminders: { mode: string; planned: number; sent: number; failed: number; errors: string[] };
};

/**
 * Lo que corre el cron diario (`/api/cron/subscription-status`), en este orden: primero se
 * pasan a suspendidas las vencidas y se aplican los cambios de plan del día, y recién
 * después se calculan los correos, para que lean el estado ya actualizado.
 *
 * Solo falla (500) si no se pudo suspender o aplicar cambios: un correo que no sale no
 * debe hacer que el cron se reintente y vuelva a tocar suscripciones.
 */
export async function runDailySubscriptionJobs(params: { supabaseAdmin: SupabaseClient; now?: Date }): Promise<DailyJobsSummary> {
	const { supabaseAdmin } = params;
	const now = params.now ?? new Date();

	const suspended = await suspendExpiredSubscriptions({ supabaseAdmin, now });
	const scheduled = await applyScheduledPlanChangesDue({ supabaseAdmin, now });
	const bookings = await processDueBookingReminders({ supabaseAdmin, now });

	let reminders: DailyJobsSummary["reminders"] = { mode: "off", planned: 0, sent: 0, failed: 0, errors: [] };
	try {
		const report = await runLifecycleEmails({ client: supabaseAdmin, now });
		reminders = { mode: report.mode, planned: report.planned, sent: report.sent, failed: report.failed, errors: report.errors };
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
	};
}
