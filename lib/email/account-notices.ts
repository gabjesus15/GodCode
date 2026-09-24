import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveCompanyContact } from "@/lib/billing/company-contact";
import { classifyPortalPaymentReference, describePortalOrder } from "@/lib/billing/portal-orders";
import { formatUsd } from "@/lib/billing/portal-pricing";
import { getTenantHomeUrl } from "../../utils/tenant-url";

import { loadRenewalFacts } from "./billing-facts";
import { getEmailBrand } from "./brand";
import { sendEmail, teamInbox } from "./send";

/**
 * Avisos de hechos puntuales que necesitan leer la base para armarse (a diferencia de los
 * que ya tienen todos los datos a mano en quien los dispara). Ninguno lanza: si el correo
 * no sale, lo que pasó (el pago, el cambio de plan) sigue valiendo.
 */

type OrderLike = {
	id: string;
	company_id: string;
	status: string | null;
	plan_id: string | null;
	months_paid: number | null;
	amount_paid: number | null;
	payment_reference: string | null;
	payment_method: string | null;
};

async function orderConcept(client: SupabaseClient, order: OrderLike): Promise<string> {
	const addonId = classifyPortalPaymentReference(order.payment_reference)?.addonId;
	const [{ data: plan }, { data: addon }] = await Promise.all([
		order.plan_id ? client.from("plans").select("name").eq("id", order.plan_id).maybeSingle() : Promise.resolve({ data: null }),
		addonId ? client.from("addons").select("name").eq("id", addonId).maybeSingle() : Promise.resolve({ data: null }),
	]);
	return describePortalOrder(order, {
		plan: () => (plan as { name?: string } | null)?.name ?? null,
		addon: () => (addon as { name?: string } | null)?.name ?? null,
	});
}

/** Comprobante subido en /cuenta: acuse al dueño y aviso al equipo para que lo valide. */
export async function notifyPortalReceipt(client: SupabaseClient, order: OrderLike): Promise<void> {
	try {
		const [contact, concept] = await Promise.all([resolveCompanyContact(client, order.company_id), orderConcept(client, order)]);
		const amount = formatUsd(order.amount_paid);
		const reference = String(order.payment_reference ?? "");
		const method = order.payment_method ?? undefined;
		await Promise.all([
			contact.email
				? sendEmail({
						kind: "receipt_received",
						to: contact.email,
						companyId: order.company_id,
						client,
						data: { name: contact.responsibleName || undefined, businessName: contact.businessName, concept, amount, method, reference },
					})
				: Promise.resolve(null),
			sendEmail({
				kind: "team_payment_review",
				to: teamInbox(),
				companyId: order.company_id,
				client,
				data: {
					businessName: contact.businessName,
					concept,
					amount,
					method,
					reference,
					source: "cuenta",
					adminUrl: `${getEmailBrand().appUrl}/dashboard/pagos`,
				},
			}),
		]);
	} catch (error) {
		console.error("receipt notice:", error);
	}
}

/** Comprobante subido en el alta: acuse al solicitante y aviso al equipo. */
export async function notifyOnboardingReceipt(client: SupabaseClient, applicationId: string): Promise<void> {
	try {
		const { data } = await client
			.from("onboarding_applications")
			.select("id,email,responsible_name,business_name,payment_amount,payment_reference,subscription_payment_method,verification_token")
			.eq("id", applicationId)
			.maybeSingle();
		const app = data as {
			id: string;
			email: string | null;
			responsible_name: string | null;
			business_name: string | null;
			payment_amount: number | null;
			payment_reference: string | null;
			subscription_payment_method: string | null;
			verification_token: string | null;
		} | null;
		if (!app) return;
		const slug = String(app.subscription_payment_method ?? "").trim();
		const { data: method } = slug
			? await client.from("plan_payment_methods").select("name").eq("slug", slug).maybeSingle()
			: { data: null };
		const methodName = (method as { name?: string | null } | null)?.name ?? undefined;
		const amount = app.payment_amount != null ? formatUsd(app.payment_amount) : undefined;
		const businessName = app.business_name ?? "Negocio nuevo";
		const reference = String(app.payment_reference ?? "");
		const appUrl = getEmailBrand().appUrl;
		await Promise.all([
			app.email
				? sendEmail({
						kind: "onboarding_receipt_received",
						to: app.email,
						applicationId: app.id,
						client,
						data: {
							name: app.responsible_name ?? "",
							businessName,
							amount,
							method: methodName,
							reference,
							statusUrl: app.verification_token ? `${appUrl}/onboarding/complete?token=${encodeURIComponent(app.verification_token)}` : undefined,
						},
					})
				: Promise.resolve(null),
			sendEmail({
				kind: "team_payment_review",
				to: teamInbox(),
				applicationId: app.id,
				client,
				data: {
					businessName,
					concept: "Alta de negocio nuevo",
					amount: amount ?? "Por confirmar",
					method: methodName,
					reference,
					source: "alta",
					adminUrl: `${appUrl}/dashboard/pagos`,
				},
			}),
		]);
	} catch (error) {
		console.error("onboarding receipt notice:", error);
	}
}

/** El cron aplicó un cambio de plan programado. */
export async function notifyPlanChanged(params: {
	client: SupabaseClient;
	companyId: string;
	scheduleId: string;
	previousPlanName: string | null;
	now?: Date;
}): Promise<void> {
	try {
		const [contact, facts] = await Promise.all([
			resolveCompanyContact(params.client, params.companyId),
			loadRenewalFacts(params.companyId, params.now),
		]);
		if (!contact.email || !facts) return;
		await sendEmail({
			kind: "plan_changed",
			to: contact.email,
			companyId: params.companyId,
			dedupeKey: `plan-changed:${params.scheduleId}`,
			client: params.client,
			data: {
				name: contact.responsibleName || undefined,
				businessName: contact.businessName,
				previousPlan: params.previousPlanName ?? undefined,
				newPlan: facts.ctx.currentPlan?.name ?? facts.planName,
				renewalAmount: facts.monthly > 0 ? facts.amount : undefined,
			},
		});
	} catch (error) {
		console.error("plan changed notice:", error);
	}
}

/** El equipo terminó de configurar un negocio nuevo (ticket de entrega resuelto). */
export async function notifySiteReady(client: SupabaseClient, companyId: string, ticketId: string): Promise<void> {
	try {
		const [contact, { data: company }] = await Promise.all([
			resolveCompanyContact(client, companyId),
			client.from("companies").select("public_slug,custom_domain").eq("id", companyId).maybeSingle(),
		]);
		const slug = String((company as { public_slug?: string | null } | null)?.public_slug ?? "").trim();
		if (!contact.email || !slug) return;
		await sendEmail({
			kind: "site_ready",
			to: contact.email,
			companyId,
			dedupeKey: `site-ready:${ticketId}`,
			client,
			data: {
				name: contact.responsibleName || undefined,
				businessName: contact.businessName,
				storeUrl: getTenantHomeUrl(slug, (company as { custom_domain?: string | null } | null)?.custom_domain ?? null),
			},
		});
	} catch (error) {
		console.error("site ready notice:", error);
	}
}
