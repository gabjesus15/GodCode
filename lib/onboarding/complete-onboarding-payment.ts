import type { SupabaseClient } from "@supabase/supabase-js";

import { createPasswordSetupLink } from "@/lib/auth/password-setup-link";
import { sendEmail } from "@/lib/email/send";
import { getAppUrl } from "@/lib/tenant/app-url";
import { getTenantHomeUrl } from "../../utils/tenant-url";
import { activateCompanyAddonsFromApplication, activateCompanySubscription } from "./billing-activation";
import { formatContactDate, getBookingContactDate, queueBookingReminder } from "./booking-notifications";
import { provisionCompanyFromApplication, type OnboardingApplication } from "./checkout-service";
import { ensureCompanyOwner } from "./company-owner";

/** Tras este tiempo, un cierre que quedó a medias se puede retomar. */
const STALE_CLAIM_MS = 5 * 60_000;

/** Estados de pago de la solicitud desde los que se puede cerrar el alta. */
const CLAIMABLE_PAYMENT_STATUSES = ["pending", "pending_validation", "rejected"];

export type CompleteOnboardingPaymentInput = {
	supabaseAdmin: SupabaseClient;
	applicationId: string;
	/** Referencia del cobro (id de orden PayPal o `manual-…`); debe coincidir con la solicitud. */
	paymentReference: string;
	/** Importe recibido en USD. */
	amountPaid: number;
	methodSlug: string;
	methodName: string;
	chargedMonths: number;
	/** Meses que se otorgan (incluye el de regalo de la promo, si aplicó). */
	grantedMonths: number;
	promoApplied: boolean;
	isManualPayment: boolean;
	payerEmailNormalized?: string | null;
	paypalPayerIdHash?: string | null;
	now?: Date;
};

export type CompleteOnboardingPaymentResult =
	| {
			ok: true;
			companyId: string;
			/** `true` si otra llamada ya había cerrado el alta (no se volvió a activar nada). */
			alreadyCompleted: boolean;
			ownerReady: boolean;
			welcomeSent: boolean;
			ownerError?: string;
	  }
	| { ok: false; error: string; status: number };

type ApplicationRow = OnboardingApplication & {
	status: string;
	responsible_name: string | null;
	welcome_email_sent_at: string | null;
	updated_at: string;
	currency?: string | null;
};

const APPLICATION_COLUMNS =
	"id,status,payment_status,payment_reference,company_id,plan_id,business_name,responsible_name,email,billing_rut,fiscal_address,logo_url,social_instagram,subscription_payment_method,welcome_email_sent_at,updated_at,country,currency";

/**
 * Cierra el alta de una solicitud cuyo pago ya está confirmado (PayPal capturado o
 * transferencia validada por el equipo). Es la única vía que crea la empresa, registra el
 * pago, activa la suscripción (con el mes de regalo si aplica) y da de alta al dueño.
 *
 * Idempotente: la solicitud se "reclama" pasando su estado de pago a `paid` con una
 * condición atómica; solo quien la reclama activa la suscripción. Una segunda llamada
 * (doble clic, reintento del navegador, la página de éxito) solo se asegura de que el
 * dueño tenga acceso. Antes, `finalize` volvía a activar la suscripción en cada llamada.
 */
