import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { applyScheduledPlanChangesDue, suspendExpiredSubscriptions } from "@/lib/onboarding/billing-activation";
import { processDueBookingReminders } from "@/lib/onboarding/booking-notifications";
import { proxyToOnboardingBilling } from "@/lib/onboarding/service-proxy";

export async function GET(req: NextRequest) {
	const proxied = await proxyToOnboardingBilling(req, "/api/cron/subscription-status");
	if (proxied) return proxied;

	const isDev = process.env.NODE_ENV === "development" && !process.env.VERCEL_ENV;
	const expectedSecret = process.env.CRON_SECRET?.trim();

	if (!isDev && !expectedSecret) {
		return NextResponse.json(
			{ error: "CRON_SECRET es obligatorio en entornos desplegados" },
			{ status: 503 },
		);
	}

	const secret = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
	if (expectedSecret && secret !== expectedSecret) {
		return NextResponse.json({ error: "No autorizado" }, { status: 401 });
	}

	const result = await suspendExpiredSubscriptions({ supabaseAdmin });
	const scheduledChanges = await applyScheduledPlanChangesDue({ supabaseAdmin });

	if (result.error) {
		return NextResponse.json({ error: result.error }, { status: 500 });
	}

	if (scheduledChanges.error) {
		return NextResponse.json({ error: scheduledChanges.error }, { status: 500 });
	}

	const reminderResult = await processDueBookingReminders({ supabaseAdmin });
	if (reminderResult.errors > 0 && result.suspended === 0) {
		return NextResponse.json(
			{ error: "No se pudieron procesar algunos recordatorios programados", processed_bookings: reminderResult.processed, errors: reminderResult.errors },
			{ status: 500 }
		);
	}

	if (result.suspended === 0) {
		return NextResponse.json({
			ok: true,
			suspended: 0,
			applied_plan_changes: scheduledChanges.applied,
			failed_plan_changes: scheduledChanges.failed,
			processed_bookings: reminderResult.processed,
			message: reminderResult.processed > 0 ? "Recordatorios programados enviados" : "Nada que actualizar",
		});
	}

	return NextResponse.json({
		ok: true,
		suspended: result.suspended,
		applied_plan_changes: scheduledChanges.applied,
		failed_plan_changes: scheduledChanges.failed,
		processed_bookings: reminderResult.processed,
	});
}

export async function POST(req: NextRequest) {
	return GET(req);
}
