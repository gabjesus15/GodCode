/**
 * Activación de suscripción tras pago y suspensión automática por vencimiento.
 *
 * Flujo de impago / cierre:
 * - `subscription_ends_at` es la fecha límite (meses × 30 días desde activación o extensión).
 * - El cron `GET/POST /api/cron/subscription-status` (Vercel cron + CRON_SECRET) llama
 *   `suspendExpiredSubscriptions`: pasa a `subscription_status = suspended` si sigue `active` y
 *   `subscription_ends_at < ahora`.
 * - Las páginas públicas del tenant siguen `isTenantSubscriptionAccessible`: 404 si está suspendida
 *   o vencida; una cancelación sigue online hasta el vencimiento.
 * - El dominio personalizado en el proxy usa la misma regla en SQL (`resolve_public_slug_by_custom_domain`).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { extendSubscriptionEnd } from "@/lib/billing/portal-pricing";
import { notifyPlanChanged } from "@/lib/email/account-notices";
import { syncCompanyPanelAccessFromPlanId } from "@/lib/super-admin/sync-company-panel-access";

type PaymentStatusRow = {
	status?: string | null;
	months_paid?: number | null;
};

type ApplicationAddonRow = {
	addon_id: string;
	quantity?: number | null;
	price_snapshot?: number | null;
};

type AddonMetaRow = {
	id: string;
	type?: string | null;
};

export function getMonthsPaidFromPayment(payment: PaymentStatusRow, fallback = 1): number {
	return Math.max(1, Number(payment.months_paid ?? fallback) || fallback);
}

/**
 * Nuevo vencimiento tras pagar `monthsPaid` meses (de 30 días). Si el vencimiento
 * vigente todavía no pasó, se suma desde ahí: renovar antes de tiempo no resta días.
 */
export function getSubscriptionEndsAt(monthsPaid: number, now = new Date(), currentEndsAt?: string | null): string {
	return extendSubscriptionEnd(monthsPaid, now, currentEndsAt);
}

export async function activateCompanySubscription(params: {
	supabaseAdmin: SupabaseClient;
	companyId: string;
	monthsPaid: number;
	now?: Date;
}): Promise<void> {
	const now = params.now ?? new Date();
	const { data: companyBefore } = await params.supabaseAdmin
		.from("companies")
		.select("subscription_ends_at,custom_domain")
		.eq("id", params.companyId)
		.maybeSingle();
	const endsAtIso = getSubscriptionEndsAt(params.monthsPaid, now, companyBefore?.subscription_ends_at ?? null);
	await params.supabaseAdmin
		.from("companies")
		.update({
			subscription_status: "active",
			subscription_ends_at: endsAtIso,
			// El dominio propio vence con la suscripción (el super admin lo fija igual).
			...(String(companyBefore?.custom_domain ?? "").trim() ? { custom_domain_expires_at: endsAtIso } : {}),
			updated_at: now.toISOString(),
		})
		.eq("id", params.companyId);

	await Promise.all([
		params.supabaseAdmin
			.from("company_addons")
			.update({ expires_at: endsAtIso, updated_at: now.toISOString() })
			.eq("company_id", params.companyId)
			.eq("status", "active")
			.not("expires_at", "is", null),
		params.supabaseAdmin
			.from("company_branch_extra_entitlements")
			.update({ expires_at: endsAtIso, updated_at: now.toISOString() })
			.eq("company_id", params.companyId)
			.eq("status", "active"),
	]);
	// Los avisos los manda quien activa: el pago (`payment_received`) o el alta (`welcome`).
}

export type SuspendExpiredResult = {
	suspended: number;
	error?: string;
};

export type ApplyScheduledPlanChangesResult = {
	applied: number;
	failed: number;
	error?: string;
};

export async function suspendExpiredSubscriptions(params: {
	supabaseAdmin: SupabaseClient;
	now?: Date;
}): Promise<SuspendExpiredResult> {
	const now = (params.now ?? new Date()).toISOString();

	const { data: companies, error: selectError } = await params.supabaseAdmin
		.from("companies")
		.select("id")
		.eq("subscription_status", "active")
		.lt("subscription_ends_at", now);

	if (selectError) {
		return { suspended: 0, error: selectError.message };
	}

	if (!companies?.length) {
		return { suspended: 0 };
	}

	const { error: updateError } = await params.supabaseAdmin
		.from("companies")
		.update({ subscription_status: "suspended", updated_at: now })
		.eq("subscription_status", "active")
		.lt("subscription_ends_at", now);

	if (updateError) {
		return { suspended: 0, error: updateError.message };
	}

	// El aviso de «tu plan venció» lo manda `runLifecycleEmails` (una vez por vencimiento).
	return { suspended: companies.length };
}