export async function completeOnboardingPayment(
	input: CompleteOnboardingPaymentInput,
): Promise<CompleteOnboardingPaymentResult> {
	const { supabaseAdmin } = input;
	const now = input.now ?? new Date();

	const { data: appData } = await supabaseAdmin
		.from("onboarding_applications")
		.select(APPLICATION_COLUMNS)
		.eq("id", input.applicationId)
		.maybeSingle();
	const app = appData as ApplicationRow | null;
	if (!app) return { ok: false, error: "Solicitud no encontrada", status: 404 };

	if (String(app.payment_reference ?? "") !== input.paymentReference) {
		return { ok: false, error: "El pago no corresponde a esta solicitud", status: 409 };
	}

	const { data: claimed } = await supabaseAdmin
		.from("onboarding_applications")
		.update({ payment_status: "paid", updated_at: now.toISOString() })
		.eq("id", app.id)
		.in("payment_status", CLAIMABLE_PAYMENT_STATUSES)
		.select("id")
		.maybeSingle();

	if (!claimed) {
		if (String(app.payment_status ?? "") !== "paid") {
			return { ok: false, error: "Este pago no está pendiente", status: 409 };
		}
		const { data: paymentRow } = await supabaseAdmin
			.from("payments_history")
			.select("id,status")
			.eq("payment_reference", input.paymentReference)
			.maybeSingle();
		const applied = Boolean(app.company_id && paymentRow?.status === "paid");
		const stale = now.getTime() - new Date(app.updated_at).getTime() > STALE_CLAIM_MS;

		if (applied) {
			return finishOwnerAccess({ supabaseAdmin, app, companyId: String(app.company_id), alreadyCompleted: true, now });
		}
		if (!stale) {
			return { ok: false, error: "Estamos procesando este pago. Intenta de nuevo en un minuto.", status: 409 };
		}
		// Un cierre anterior quedó a medias (se cayó tras reclamar): se retoma entero.
	}

	const companyResult = await provisionCompanyFromApplication(supabaseAdmin, app, input.isManualPayment);
	if (!companyResult.ok) {
		// Se libera la solicitud para poder reintentar sin tocar la base a mano.
		await supabaseAdmin
			.from("onboarding_applications")
			.update({ payment_status: input.isManualPayment ? "pending_validation" : "pending", updated_at: now.toISOString() })
			.eq("id", app.id);
		return { ok: false, error: companyResult.error, status: companyResult.status };
	}
	const companyId = companyResult.company.id;

	const paymentFields = {
		company_id: companyId,
		plan_id: app.plan_id,
		amount_paid: Number.isFinite(input.amountPaid) ? input.amountPaid : 0,
		payment_method: input.methodName,
		payment_method_slug: input.methodSlug,
		payment_reference: input.paymentReference,
		payment_date: now.toISOString(),
		status: "paid",
		months_paid: input.chargedMonths,
		payer_email_normalized: input.payerEmailNormalized || null,
		paypal_payer_id_hash: input.paypalPayerIdHash || null,
	};
	const { data: existingPayment } = await supabaseAdmin
		.from("payments_history")
		.select("id,status")
		.eq("payment_reference", input.paymentReference)
		.maybeSingle();

	if (existingPayment?.status === "paid") {
		// Otra vía ya registró y activó este cobro: no se suma tiempo dos veces.
		return finishOwnerAccess({ supabaseAdmin, app, companyId, alreadyCompleted: true, now });
	}

	const { error: paymentError } = existingPayment?.id
		? await supabaseAdmin.from("payments_history").update(paymentFields).eq("id", existingPayment.id)
		: await supabaseAdmin.from("payments_history").insert(paymentFields);
	if (paymentError) {
		return { ok: false, error: "No se pudo registrar el pago", status: 500 };
	}

	try {
		await activateCompanySubscription({
			supabaseAdmin,
			companyId,
			monthsPaid: input.grantedMonths,
			now,
		});
	} catch {
		// El pago ya figura como pagado: sin esto, un reintento lo daría por completo sin
		// activar nada. Queda para que el equipo lo valide a mano.
		await supabaseAdmin
			.from("payments_history")
			.update({ status: "pending_validation" })
			.eq("payment_reference", input.paymentReference);
		return { ok: false, error: "No se pudo activar la suscripción; el pago quedó para revisión.", status: 500 };
	}

	const companyPatch: Record<string, unknown> = {};
	if (input.promoApplied) companyPatch.first_payment_promo_used_at = now.toISOString();
	if (app.country) companyPatch.country = app.country;
	if (app.currency) companyPatch.currency = app.currency;
	if (Object.keys(companyPatch).length > 0) {
		await supabaseAdmin.from("companies").update(companyPatch).eq("id", companyId);
	}

	await activateCompanyAddonsFromApplication({
		supabaseAdmin,
		applicationId: app.id,
		companyId,
		monthsPaid: input.grantedMonths,
		now,
	});

	await supabaseAdmin
		.from("onboarding_applications")
		.update({ company_id: companyId, status: "active", payment_status: "paid", updated_at: now.toISOString() })
		.eq("id", app.id);

	return finishOwnerAccess({ supabaseAdmin, app, companyId, alreadyCompleted: false, now });
}

