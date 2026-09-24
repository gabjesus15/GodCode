import type { SupabaseClient } from "@supabase/supabase-js";

import { accountUrl, getEmailBrand } from "@/lib/email/brand";
import { formatEmailDate, timeZoneForCountry } from "@/lib/email/format";
import { sendEmail } from "@/lib/email/send";
import { activateCompanySubscription, getMonthsPaidFromPayment } from "@/lib/onboarding/billing-activation";
import { completeOnboardingPayment } from "@/lib/onboarding/complete-onboarding-payment";
import { resolveFirstPaymentPromo } from "@/lib/onboarding/first-payment-promo";
import { isFirstPaymentPromoEligible } from "@/lib/onboarding/first-payment-promo-service";
import { resolveAddonUnitPrice } from "@/lib/plans/addon-pricing";
import { syncCompanyPanelAccessFromPlanId } from "@/lib/super-admin/sync-company-panel-access";
import { resolveCompanyContact } from "./company-contact";
import { classifyPortalPaymentReference, describePortalOrder, type PortalPaymentKind } from "./portal-orders";
import { formatUsd, resolveSubscriptionPhase } from "./portal-pricing";

/**
 * Validación y rechazo de pagos, y lo que pasa cuando un pago del portal se da por bueno.
 * Un solo código para el servicio de onboarding y para la app: antes había dos copias que
 * ya se comportaban distinto.
 *
 * Dos orígenes:
 * - **onboarding**: el pago vive en la solicitud (`onboarding_applications.payment_reference`);
 *   validarlo cierra el alta con `completeOnboardingPayment`.
 * - **portal (/cuenta)**: el pago es una fila de `payments_history` (ver `portal-orders`); se
 *   aplica al validarlo el equipo o al capturarlo PayPal.
 */

export { classifyPortalPaymentReference, type PortalPaymentKind };

export type PaymentReviewResult =
	| {
			ok: true;
			message: string;
			companyId: string | null;
			source: "onboarding" | "portal";
			kind?: PortalPaymentKind;
			welcomeSent?: boolean;
			ownerReady?: boolean;
	  }
	| { ok: false; error: string; status: number };

type ReviewParams = {
	supabaseAdmin: SupabaseClient;
	paymentId?: string | null;
	paymentReference?: string | null;
	now?: Date;
};

export type PortalPaymentRow = {
	id: string;
	company_id: string;
	plan_id: string;
	status: string | null;
	months_paid: number | null;
	payment_reference: string | null;
	amount_paid: number | null;
	payment_date: string | null;
	payment_method?: string | null;
};

export const PORTAL_PAYMENT_COLUMNS =
	"id,company_id,plan_id,status,months_paid,payment_reference,amount_paid,payment_date,payment_method";

async function findPortalPayment(params: ReviewParams): Promise<PortalPaymentRow | null> {
	const id = params.paymentId?.trim();
	const ref = params.paymentReference?.trim();
	if (!id && !ref) return null;
	const query = params.supabaseAdmin.from("payments_history").select(PORTAL_PAYMENT_COLUMNS).limit(1);
	const { data } = await (id ? query.eq("id", id) : query.eq("payment_reference", ref as string)).maybeSingle();
	return (data as PortalPaymentRow | null) ?? null;
}

async function findOnboardingApplication(supabaseAdmin: SupabaseClient, reference: string | null | undefined) {
	const ref = reference?.trim();
	if (!ref) return null;
	const { data } = await supabaseAdmin
		.from("onboarding_applications")
		.select("id,email,responsible_name,business_name,company_id,payment_reference,payment_status,payment_months,payment_amount,subscription_payment_method,verification_token")
		.eq("payment_reference", ref)
		.maybeSingle();
	return data;
}

