import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveCompanyContact } from "@/lib/billing/company-contact";
import { classifyPortalPaymentReference, describePortalOrder, isOrderAwaitingPayment } from "@/lib/billing/portal-orders";
import { formatUsd } from "@/lib/billing/portal-pricing";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { loadPendingStoreDrafts, storeDraftPurgeMode } from "@/lib/onboarding/store-draft-jobs";
import { readStoreDraft, storeDraftPurgeDate } from "@/lib/tenant/store-draft";
import { getTenantHomeUrl } from "../../utils/tenant-url";

import { loadRenewalFacts } from "./billing-facts";
import { getEmailBrand } from "./brand";
import { findDeliveredKeys } from "./deliveries";
import { formatEmailDate, timeZoneForCountry } from "./format";
import { planLifecycleEmails, type LifecycleSnapshot, type PlannedEmail } from "./lifecycle-plan";
import { sendEmail, type SendEmailResult } from "./send";
import type { EmailKind, EmailTemplates } from "./templates";

/**
 * Recordatorios automáticos (los llama el cron diario). Carga una foto de la base, decide
 * con `planLifecycleEmails` y manda cada correo reservándolo antes en `email_deliveries`.
 *
 * EMAIL_REMINDERS: `on` (por defecto), `dry-run` (calcula y no manda) u `off`.
 * EMAIL_REMINDERS_MAX_PER_RUN: tope de correos por corrida (40 por defecto).
 */

export type LifecycleMode = "on" | "dry-run" | "off";

export function lifecycleMode(): LifecycleMode {
	const raw = String(process.env.EMAIL_REMINDERS ?? "").trim().toLowerCase();
	if (["off", "false", "0", "no"].includes(raw)) return "off";
	if (["dry-run", "dryrun", "preview"].includes(raw)) return "dry-run";
	return "on";
}

export type LifecycleItemStatus = SendEmailResult["status"] | "would-send" | "already-sent" | "not-built";

export type LifecycleReportItem = {
	kind: EmailKind;
	dedupeKey: string;
	companyId?: string;
	applicationId?: string;
	businessName?: string;
	to?: string;
	status: LifecycleItemStatus;
	detail?: string;
};

export type LifecycleReport = {
	mode: LifecycleMode;
	planned: number;
	sent: number;
	failed: number;
	/** La corrida paró antes de terminar por el tiempo de la función; lo pendiente sale en la próxima. */
	stoppedEarly: boolean;
	items: LifecycleReportItem[];
	errors: string[];
};

const DAY_MS = 86_400_000;

export async function loadLifecycleSnapshot(client: SupabaseClient, now: Date): Promise<{ snapshot: LifecycleSnapshot; errors: string[] }> {
	const since = new Date(now.getTime() - 16 * DAY_MS).toISOString();
	const until = new Date(now.getTime() + 8 * DAY_MS).toISOString();
	const recent = new Date(now.getTime() - 8 * DAY_MS).toISOString();

	const [companies, orders, applications, drafts] = await Promise.all([
		client
			.from("companies")
			.select("id,country,subscription_status,subscription_ends_at")
			.gte("subscription_ends_at", since)
			.lte("subscription_ends_at", until)
			.limit(2000),
		client
			.from("payments_history")
			.select("id,company_id,status,payment_reference,payment_date,reference_file_url")
			.in("status", ["pending", "pending_validation", "rejected"])
			.limit(2000),
		client
			.from("onboarding_applications")
			.select("id,company_id,status,payment_status,payment_reference_url,updated_at,country")
			.in("status", ["email_verified", "form_completed", "payment_pending"])
			.gte("updated_at", recent)
			.limit(2000),
		loadPendingStoreDrafts(client),
	]);

	const errors = [companies.error, orders.error, applications.error].filter(Boolean).map((error) => String(error?.message));
	if (drafts.error) errors.push(drafts.error);
	return {
		errors,
		snapshot: {
			companies: ((companies.data ?? []) as Array<Record<string, string | null>>).map((row) => ({
				id: String(row.id),
				country: row.country ?? null,
				status: row.subscription_status ?? null,
				endsAt: row.subscription_ends_at ?? null,
			})),
			orders: ((orders.data ?? []) as Array<Record<string, string | null>>).map((row) => ({
				id: String(row.id),
				companyId: String(row.company_id),
				status: row.status ?? null,
				reference: row.payment_reference ?? null,
				createdAt: row.payment_date ?? null,
				receiptUrl: row.reference_file_url ?? null,
			})),
			applications: ((applications.data ?? []) as Array<Record<string, string | null>>).map((row) => ({
				id: String(row.id),
				companyId: row.company_id ?? null,
				status: row.status ?? null,
				paymentStatus: row.payment_status ?? null,
				receiptUrl: row.payment_reference_url ?? null,
				lastActivityAt: row.updated_at ?? null,
				country: row.country ?? null,
			})),
			drafts: drafts.drafts
				.filter((draft) => draft.since)
				.map((draft) => ({ companyId: draft.companyId, since: draft.since, country: draft.country, paymentInReview: draft.paymentInReview })),
			draftPurge: storeDraftPurgeMode() === "on",
		},
	};
}

