/**
 * Activación de suscripción tras pago y suspensión automática por vencimiento.
 *
 * Flujo de impago / cierre:
 * - `subscription_ends_at` es la fecha límite (meses × 30 días desde activación o extensión).
 * - El cron `GET/POST /api/cron/subscription-status` (Vercel cron + CRON_SECRET) llama
 *   `suspendExpiredSubscriptions`: pasa a `subscription_status = suspended` si sigue `active` y
 *   `subscription_ends_at < ahora`.
 * - Las páginas públicas del tenant (`/[subdomain]`, menú) devuelven HTTP 404 (notFound) si el estado
 *   es `suspended` o `cancelled`.
 * - El dominio personalizado en el proxy usa la misma regla en SQL (`resolve_public_slug_by_custom_domain`):
 *   no enruta si está suspendido/cancelado o si `subscription_ends_at` ya pasó (aunque el cron aún no corra).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { getAppUrl } from "../tenant/app-url";
import { sendOnboardingEmail } from "./emails";

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

export function getSubscriptionEndsAt(monthsPaid: number, now = new Date()): string {
	const endsAt = new Date(now);
	endsAt.setDate(endsAt.getDate() + Math.max(1, Number(monthsPaid) || 1) * 30);
	return endsAt.toISOString();
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
		.select("subscription_status,name,email")
		.eq("id", params.companyId)
		.maybeSingle();
	const previousStatus = companyBefore?.subscription_status?.trim().toLowerCase() ?? null;
	const endsAtIso = getSubscriptionEndsAt(params.monthsPaid, now);
	await params.supabaseAdmin
		.from("companies")
		.update({
			subscription_status: "active",
			subscription_ends_at: endsAtIso,
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

	const { data: application } = await params.supabaseAdmin
		.from("onboarding_applications")
		.select("business_name,responsible_name,email")
		.eq("company_id", params.companyId)
		.order("created_at", { ascending: false })
		.limit(1)
		.maybeSingle();

	if (!application) {
		return;
	}

	const recipientEmail = application.email || companyBefore?.email || "";
	if (!recipientEmail) {
		return;
	}

	const businessName = application.business_name || companyBefore?.name || "Tu negocio";
	const responsibleName = application.responsible_name || "";
	const panelUrl = getAppUrl();

	if (previousStatus === "suspended") {
		await sendOnboardingEmail({
			type: "status_reactivated",
			to: recipientEmail,
			from: process.env.RESEND_FROM ?? "noreply@example.com",
			apiKey: process.env.RESEND_API_KEY ?? "",
			responsibleName,
			businessName,
			panelUrl,
		});
		return;
	}

	if (previousStatus && previousStatus !== "active") {
		await sendOnboardingEmail({
			type: "site_ready",
			to: recipientEmail,
			from: process.env.RESEND_FROM ?? "noreply@example.com",
			apiKey: process.env.RESEND_API_KEY ?? "",
			responsibleName,
			businessName,
			siteUrl: panelUrl,
		});
	}
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

	const { data: applications } = await params.supabaseAdmin
		.from("onboarding_applications")
		.select("company_id,business_name,responsible_name,email")
		.in("company_id", companies.map((company) => company.id));

	const applicationByCompanyId = new Map(
		((applications ?? []) as { company_id: string | null; business_name: string; responsible_name: string; email: string }[])
			.filter((application) => Boolean(application.company_id))
			.map((application) => [application.company_id as string, application])
	);

	const { error: updateError } = await params.supabaseAdmin
		.from("companies")
		.update({ subscription_status: "suspended", updated_at: now })
		.eq("subscription_status", "active")
		.lt("subscription_ends_at", now);

	if (updateError) {
		return { suspended: 0, error: updateError.message };
	}

	const resendApiKey = process.env.RESEND_API_KEY ?? "";
	const resendFrom = process.env.RESEND_FROM ?? "noreply@example.com";
	const panelUrl = getAppUrl();

	await Promise.all(
		companies.map(async (company) => {
			const application = applicationByCompanyId.get(company.id);
			if (!application?.email) return;

			await sendOnboardingEmail({
				type: "status_suspended",
				to: application.email,
				from: resendFrom,
				apiKey: resendApiKey,
				responsibleName: application.responsible_name || "",
				businessName: application.business_name || company.id,
				panelUrl,
			});
		})
	);

	return { suspended: companies.length };
}

export async function applyScheduledPlanChangesDue(params: {
	supabaseAdmin: SupabaseClient;
	now?: Date;
}): Promise<ApplyScheduledPlanChangesResult> {
	const nowIso = (params.now ?? new Date()).toISOString();

	const { data: schedules, error } = await params.supabaseAdmin
		.from("company_plan_change_schedules")
		.select("id,company_id,current_plan_id,target_plan_id,effective_at")
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
		const currentPlanId = (schedule as { current_plan_id?: string | null }).current_plan_id ?? null;

		if (!scheduleId || !companyId || !targetPlanId) {
			failed += 1;
			continue;
		}

		try {
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

			const { data: plans } = await params.supabaseAdmin
				.from("plans")
				.select("id,name")
				.in("id", [targetPlanId, currentPlanId].filter(Boolean) as string[]);

			const targetPlanName =
				(plans ?? []).find((plan) => String(plan.id) === targetPlanId)?.name ?? "Plan objetivo";
			const currentPlanName =
				(plans ?? []).find((plan) => String(plan.id) === String(currentPlanId))?.name ?? "Plan anterior";

			await params.supabaseAdmin
				.from("company_plan_change_schedules")
				.update({
					status: "applied",
					applied_at: nowIso,
					updated_at: nowIso,
					apply_error: null,
				})
				.eq("id", scheduleId);

			await params.supabaseAdmin.from("saas_tickets").insert({
				company_id: companyId,
				source: "system",
				created_by_email: "system@internal",
				subject: `Downgrade aplicado automaticamente · ${currentPlanName} -> ${targetPlanName}`,
				description: [
					`Schedule: ${scheduleId}`,
					`Plan anterior: ${currentPlanName}`,
					`Plan nuevo: ${targetPlanName}`,
					`Aplicado en: ${nowIso}`,
				].join("\n"),
				category: "billing",
				priority: "medium",
				status: "resolved",
				last_message_at: nowIso,
				resolved_at: nowIso,
			});

			applied += 1;
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