export async function validatePayment(params: ReviewParams): Promise<PaymentReviewResult> {
	const { supabaseAdmin } = params;
	const now = params.now ?? new Date();

	const payment = await findPortalPayment(params);
	if (payment) {
		return applyPortalPayment(supabaseAdmin, payment, {
			now,
			// "pending": el cliente pagó por transferencia pero no subió el comprobante.
			claimFrom: ["pending_validation", "pending"],
			notify: true,
		});
	}

	const app = await findOnboardingApplication(supabaseAdmin, params.paymentReference);
	if (!app) return { ok: false, error: "Pago no encontrado", status: 404 };

	const months = getMonthsPaidFromPayment({ months_paid: app.payment_months }, 1);
	const eligible = await isFirstPaymentPromoEligible(supabaseAdmin, {
		email: app.email,
		excludeCompanyId: app.company_id,
	});
	const promo = resolveFirstPaymentPromo(months, eligible);
	const slug = String(app.subscription_payment_method ?? "manual");
	const { data: method } = await supabaseAdmin.from("plan_payment_methods").select("name").eq("slug", slug).maybeSingle();

	const result = await completeOnboardingPayment({
		supabaseAdmin,
		applicationId: app.id,
		paymentReference: String(app.payment_reference),
		amountPaid: Number(app.payment_amount ?? 0) || 0,
		methodSlug: slug,
		methodName: method?.name ?? slug,
		chargedMonths: promo.chargedMonths,
		grantedMonths: promo.grantedMonths,
		promoApplied: promo.promoApplied,
		isManualPayment: true,
		now,
	});
	if (!result.ok) return result;

	const ownerNote = result.ownerReady
		? result.welcomeSent
			? " Enviamos al dueño el correo para crear su contraseña."
			: ""
		: ` No se pudo dar de alta al dueño (${result.ownerError ?? "error desconocido"}); créalo desde la ficha de la empresa.`;
	return {
		ok: true,
		source: "onboarding",
		companyId: result.companyId,
		welcomeSent: result.welcomeSent,
		ownerReady: result.ownerReady,
		message: result.alreadyCompleted
			? `Este pago ya estaba validado.${ownerNote}`
			: `Pago validado: la empresa quedó activa.${ownerNote}`,
	};
}

export type ApplyPortalPaymentOptions = {
	now?: Date;
	/** Estados desde los que se puede dar por pagado. */
	claimFrom: string[];
	/** Con qué se cobró, si lo sabe quien aplica (PayPal lo fija al capturar). */
	method?: { slug: string; name: string };
	payerEmailNormalized?: string | null;
	paypalPayerIdHash?: string | null;
	/** Avisar al dueño por correo. */
	notify?: boolean;
};

/**
 * Da por pagado un pedido del portal y aplica lo comprado. Primero se reclama la fila
 * (`status` → `paid` solo si sigue en `claimFrom`): si el equipo valida y PayPal captura a la
 * vez, solo uno lo aplica.
 */
