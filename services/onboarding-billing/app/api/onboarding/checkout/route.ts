import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import {
	checkCouponForApplication,
	clearApplicationCoupon,
	findSubscriptionCouponById,
} from "@/lib/billing/subscription-coupon-service";
import {
	computeCouponPricing,
	couponGrantFromRow,
	resolveOnboardingGrant,
	round2,
	type SubscriptionCouponRow,
} from "@/lib/billing/subscription-coupons";
import {
	calculateAddonsTotalUsd,
	getManualMethodConfig,
	getMercadoPagoOffer,
	isManualMethod,
	resolveCheckoutPlan,
	resolveCheckoutPlanPrice,
	updateApplicationPaymentState,
} from "@/lib/onboarding/checkout-service";
import { completeOnboardingPayment } from "@/lib/onboarding/complete-onboarding-payment";
import { isFirstPaymentPromoEligible } from "@/lib/onboarding/first-payment-promo-service";
import { alertOnboardingTeam } from "@/lib/onboarding/team-alerts";
import { isPaymentMethodAvailableForCountry } from "@/lib/payments/payment-method-countries";
import { createMercadoPagoPreference, toClp, toMercadoPagoReference } from "@/lib/payments/mercadopago";
import { createPayPalOrder, encodePayPalCustomId, isPayPalConfigured } from "@/lib/payments/paypal";
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
	responsible_name: string | null;
	phone: string | null;
	coupon_id: string | null;
	coupon_code: string | null;
};

