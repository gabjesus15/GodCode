import { classifyPortalPaymentReference, isOrderAwaitingPayment, isSubscriptionOrderKind } from "@/lib/billing/portal-orders";
import { resolveSubscriptionPhase } from "@/lib/billing/portal-pricing";

import { calendarDay, calendarDaysUntil, timeZoneForCountry } from "./format";

/**
 * Qué recordatorios tocan hoy. Función pura: recibe una foto de la base y devuelve la lista
 * de correos con su clave anti-duplicados. `lifecycle-job` la carga y la envía; la vista
 * previa del super admin la usa para mostrar «qué saldría hoy» sin mandar nada.
 *
 * Reglas (días de calendario en la zona del negocio):
 * - Plan activo o en prueba: a 7, 3 y 1 día del vencimiento (uno por tramo y ciclo; si el
 *   cron se salta un día, sale el del tramo actual, nunca los atrasados).
 * - Plan cancelado que sigue vigente: un aviso a 3 días o menos del final.
 * - Plan vencido sin renovar: el día que vence (hasta 2 días después) y a los 3 y 10 días.
 *   Un plan cancelado que llega a su fin recibe «terminó» en lugar de esos avisos.
 * - Pedido de /cuenta sin pagar: al día siguiente (hasta el 3.º) y a los 4 días (hasta el 6.º).
 * - Alta a medias (correo confirmado, falta plan o pago): al día siguiente y a los 3 días.
 * Las ventanas acotadas evitan que, al activar esto, les llegue un aviso viejo a todos.
 * Si hay un pago en revisión, no se recuerda nada de esa suscripción.
 */

export type LifecycleCompany = {
	id: string;
	country: string | null;
	status: string | null;
	endsAt: string | null;
};

export type LifecycleOrder = {
	id: string;
	companyId: string;
	status: string | null;
	reference: string | null;
	createdAt: string | null;
	receiptUrl: string | null;
};

export type LifecycleApplication = {
	id: string;
	status: string | null;
	paymentStatus: string | null;
	receiptUrl: string | null;
	lastActivityAt: string | null;
	country: string | null;
};

export type PlannedEmail =
	| { kind: "renewal_reminder"; companyId: string; dedupeKey: string; daysLeft: number; trial: boolean }
	| { kind: "cancellation_reminder"; companyId: string; dedupeKey: string; daysLeft: number }
	| { kind: "subscription_expired"; companyId: string; dedupeKey: string; followup: 0 | 1 | 2 }
	| { kind: "subscription_ended"; companyId: string; dedupeKey: string }
	| { kind: "order_pending"; companyId: string; orderId: string; dedupeKey: string; attempt: 1 | 2 }
	| { kind: "onboarding_resume"; applicationId: string; dedupeKey: string; step: "plan" | "payment"; attempt: 1 | 2 };

export type LifecycleSnapshot = {
	companies: LifecycleCompany[];
	orders: LifecycleOrder[];
	applications: LifecycleApplication[];
};

function renewalBucket(daysLeft: number): 1 | 3 | 7 | null {
	if (daysLeft < 0) return null;
	if (daysLeft <= 1) return 1;
	if (daysLeft <= 3) return 3;
	if (daysLeft <= 7) return 7;
	return null;
}

function expiredFollowup(daysSince: number): 0 | 1 | 2 | null {
	if (daysSince >= 0 && daysSince <= 2) return 0;
	if (daysSince >= 3 && daysSince <= 6) return 1;
	if (daysSince >= 10 && daysSince <= 14) return 2;
	return null;
}

function reminderAttempt(ageDays: number, firstAt: number, secondAt: number, lastDay: number): 1 | 2 | null {
	if (ageDays >= secondAt && ageDays <= lastDay) return 2;
	if (ageDays >= firstAt && ageDays < secondAt) return 1;
	return null;
}

function isCancelled(status: string | null): boolean {
	const s = String(status ?? "").trim().toLowerCase();
	return s === "cancelled" || s === "canceled";
}