export async function applyScheduledPlanChangesDue(params: {
	supabaseAdmin: SupabaseClient;
	now?: Date;
}): Promise<ApplyScheduledPlanChangesResult> {
	const nowIso = (params.now ?? new Date()).toISOString();

	const { data: schedules, error } = await params.supabaseAdmin
		.from("company_plan_change_schedules")
		.select("id,company_id,target_plan_id,effective_at")
		.eq("status", "scheduled")
		.lte("effective_at", nowIso)
		.order("effective_at", { ascending: true })
		.limit(200);

	if (error) {
		return { applied: 0, failed: 0, error: error.message };
	}

	if (!schedules?.length) {
		return { applied: 0, failed: 0 };
	}

	let applied = 0;
	let failed = 0;

	for (const schedule of schedules) {
		const scheduleId = String((schedule as { id?: string | null }).id ?? "");
		const companyId = String((schedule as { company_id?: string | null }).company_id ?? "");
		const targetPlanId = String((schedule as { target_plan_id?: string | null }).target_plan_id ?? "");

		if (!scheduleId || !companyId || !targetPlanId) {
			failed += 1;
			continue;
		}

		try {
			const { data: before } = await params.supabaseAdmin
				.from("companies")
				.select("plan:plans(name)")
				.eq("id", companyId)
				.maybeSingle();
			const previousPlan = (before as { plan?: { name?: string } | Array<{ name?: string }> | null } | null)?.plan;
			const previousPlanName = (Array.isArray(previousPlan) ? previousPlan[0]?.name : previousPlan?.name) ?? null;

			const { error: companyError } = await params.supabaseAdmin
				.from("companies")
				.update({
					plan_id: targetPlanId,
					updated_at: nowIso,
				})
				.eq("id", companyId);

			if (companyError) {
				throw new Error(companyError.message);
			}
			// Sin esto el panel seguía mostrando los módulos del plan anterior.
			await syncCompanyPanelAccessFromPlanId(companyId, targetPlanId);

			// El registro del cambio queda en la propia programación (applied_at); antes además
			// se abría un ticket "resuelto" que el dueño veía en Soporte como si lo hubiera escrito.
			await params.supabaseAdmin
				.from("company_plan_change_schedules")
				.update({
					status: "applied",
					applied_at: nowIso,
					updated_at: nowIso,
					apply_error: null,
				})
				.eq("id", scheduleId);

			applied += 1;
			await notifyPlanChanged({ client: params.supabaseAdmin, companyId, scheduleId, previousPlanName, now: params.now });
		} catch (e) {
			failed += 1;
			const message = e instanceof Error ? e.message : "unknown error";
			await params.supabaseAdmin
				.from("company_plan_change_schedules")
				.update({
					status: "failed",
					apply_error: message,
					updated_at: nowIso,
				})
				.eq("id", scheduleId);
		}
	}

	return { applied, failed };
}

export async function activateCompanyAddonsFromApplication(params: {
	supabaseAdmin: SupabaseClient;
	applicationId: string;
	companyId: string;
	monthsPaid: number;
	now?: Date;
}): Promise<void> {
	const now = params.now ?? new Date();
	const { data: appAddons } = await params.supabaseAdmin
		.from("onboarding_application_addons")
		.select("addon_id,quantity,price_snapshot")
		.eq("application_id", params.applicationId);

	if (!Array.isArray(appAddons) || appAddons.length === 0) {
		return;
	}

	const typedAddons = appAddons as ApplicationAddonRow[];
	const addonIds = [...new Set(typedAddons.map((row) => row.addon_id))];
	const { data: addonsMeta } = await params.supabaseAdmin
		.from("addons")
		.select("id,type")
		.in("id", addonIds);

	const typeById = new Map(
		((addonsMeta ?? []) as AddonMetaRow[]).map((row) => [row.id, row.type ?? "one_time"])
	);
	const expiresBase = new Date(now);
	expiresBase.setDate(expiresBase.getDate() + Math.max(1, Number(params.monthsPaid) || 1) * 30);

	for (const row of typedAddons) {
		const type = typeById.get(row.addon_id) ?? "one_time";
		await params.supabaseAdmin.from("company_addons").upsert(
			{
				company_id: params.companyId,
				addon_id: row.addon_id,
				status: "active",
				price_paid: row.price_snapshot != null ? Number(row.price_snapshot) : null,
				expires_at: type === "monthly" ? expiresBase.toISOString() : null,
				updated_at: now.toISOString(),
			},
			{ onConflict: "company_id,addon_id" }
		);
	}
}