export async function applyPortalPayment(
	supabaseAdmin: SupabaseClient,
	payment: PortalPaymentRow,
	options: ApplyPortalPaymentOptions,
): Promise<PaymentReviewResult> {
	const now = options.now ?? new Date();
	const kind = classifyPortalPaymentReference(payment.payment_reference);
	if (!kind) {
		return { ok: false, error: "No reconocemos este tipo de pago; revísalo a mano.", status: 400 };
	}

	const { data: claimed } = await supabaseAdmin
		.from("payments_history")
		.update({
			status: "paid",
			payment_date: now.toISOString(),
			...(options.method ? { payment_method: options.method.name, payment_method_slug: options.method.slug } : {}),
			...(options.payerEmailNormalized ? { payer_email_normalized: options.payerEmailNormalized } : {}),
			...(options.paypalPayerIdHash ? { paypal_payer_id_hash: options.paypalPayerIdHash } : {}),
		})
		.eq("id", payment.id)
		.in("status", options.claimFrom)
		.select("id")
		.maybeSingle();
	if (!claimed) {
		return { ok: false, error: "Este pago ya fue procesado o no está pendiente.", status: 409 };
	}

	// Si algo falla después de reclamarlo, queda para revisión del equipo (con PayPal el
	// dinero ya entró: no puede volver a "pendiente de pago").
	const release = async () => {
		await supabaseAdmin
			.from("payments_history")
			.update({ status: "pending_validation", payment_date: payment.payment_date })
			.eq("id", payment.id);
	};

	const { data: company } = await supabaseAdmin
		.from("companies")
		.select("id,plan_id,country,subscription_status,subscription_ends_at")
		.eq("id", payment.company_id)
		.maybeSingle();
	if (!company) {
		await release();
		return { ok: false, error: "La empresa del pago ya no existe.", status: 404 };
	}
	const endsAt = (company.subscription_ends_at as string | null) ?? null;
	const timeZone = timeZoneForCountry(company.country as string | null);

	const cancelScheduledChanges = () =>
		supabaseAdmin
			.from("company_plan_change_schedules")
			.update({ status: "cancelled", updated_at: now.toISOString() })
			.eq("company_id", company.id)
			.eq("status", "scheduled");

	const switchPlan = async (planId: string) => {
		const { error } = await supabaseAdmin
			.from("companies")
			.update({ plan_id: planId, updated_at: now.toISOString() })
			.eq("id", company.id);
		if (error) return false;
		await syncCompanyPanelAccessFromPlanId(company.id, planId);
		await cancelScheduledChanges();
		return true;
	};

	let message: string;
	let detail: string | undefined;
	let newEndsAt: string | undefined;
	let reactivated = false;

	if (kind.kind === "plan_change") {
		// Se pagó la diferencia hasta el vencimiento: el plan cambia ya y el vencimiento no se toca.
		if (!(await switchPlan(payment.plan_id))) {
			await release();
			return { ok: false, error: "No se pudo aplicar el cambio de plan.", status: 500 };
		}
		message = "Pago validado: el cambio de plan quedó aplicado.";
		detail = "Tu nuevo plan ya está activo.";
	} else if (kind.kind === "renewal") {
		// Renovar una suscripción vencida puede traer otro plan: se cambia antes de sumar los meses.
		// Con el periodo vigente, el plan de la renovación es el que regirá al vencimiento (un
		// cambio programado se aplica solo).
		const phase = resolveSubscriptionPhase(company.subscription_status, endsAt, now);
		reactivated = phase === "expired";
		if (phase === "expired" && payment.plan_id && payment.plan_id !== company.plan_id) {
			if (!(await switchPlan(payment.plan_id))) {
				await release();
				return { ok: false, error: "No se pudo aplicar el plan de la renovación.", status: 500 };
			}
		}
		await activateCompanySubscription({
			supabaseAdmin,
			companyId: company.id,
			monthsPaid: getMonthsPaidFromPayment({ months_paid: payment.months_paid }, 1),
			now,
		});
		const { data: renewed } = await supabaseAdmin
			.from("companies")
			.select("subscription_ends_at")
			.eq("id", company.id)
			.maybeSingle();
		message = "Pago validado: la suscripción quedó renovada.";
		newEndsAt = renewed?.subscription_ends_at ? formatEmailDate(String(renewed.subscription_ends_at), timeZone) || undefined : undefined;
	} else if (kind.kind === "addon" && kind.addonId) {
		const { data: addon } = await supabaseAdmin
			.from("addons")
			.select("id,price_monthly,price_one_time")
			.eq("id", kind.addonId)
			.maybeSingle();
		if (!addon) {
			await release();
			return { ok: false, error: "No encontramos el extra de este pago.", status: 400 };
		}
		const { isMonthly } = resolveAddonUnitPrice(addon);
		await supabaseAdmin.from("company_addons").upsert(
			{
				company_id: company.id,
				addon_id: addon.id,
				status: "active",
				price_paid: Number(payment.amount_paid ?? 0) || null,
				// Los extras mensuales vencen junto con la suscripción y se renuevan con ella.
				expires_at: isMonthly ? endsAt : null,
				updated_at: now.toISOString(),
			},
			{ onConflict: "company_id,addon_id" },
		);
		message = "Pago validado: el extra quedó activo.";
		detail = isMonthly ? "Se renueva junto con tu plan." : undefined;
	} else {
		// Sucursales extra: se activa la compra ligada a este pago.
		await supabaseAdmin
			.from("company_branch_extra_entitlements")
			.update({ status: "active", starts_at: now.toISOString(), expires_at: endsAt, updated_at: now.toISOString() })
			.eq("payment_id", payment.id);
		message = "Pago validado: la sucursal extra quedó habilitada.";
		detail = "Nuestro equipo crea la sucursal y te avisa por Soporte.";
	}

	if (options.notify) {
		await notifyPortalPaymentApplied(supabaseAdmin, payment, {
			detail,
			newEndsAt,
			reactivated,
			method: options.method?.name ?? payment.payment_method ?? undefined,
			timeZone,
			now,
		});
	}

	return { ok: true, source: "portal", kind: kind.kind, companyId: company.id, message };
}

/** Lo que se pagó, en palabras («Renovación Pro · 3 meses», «Extra: Dominio propio»). */
async function describePayment(supabaseAdmin: SupabaseClient, payment: PortalPaymentRow): Promise<string> {
	const kind = classifyPortalPaymentReference(payment.payment_reference);
	const [{ data: plan }, { data: addon }] = await Promise.all([
		payment.plan_id
			? supabaseAdmin.from("plans").select("name").eq("id", payment.plan_id).maybeSingle()
			: Promise.resolve({ data: null }),
		kind?.addonId
			? supabaseAdmin.from("addons").select("name").eq("id", kind.addonId).maybeSingle()
			: Promise.resolve({ data: null }),
	]);
	return describePortalOrder(payment, {
		plan: () => (plan as { name?: string } | null)?.name ?? null,
		addon: () => (addon as { name?: string } | null)?.name ?? null,
	});
}