export function planLifecycleEmails(snapshot: LifecycleSnapshot, now: Date): PlannedEmail[] {
	const planned: PlannedEmail[] = [];

	// Pedidos de suscripción por empresa: sin pagar (se menciona en el aviso) o en revisión (se calla).
	const inReview = new Set<string>();
	for (const order of snapshot.orders) {
		const kind = classifyPortalPaymentReference(order.reference)?.kind;
		if (!isSubscriptionOrderKind(kind)) continue;
		const status = String(order.status ?? "").toLowerCase();
		if (status === "pending_validation" && String(order.receiptUrl ?? "").trim()) inReview.add(order.companyId);
	}

	const remindedToday = new Set<string>();
	for (const company of snapshot.companies) {
		if (!company.endsAt || inReview.has(company.id)) continue;
		const timeZone = timeZoneForCountry(company.country);
		const days = calendarDaysUntil(company.endsAt, now, timeZone);
		const cycle = calendarDay(new Date(company.endsAt), timeZone);
		const phase = resolveSubscriptionPhase(company.status, company.endsAt, now);

		if (phase === "active" || phase === "trial") {
			const bucket = renewalBucket(days);
			if (bucket == null) continue;
			planned.push({
				kind: "renewal_reminder",
				companyId: company.id,
				dedupeKey: `renewal:${company.id}:${cycle}:${bucket}`,
				daysLeft: Math.max(0, days),
				trial: phase === "trial",
			});
			remindedToday.add(company.id);
		} else if (phase === "cancelling") {
			if (days < 0 || days > 3) continue;
			planned.push({ kind: "cancellation_reminder", companyId: company.id, dedupeKey: `cancel-ending:${company.id}:${cycle}`, daysLeft: days });
		} else if (phase === "expired") {
			const daysSince = -days;
			if (isCancelled(company.status)) {
				if (daysSince >= 0 && daysSince <= 2) {
					planned.push({ kind: "subscription_ended", companyId: company.id, dedupeKey: `ended:${company.id}:${cycle}` });
				}
				continue;
			}
			const followup = expiredFollowup(daysSince);
			if (followup == null) continue;
			planned.push({ kind: "subscription_expired", companyId: company.id, dedupeKey: `expired:${company.id}:${cycle}:${followup}`, followup });
			remindedToday.add(company.id);
		}
	}

	for (const order of snapshot.orders) {
		const kind = classifyPortalPaymentReference(order.reference)?.kind;
		if (!kind || !order.createdAt) continue;
		if (!isOrderAwaitingPayment({ status: order.status, payment_reference: order.reference, reference_file_url: order.receiptUrl })) continue;
		// El aviso de vencimiento del mismo día ya empuja a pagar la renovación pendiente.
		if (isSubscriptionOrderKind(kind) && remindedToday.has(order.companyId)) continue;
		const attempt = reminderAttempt(-calendarDaysUntil(order.createdAt, now), 1, 4, 6);
		if (attempt == null) continue;
		planned.push({ kind: "order_pending", companyId: order.companyId, orderId: order.id, dedupeKey: `order:${order.id}:${attempt}`, attempt });
	}

	for (const app of snapshot.applications) {
		if (!app.lastActivityAt) continue;
		const status = String(app.status ?? "").toLowerCase();
		const paymentStatus = String(app.paymentStatus ?? "").toLowerCase();
		let step: "plan" | "payment" | null = null;
		if (status === "email_verified") step = "plan";
		// Con el formulario del paso 2 hecho ya eligió plan: lo que falta es pagar.
		else if ((status === "form_completed" || status === "payment_pending") && paymentStatus !== "paid" && !String(app.receiptUrl ?? "").trim()) {
			step = "payment";
		}
		if (!step) continue;
		const age = -calendarDaysUntil(app.lastActivityAt, now, timeZoneForCountry(app.country));
		const attempt = reminderAttempt(age, 1, 3, 6);
		if (attempt == null) continue;
		planned.push({ kind: "onboarding_resume", applicationId: app.id, dedupeKey: `resume:${app.id}:${attempt}`, step, attempt });
	}

	return planned;
}