export async function POST(req: NextRequest) {
	try {
		const body = (await req.json().catch(() => ({}))) as { token: string; months?: number; method?: string };
		const token = typeof body.token === "string" ? body.token.trim() : "";
		const months = Math.min(12, Math.max(1, Number(body.months) || 1));

		if (!token) {
			return NextResponse.json({ error: "Falta el enlace de tu solicitud. Vuelve a abrirlo desde el correo." }, { status: 400 });
		}

		const { data, error: appError } = await supabaseAdmin
			.from("onboarding_applications")
			.select("id,email,plan_id,country,currency,company_id,subscription_payment_method,payment_status,business_name,responsible_name,phone,coupon_id,coupon_code")
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

		// Mercado Pago se elige en esta misma página, como alternativa al método del paso 2.
		const subscriptionMethod =
			body.method === "mercadopago" ? "mercadopago" : (app.subscription_payment_method ?? "").trim().toLowerCase();
		if (!subscriptionMethod) {
			return NextResponse.json({ error: "Selecciona un método de pago" }, { status: 400 });
		}

		const { data: methodRow } = await supabaseAdmin
			.from("plan_payment_methods")
			.select("slug,name,is_active,countries")
			.eq("slug", subscriptionMethod)
			.maybeSingle();

		const isPayPal = subscriptionMethod === "paypal";
		const isManualPayment = isManualMethod(subscriptionMethod);
		const mercadoPago = subscriptionMethod === "mercadopago" ? await getMercadoPagoOffer(supabaseAdmin, app.country) : null;
		if (
			!methodRow?.is_active ||
			(!isPayPal && !isManualPayment && !mercadoPago) ||
			!isPaymentMethodAvailableForCountry(methodRow.countries, app.country)
		) {
			return NextResponse.json({ error: "El método de pago elegido no está disponible. Elige otro." }, { status: 400 });
		}

		const planResult = await resolveCheckoutPlan(supabaseAdmin, app);
		if (!planResult.plan) {
			return NextResponse.json({ error: planResult.error }, { status: planResult.status });
		}
		const plan = planResult.plan;
		const planPricing = resolveCheckoutPlanPrice(plan, app.country);

		// El cupón se vuelve a comprobar aquí, con los meses definitivos: lo que valía al
		// aplicarlo puede haber vencido o agotado su cupo mientras la persona decidía.
		let coupon: SubscriptionCouponRow | null = null;
		if (app.coupon_id) {
			const row = await findSubscriptionCouponById(supabaseAdmin, app.coupon_id);
			const check = await checkCouponForApplication(supabaseAdmin, { coupon: row, email: app.email, planId: app.plan_id, months });
			if (!check.ok) {
				const code = String(app.coupon_code ?? row?.code ?? "").trim();
				// Se quita para que el siguiente intento no vuelva a chocar con él.
				await clearApplicationCoupon(supabaseAdmin, app.id);
				return NextResponse.json(
					{
						error: `El cupón ${code} ya no se puede usar: ${check.message.replace(/^Ese cupón /, "")} Lo quitamos: puedes pagar sin él o probar otro.`,
						coupon_invalid: true,
						problem: check.problem,
					},
					{ status: 409 },
				);
			}
			coupon = check.coupon;
		}

		const isPromoEligible = await isFirstPaymentPromoEligible(supabaseAdmin, {
			email: app.email,
			excludeCompanyId: app.company_id,
		});
		const grant = resolveOnboardingGrant({ monthsPaid: months, promoEligible: isPromoEligible, coupon: couponGrantFromRow(coupon) });

		const addonsTotalUsd = await calculateAddonsTotalUsd(supabaseAdmin, app.id, grant.chargedMonths, plan);
		const baseAmountUsd = round2(Number(planPricing.price ?? 0) * grant.chargedMonths + addonsTotalUsd);
		if (!(baseAmountUsd > 0)) {
			return NextResponse.json({ error: "No pudimos calcular el total. Escríbenos a soporte." }, { status: 409 });
		}
		const pricing = computeCouponPricing(coupon, baseAmountUsd);
		const amountUsd = pricing.amountUsd;
		const couponSnapshot = coupon
			? { discountUsd: pricing.discountUsd, freeMonths: grant.couponFreeMonths, keepsPromo: coupon.keeps_promo !== false }
			: null;

		// Aviso por Telegram solo la primera vez que inicia un pago: un reintento o un cambio
		// de meses no vuelve a avisar (el comprobante y la activación tienen aviso propio).
		// Mercado Pago cobra en CLP: el total en USD a la tasa del panel, redondeado al peso.
		const amountClp = mercadoPago ? toClp(amountUsd, mercadoPago.rate) : 0;
		const notifyPlanChosen = async () => {
			if (String(app.payment_status ?? "").trim()) return;
			await alertOnboardingTeam({
				kind: "plan_chosen",
				businessName: app.business_name,
				responsibleName: app.responsible_name,
				email: app.email,
				phone: app.phone,
				planName: plan.name,
				months: grant.chargedMonths,
				amount: amountClp
					? `$${amountUsd.toFixed(2)} USD (CLP ${amountClp.toLocaleString("es-CL")})`
					: `$${amountUsd.toFixed(2)} USD`,
				method: methodRow.name ?? subscriptionMethod,
				coupon: coupon?.code ?? null,
			});
		};

		const summary = {
			country: app.country,
			plan_name: plan.name,
			plan_price: planPricing.price,
			plan_region: planPricing.continent,
			plan_currency: planPricing.currency,
			addons_total_usd: addonsTotalUsd,
			base_amount_usd: baseAmountUsd,
			amount_usd: amountUsd,
			months: grant.chargedMonths,
			granted_months: grant.grantedMonths,
			promo_applied: grant.promoApplied,
			coupon_code: coupon?.code ?? null,
			coupon_discount_usd: pricing.discountUsd,
			coupon_free_months: grant.couponFreeMonths,
			currency: app.currency || "USD",
			...(amountClp ? { amount_clp: amountClp } : {}),
		};

		// Cupón que cubre todo el importe: no hay nada que cobrar y el alta se cierra aquí
		// mismo, con la misma vía que un pago confirmado (empresa, suscripción, dueño, canje).
		if (coupon && amountUsd <= 0) {
			const paymentRef = `coupon-${app.id}-${Date.now()}`;
			await updateApplicationPaymentState(supabaseAdmin, app.id, {
				applicationStatus: "payment_pending",
				paymentReference: paymentRef,
				paymentStatus: "pending",
				paymentReferenceUrl: null,
				paymentMonths: grant.chargedMonths,
				paymentAmount: 0,
				coupon: couponSnapshot,
			});
			const result = await completeOnboardingPayment({
				supabaseAdmin,
				applicationId: app.id,
				paymentReference: paymentRef,
				amountPaid: 0,
				methodSlug: "coupon",
				methodName: `Cupón ${coupon.code}`,
				chargedMonths: grant.chargedMonths,
				grantedMonths: grant.grantedMonths,
				promoApplied: grant.promoApplied,
				isManualPayment: false,
			});
			if (!result.ok) {
				return NextResponse.json({ error: result.error }, { status: result.status });
			}
			return NextResponse.json({ ok: true, free: true, ref: paymentRef, ...summary });
		}

		if (isPayPal) {
			if (!isPayPalConfigured()) {
				return NextResponse.json({ error: "PayPal no está disponible en este momento. Elige otro método." }, { status: 503 });
			}
			const appUrl = getAppUrl();
			const order = await createPayPalOrder({
				amountUsd,
				description: `${plan.name} · ${app.business_name}`,
				meta: {
					kind: "onboarding",
					applicationId: app.id,
					chargedMonths: grant.chargedMonths,
					grantedMonths: grant.grantedMonths,
					promoApplied: grant.promoApplied,
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
				paymentMonths: grant.chargedMonths,
				paymentAmount: amountUsd,
				coupon: couponSnapshot,
			});
			await notifyPlanChosen();

			return NextResponse.json({ ok: true, sessionId: order.orderId, url: order.approveUrl, ...summary });
		}

		if (mercadoPago) {
			if (!(amountClp > 0)) {
				return NextResponse.json({ error: "No pudimos calcular el total en pesos. Escríbenos a soporte." }, { status: 409 });
			}
			const preference = await createMercadoPagoPreference({
				amountClp,
				title: `${plan.name} · ${app.business_name}`,
				// Mismo contenido que el customId de PayPal (meses pagados y otorgados), con `_` en vez de `|`.
				externalReference: toMercadoPagoReference(
					encodePayPalCustomId({
						kind: "onboarding",
						applicationId: app.id,
						chargedMonths: grant.chargedMonths,
						grantedMonths: grant.grantedMonths,
						promoApplied: grant.promoApplied,
					}),
				),
				returnUrl: `${getAppUrl()}/api/onboarding/mercadopago-return`,
			});
			if (!preference.ok) {
				return NextResponse.json({ error: preference.error }, { status: 502 });
			}

			// La preferencia vigente queda en la solicitud: el regreso y el webhook solo aceptan esta.
			await updateApplicationPaymentState(supabaseAdmin, app.id, {
				applicationStatus: "payment_pending",
				paymentReference: preference.preferenceId,
				paymentStatus: "pending",
				paymentReferenceUrl: null,
				paymentMonths: grant.chargedMonths,
				paymentAmount: amountUsd,
				coupon: couponSnapshot,
			});
			await notifyPlanChosen();

			return NextResponse.json({ ok: true, url: preference.checkoutUrl, ...summary });
		}

		const paymentRef = `manual-${app.id}-${Date.now()}`;
		await updateApplicationPaymentState(supabaseAdmin, app.id, {
			applicationStatus: "payment_pending",
			paymentReference: paymentRef,
			paymentStatus: "pending_validation",
			// Un comprobante subido para otro importe no vale para este.
			paymentReferenceUrl: null,
			paymentMonths: grant.chargedMonths,
			paymentAmount: amountUsd,
			coupon: couponSnapshot,
		});
		await notifyPlanChosen();

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
