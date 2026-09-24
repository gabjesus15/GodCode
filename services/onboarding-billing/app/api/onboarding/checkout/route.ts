import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import {
	calculateAddonsTotalUsd,
	getManualMethodConfig,
	isManualMethod,
	isOnlineMethod,
	resolveCheckoutPlan,
	resolveCheckoutPlanPrice,
	updateApplicationPaymentState,
} from "@/lib/onboarding/checkout-service";
import { resolveFirstPaymentPromo } from "@/lib/onboarding/first-payment-promo";
import { isFirstPaymentPromoEligible } from "@/lib/onboarding/first-payment-promo-service";
import { isPaymentMethodAvailableForCountry } from "@/lib/payments/payment-method-countries";
import { createPayPalOrder, isPayPalConfigured } from "@/lib/payments/paypal";
import { getAppUrl } from "@/lib/tenant/app-url";

/** @service-role capability-token */

type CheckoutApplication = {
	id: string;
	email: string;
	plan_id: string;
	country: string | null;
	currency: string | null;
	company_id: string | null;
	subscription_payment_method: string | null;
	payment_status: string | null;
	business_name: string;
};

export async function POST(req: NextRequest) {
	try {
		const body = (await req.json().catch(() => ({}))) as { token: string; months?: number };
		const token = typeof body.token === "string" ? body.token.trim() : "";
		const months = Math.min(12, Math.max(1, Number(body.months) || 1));

		if (!token) {
			return NextResponse.json({ error: "Falta el enlace de tu solicitud. Vuelve a abrirlo desde el correo." }, { status: 400 });
		}

		const { data, error: appError } = await supabaseAdmin
			.from("onboarding_applications")
			.select("id,email,plan_id,country,currency,company_id,subscription_payment_method,payment_status,business_name")
			.eq("verification_token", token)
			.in("status", ["form_completed", "payment_pending"])
			.maybeSingle();
		const app = data as CheckoutApplication | null;

		if (appError || !app) {
			return NextResponse.json({ error: "Solicitud no encontrada o incompleta" }, { status: 404 });
		}
		// Un pago ya cobrado no se vuelve a iniciar (evita cobrar dos veces).
		if (app.payment_status === "paid") {
			return NextResponse.json({ error: "Tu pago ya está registrado." }, { status: 409 });
		}

		const subscriptionMethod = (app.subscription_payment_method ?? "").trim().toLowerCase();
		if (!subscriptionMethod) {
			return NextResponse.json({ error: "Selecciona un método de pago" }, { status: 400 });
		}

		const { data: methodRow } = await supabaseAdmin
			.from("plan_payment_methods")
			.select("slug,name,is_active,countries")
			.eq("slug", subscriptionMethod)
			.maybeSingle();

		const isPayPal = isOnlineMethod(subscriptionMethod);
		const isManualPayment = isManualMethod(subscriptionMethod);
		if (
			!methodRow?.is_active ||
			(!isPayPal && !isManualPayment) ||
			!isPaymentMethodAvailableForCountry(methodRow.countries, app.country)
		) {
			return NextResponse.json({ error: "El método de pago elegido no está disponible. Elige otro." }, { status: 400 });
		}
		if (isPayPal && !isPayPalConfigured()) {
			return NextResponse.json({ error: "PayPal no está disponible en este momento. Elige otro método." }, { status: 503 });
		}

		const planResult = await resolveCheckoutPlan(supabaseAdmin, app);
		if (!planResult.plan) {
			return NextResponse.json({ error: planResult.error }, { status: planResult.status });
		}
		const plan = planResult.plan;
		const planPricing = resolveCheckoutPlanPrice(plan, app.country);

		const isPromoEligible = await isFirstPaymentPromoEligible(supabaseAdmin, {
			email: app.email,
			excludeCompanyId: app.company_id,
		});
		const promo = resolveFirstPaymentPromo(months, isPromoEligible);

		const addonsTotalUsd = await calculateAddonsTotalUsd(supabaseAdmin, app.id, promo.chargedMonths, plan);
		const amountUsd = Number((Number(planPricing.price ?? 0) * promo.chargedMonths + addonsTotalUsd).toFixed(2));
		if (!(amountUsd > 0)) {
			return NextResponse.json({ error: "No pudimos calcular el total. Escríbenos a soporte." }, { status: 409 });
		}

		const summary = {
			country: app.country,
			plan_name: plan.name,
			plan_price: planPricing.price,
			plan_region: planPricing.continent,
			plan_currency: planPricing.currency,
			addons_total_usd: addonsTotalUsd,
			amount_usd: amountUsd,
			months: promo.chargedMonths,
			granted_months: promo.grantedMonths,
			promo_applied: promo.promoApplied,
			currency: app.currency || "USD",
		};

		if (isPayPal) {
			const appUrl = getAppUrl();
			const order = await createPayPalOrder({
				amountUsd,
				description: `${plan.name} · ${app.business_name}`,
				meta: {
					kind: "onboarding",
					applicationId: app.id,
					chargedMonths: promo.chargedMonths,
					grantedMonths: promo.grantedMonths,
				},
				returnUrl: `${appUrl}/api/onboarding/paypal-capture`,
				cancelUrl: `${appUrl}/onboarding/pago?token=${encodeURIComponent(token)}`,
			});
			if (!order.ok) {
				return NextResponse.json({ error: order.error }, { status: 502 });
			}

			// La orden vigente queda en la solicitud: la captura solo acepta esta.
			await updateApplicationPaymentState(supabaseAdmin, app.id, {
				applicationStatus: "payment_pending",
				paymentReference: order.orderId,
				paymentStatus: "pending",
				paymentReferenceUrl: null,
				paymentMonths: promo.chargedMonths,
				paymentAmount: amountUsd,
			});

			return NextResponse.json({ ok: true, sessionId: order.orderId, url: order.approveUrl, ...summary });
		}

		const paymentRef = `manual-${app.id}-${Date.now()}`;
		await updateApplicationPaymentState(supabaseAdmin, app.id, {
			applicationStatus: "payment_pending",
			paymentReference: paymentRef,
			paymentStatus: "pending_validation",
			// Un comprobante subido para otro importe no vale para este.
			paymentReferenceUrl: null,
			paymentMonths: promo.chargedMonths,
			paymentAmount: amountUsd,
		});

		const methodConfig = await getManualMethodConfig(supabaseAdmin, subscriptionMethod);

		return NextResponse.json({
			ok: true,
			manual: true,
			payment_reference: paymentRef,
			method_slug: subscriptionMethod,
			method_name: methodRow.name ?? subscriptionMethod,
			method_config: methodConfig,
			...summary,
		});
	} catch (err) {
		console.error("onboarding checkout error:", err);
		return NextResponse.json({ error: "Error interno. Intenta más tarde." }, { status: 500 });
	}
}