async function notifyPortalPaymentApplied(
	supabaseAdmin: SupabaseClient,
	payment: PortalPaymentRow,
	info: { detail?: string; newEndsAt?: string; reactivated: boolean; method?: string; timeZone: string; now: Date },
): Promise<void> {
	try {
		const contact = await resolveCompanyContact(supabaseAdmin, payment.company_id);
		if (!contact.email) return;
		await sendEmail({
			kind: "payment_received",
			to: contact.email,
			companyId: payment.company_id,
			// PayPal y el equipo pueden llegar a la vez: un solo aviso por pago.
			dedupeKey: `payment-received:${payment.id}`,
			client: supabaseAdmin,
			data: {
				name: contact.responsibleName || undefined,
				businessName: contact.businessName,
				concept: await describePayment(supabaseAdmin, payment),
				amount: formatUsd(payment.amount_paid),
				method: info.method,
				reference: payment.payment_reference ?? undefined,
				paidAt: formatEmailDate(info.now, info.timeZone),
				newEndsAt: info.newEndsAt,
				detail: info.detail,
				reactivated: info.reactivated,
			},
		});
	} catch (error) {
		// El pago ya quedó aplicado: un correo que no sale no lo deshace.
		console.error("portal payment email:", error);
	}
}

/** Frase para el equipo según si el aviso al cliente salió o no. */
function customerNotice(result: { status: string; reason?: string; error?: string } | null): string {
	if (!result) return " El negocio no tiene correo: avísale por otra vía.";
	if (result.status === "sent" || result.status === "duplicate") return " Avisamos al cliente por correo.";
	return ` No se pudo avisar por correo (${result.reason ?? result.error ?? "error"}): avísale por otra vía.`;
}

export async function rejectPayment(params: ReviewParams & { reason?: string | null }): Promise<PaymentReviewResult> {
	const { supabaseAdmin } = params;
	const now = params.now ?? new Date();
	const reason = String(params.reason ?? "").trim().slice(0, 280);

	const payment = await findPortalPayment(params);
	if (payment) {
		const { data: rejected } = await supabaseAdmin
			.from("payments_history")
			.update({ status: "rejected" })
			.eq("id", payment.id)
			.eq("status", "pending_validation")
			.select("id")
			.maybeSingle();
		if (!rejected) {
			return { ok: false, error: "Este pago ya fue procesado o no está pendiente de validación.", status: 409 };
		}
		// La compra sigue abierta: el dueño puede mandar otro comprobante o pagar con PayPal.
		// Si la anula, `cancelPortalOrder` cierra también la sucursal pendiente.

		const contact = await resolveCompanyContact(supabaseAdmin, payment.company_id);
		const sent = contact.email
			? await sendEmail({
					kind: "payment_rejected",
					to: contact.email,
					companyId: payment.company_id,
					client: supabaseAdmin,
					data: {
						name: contact.responsibleName || undefined,
						businessName: contact.businessName,
						concept: await describePayment(supabaseAdmin, payment),
						reference: String(payment.payment_reference ?? ""),
						reason: reason || undefined,
						actionUrl: accountUrl("facturacion"),
						context: "portal",
					},
				})
			: null;
		return { ok: true, source: "portal", companyId: payment.company_id, message: `Pago rechazado.${customerNotice(sent)}` };
	}

	const app = await findOnboardingApplication(supabaseAdmin, params.paymentReference);
	if (!app) return { ok: false, error: "Pago no encontrado", status: 404 };

	const { data: rejected } = await supabaseAdmin
		.from("onboarding_applications")
		.update({ payment_status: "rejected", updated_at: now.toISOString() })
		.eq("id", app.id)
		.in("payment_status", ["pending_validation", "pending"])
		.select("id")
		.maybeSingle();
	if (!rejected) {
		return { ok: false, error: "Este pago ya fue procesado o no está pendiente de validación.", status: 409 };
	}

	const appUrl = getEmailBrand().appUrl;
	const payUrl = app.verification_token
		? `${appUrl}/onboarding/pago?token=${encodeURIComponent(String(app.verification_token))}`
		: `${appUrl}/onboarding`;
	const sent = app.email
		? await sendEmail({
				kind: "payment_rejected",
				to: String(app.email),
				applicationId: String(app.id),
				companyId: app.company_id ?? null,
				client: supabaseAdmin,
				data: {
					name: String(app.responsible_name ?? ""),
					businessName: String(app.business_name ?? "tu negocio"),
					reference: String(app.payment_reference ?? ""),
					reason: reason || undefined,
					actionUrl: payUrl,
					context: "onboarding",
				},
			})
		: null;
	return { ok: true, source: "onboarding", companyId: app.company_id ?? null, message: `Pago rechazado.${customerNotice(sent)}` };
}