type Built<K extends EmailKind = EmailKind> = {
	kind: K;
	to: string;
	data: EmailTemplates[K];
	companyId?: string;
	applicationId?: string;
	businessName: string;
};

async function buildPlanned(item: PlannedEmail, client: SupabaseClient, now: Date): Promise<Built | { skip: string }> {
	if (item.kind === "onboarding_resume") {
		const { data: app } = await client
			.from("onboarding_applications")
			.select("id,email,responsible_name,business_name,verification_token,plan_id")
			.eq("id", item.applicationId)
			.maybeSingle();
		const row = app as { email?: string; responsible_name?: string; business_name?: string; verification_token?: string | null; plan_id?: string | null } | null;
		if (!row?.email || !row.verification_token) return { skip: "Solicitud sin correo o sin enlace" };
		const { data: plan } = row.plan_id ? await client.from("plans").select("name").eq("id", row.plan_id).maybeSingle() : { data: null };
		const token = encodeURIComponent(row.verification_token);
		const appUrl = getEmailBrand().appUrl;
		return {
			kind: "onboarding_resume",
			to: row.email,
			applicationId: item.applicationId,
			businessName: row.business_name ?? "",
			data: {
				name: row.responsible_name ?? "",
				businessName: row.business_name ?? "tu negocio",
				step: item.step,
				attempt: item.attempt,
				planName: (plan as { name?: string } | null)?.name ?? undefined,
				resumeUrl:
					item.step === "store"
						? `${appUrl}/onboarding/tienda?token=${token}`
						: item.step === "plan"
							? `${appUrl}/onboarding/complete?token=${token}`
							: `${appUrl}/onboarding/pago?token=${token}`,
			},
		};
	}

	const contact = await resolveCompanyContact(client, item.companyId);
	if (!contact.email) return { skip: "El negocio no tiene correo" };
	const base = { to: contact.email, companyId: item.companyId, businessName: contact.businessName };
	const name = contact.responsibleName || undefined;

	if (item.kind === "store_draft_reminder" || item.kind === "store_draft_expiring") {
		const { data: company } = await client
			.from("companies")
			.select("public_slug,country,subscription_status,theme_config")
			.eq("id", item.companyId)
			.maybeSingle();
		const draft = readStoreDraft(company?.theme_config);
		if (!company || !draft || draft.openedAt || String(company.subscription_status ?? "") !== "trial") return { skip: "La tienda ya no está en vista previa" };
		const continueUrl = `${getEmailBrand().appUrl}/cuenta/publicar`;
		if (item.kind === "store_draft_expiring") {
			return {
				...base,
				kind: "store_draft_expiring",
				data: {
					name,
					businessName: contact.businessName,
					continueUrl,
					deleteDate: formatEmailDate(storeDraftPurgeDate(draft).toISOString(), timeZoneForCountry(company.country as string | null)),
				},
			};
		}
		const slug = (company.public_slug as string | null) ?? null;
		return {
			...base,
			kind: "store_draft_reminder",
			data: { name, businessName: contact.businessName, continueUrl, storeUrl: slug ? getTenantHomeUrl(slug) : undefined, attempt: item.attempt },
		};
	}

	if (item.kind === "order_pending") {
		const { data: order } = await client
			.from("payments_history")
			.select("id,plan_id,status,months_paid,amount_paid,payment_reference,payment_date,reference_file_url")
			.eq("id", item.orderId)
			.maybeSingle();
		const row = order as {
			plan_id: string | null;
			status: string | null;
			months_paid: number | null;
			amount_paid: number | null;
			payment_reference: string | null;
			payment_date: string | null;
			reference_file_url: string | null;
		} | null;
		if (!row || !isOrderAwaitingPayment(row)) return { skip: "El pedido ya no está pendiente" };
		const addonId = classifyPortalPaymentReference(row.payment_reference)?.addonId;
		const [{ data: plan }, { data: addon }, { data: company }] = await Promise.all([
			row.plan_id ? client.from("plans").select("name").eq("id", row.plan_id).maybeSingle() : Promise.resolve({ data: null }),
			addonId ? client.from("addons").select("name").eq("id", addonId).maybeSingle() : Promise.resolve({ data: null }),
			client.from("companies").select("country").eq("id", item.companyId).maybeSingle(),
		]);
		return {
			...base,
			kind: "order_pending",
			data: {
				name,
				businessName: contact.businessName,
				concept: describePortalOrder(row, {
					plan: () => (plan as { name?: string } | null)?.name ?? null,
					addon: () => (addon as { name?: string } | null)?.name ?? null,
				}),
				amount: formatUsd(row.amount_paid),
				createdAt: formatEmailDate(row.payment_date, timeZoneForCountry((company as { country?: string | null } | null)?.country)),
				attempt: item.attempt,
			},
		};
	}

	const facts = await loadRenewalFacts(item.companyId, now);
	if (!facts) return { skip: "No se encontró la empresa" };
	const endsAt = formatEmailDate(facts.ctx.company.subscription_ends_at, facts.timeZone);

	switch (item.kind) {
		case "renewal_reminder":
			// Planes sin precio (internos o de cortesía) no se renuevan pagando.
			if (facts.monthly <= 0) return { skip: "Plan sin precio" };
			return {
				...base,
				kind: "renewal_reminder",
				data: {
					name,
					businessName: contact.businessName,
					planName: facts.planName,
					endsAt,
					daysLeft: item.daysLeft,
					trial: item.trial,
					amount: facts.amount,
					lines: facts.lines,
					hasOpenOrder: facts.hasOpenOrder,
				},
			};
		case "cancellation_reminder":
			return { ...base, kind: "cancellation_reminder", data: { name, businessName: contact.businessName, endsAt, daysLeft: item.daysLeft } };
		case "subscription_expired":
			return {
				...base,
				kind: "subscription_expired",
				data: {
					name,
					businessName: contact.businessName,
					planName: facts.planName,
					endedAt: endsAt,
					followup: item.followup,
					amount: facts.monthly > 0 ? facts.amount : undefined,
				},
			};
		case "subscription_ended":
			return { ...base, kind: "subscription_ended", data: { name, businessName: contact.businessName, endedAt: endsAt } };
	}
}