export type OnboardingPaymentStatus =
	| { status: "paid"; companyId: string; ownerReady: boolean; welcomeSent: boolean }
	| { status: "pending" }
	| { status: "not_found" };

/**
 * Para la página de éxito del pago: si el alta ya está cobrada, se asegura de que el
 * dueño tenga acceso (idempotente) y lo informa. Nunca activa ni suma tiempo; antes
 * `finalize` reactivaba la suscripción en cada llamada con una referencia pagada.
 */
export async function ensureOnboardingOwnerAccess(params: {
	supabaseAdmin: SupabaseClient;
	paymentReference: string;
	now?: Date;
}): Promise<OnboardingPaymentStatus> {
	const { data } = await params.supabaseAdmin
		.from("onboarding_applications")
		.select(APPLICATION_COLUMNS)
		.eq("payment_reference", params.paymentReference)
		.maybeSingle();
	const app = data as ApplicationRow | null;
	if (!app) return { status: "not_found" };
	if (String(app.payment_status ?? "") !== "paid" || !app.company_id) return { status: "pending" };

	const result = await finishOwnerAccess({
		supabaseAdmin: params.supabaseAdmin,
		app,
		companyId: String(app.company_id),
		alreadyCompleted: true,
		now: params.now ?? new Date(),
	});
	return result.ok
		? { status: "paid", companyId: result.companyId, ownerReady: result.ownerReady, welcomeSent: result.welcomeSent }
		: { status: "pending" };
}

/** Alta del dueño + correo de bienvenida con el enlace para crear la contraseña. */
async function finishOwnerAccess(params: {
	supabaseAdmin: SupabaseClient;
	app: ApplicationRow;
	companyId: string;
	alreadyCompleted: boolean;
	now: Date;
}): Promise<CompleteOnboardingPaymentResult> {
	const { supabaseAdmin, app, companyId, alreadyCompleted, now } = params;

	const owner = await ensureCompanyOwner(supabaseAdmin, {
		companyId,
		email: app.email,
		fullName: app.responsible_name,
	});
	if (!owner.ok) {
		return { ok: true, companyId, alreadyCompleted, ownerReady: false, welcomeSent: false, ownerError: owner.error };
	}

	if (app.welcome_email_sent_at) {
		return { ok: true, companyId, alreadyCompleted, ownerReady: true, welcomeSent: false };
	}

	// Seguimiento interno del equipo (tickets de entrega); su fecha va en la bienvenida.
	let contactDate: string | undefined;
	try {
		const booking = await queueBookingReminder({
			supabaseAdmin,
			companyId,
			businessName: app.business_name,
			requesterEmail: app.email,
			scheduledFor: getBookingContactDate(now),
		});
		contactDate = formatContactDate(booking.scheduledFor);
	} catch (error) {
		console.error("onboarding booking reminder:", error);
	}

	const setupLink = await createPasswordSetupLink(supabaseAdmin, app.email);
	const { data: company } = await supabaseAdmin
		.from("companies")
		.select("public_slug,custom_domain")
		.eq("id", companyId)
		.maybeSingle();
	const storeUrl = company?.public_slug ? getTenantHomeUrl(String(company.public_slug), company.custom_domain) : "";
	const loginUrl = `${getAppUrl()}/login`;

	const result = await sendEmail({
		kind: "welcome",
		to: app.email,
		applicationId: app.id,
		companyId,
		// La página de éxito y la validación pueden llegar a la vez: una sola bienvenida.
		dedupeKey: `welcome:${app.id}`,
		client: supabaseAdmin,
		data: {
			name: app.responsible_name ?? "",
			businessName: app.business_name,
			setPasswordUrl: setupLink ?? loginUrl,
			loginUrl,
			storeUrl: storeUrl || undefined,
			contactDate,
		},
	});
	const sent = { ok: result.status === "sent" || result.status === "duplicate" };

	if (sent.ok) {
		await supabaseAdmin
			.from("onboarding_applications")
			.update({ welcome_email_sent_at: now.toISOString(), updated_at: now.toISOString() })
			.eq("id", app.id);
	}

	return { ok: true, companyId, alreadyCompleted, ownerReady: true, welcomeSent: sent.ok };
}