/** Lo que puede tardar un correo (preparar, reservar, Resend y la pausa) en el peor caso razonable. */
const LIFECYCLE_ITEM_RESERVE_MS = 5_000;

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runLifecycleEmails(params: {
	client?: SupabaseClient;
	now?: Date;
	mode?: LifecycleMode;
	maxSends?: number;
	/**
	 * Hora límite (ms epoch) para empezar otro correo. Si la función se corta a mitad de
	 * un envío, la reserva en `email_deliveries` queda en "sending" y ese correo ya no
	 * sale nunca (la dedupe lo da por enviado): mejor parar limpio antes y dejar el resto
	 * a la próxima corrida, que lo vuelve a planificar y salta lo ya enviado.
	 */
	deadlineMs?: number;
} = {}): Promise<LifecycleReport> {
	const client = params.client ?? supabaseAdmin;
	const now = params.now ?? new Date();
	const mode = params.mode ?? lifecycleMode();
	const report: LifecycleReport = { mode, planned: 0, sent: 0, failed: 0, stoppedEarly: false, items: [], errors: [] };
	if (mode === "off") return report;

	const { snapshot, errors } = await loadLifecycleSnapshot(client, now);
	report.errors.push(...errors);
	const planned = planLifecycleEmails(snapshot, now);
	report.planned = planned.length;
	const maxSends = params.maxSends ?? Math.max(1, Number(process.env.EMAIL_REMINDERS_MAX_PER_RUN ?? 40) || 40);

	const delivered = mode === "dry-run" ? await findDeliveredKeys(planned.map((item) => item.dedupeKey), client) : null;
	let attempts = 0;

	for (const item of planned) {
		const ref = {
			kind: item.kind,
			dedupeKey: item.dedupeKey,
			companyId: "companyId" in item ? item.companyId : undefined,
			applicationId: "applicationId" in item ? item.applicationId : undefined,
		};
		if (delivered?.has(item.dedupeKey)) {
			report.items.push({ ...ref, status: "already-sent" });
			continue;
		}
		if (mode === "on" && attempts >= maxSends) {
			report.items.push({ ...ref, status: "skipped", detail: "Tope de envíos por corrida: sale mañana" });
			continue;
		}
		if (params.deadlineMs != null && Date.now() + LIFECYCLE_ITEM_RESERVE_MS > params.deadlineMs) {
			report.stoppedEarly = true;
			report.items.push({ ...ref, status: "skipped", detail: "Sin tiempo en esta corrida: sale en la próxima" });
			continue;
		}

		let built: Built | { skip: string };
		try {
			built = await buildPlanned(item, client, now);
		} catch (error) {
			built = { skip: error instanceof Error ? error.message : "Error al preparar el correo" };
		}
		if ("skip" in built) {
			report.items.push({ ...ref, status: "not-built", detail: built.skip });
			continue;
		}

		if (mode === "dry-run") {
			report.items.push({ ...ref, businessName: built.businessName, to: built.to, status: "would-send" });
			continue;
		}

		attempts += 1;
		const result = await sendEmail({
			kind: built.kind,
			to: built.to,
			data: built.data,
			companyId: built.companyId,
			applicationId: built.applicationId,
			dedupeKey: item.dedupeKey,
			whenLedgerUnavailable: "skip",
			metadata: { source: "lifecycle" },
			client,
		} as Parameters<typeof sendEmail>[0]);
		if (result.status === "sent") report.sent += 1;
		if (result.status === "failed") report.failed += 1;
		report.items.push({
			...ref,
			businessName: built.businessName,
			to: built.to,
			status: result.status,
			detail: result.status === "failed" ? result.error : result.status === "skipped" ? result.reason : undefined,
		});
		// Resend admite pocas peticiones por segundo.
		await sleep(350);
	}

	return report;
}
