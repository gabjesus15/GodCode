import { NextRequest, NextResponse } from "next/server";
import {
	Client,
	Environment,
	OrdersController,
	CheckoutPaymentIntent,
} from "@paypal/paypal-server-sdk";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import {
	isManualMethod,
	resolveCheckoutPlan,
	resolveCheckoutPlanPrice,
	calculateAddonsTotalUsd,
	getManualMethodConfig,
	updateApplicationPaymentState,
} from "@/lib/onboarding/checkout-service";
import { normalizeEmail } from "@/lib/onboarding/trial-eligibility";

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY ?? "";
const PAYPAL_CLIENT_ID = (process.env.PAYPAL_CLIENT_ID ?? "").trim();
const PAYPAL_CLIENT_SECRET = (process.env.PAYPAL_CLIENT_SECRET ?? "").trim();
const STRIPE_SUCCESS_URL =
	process.env.STRIPE_SUCCESS_URL ??
	(process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN
		? `${process.env.NEXT_PUBLIC_TENANT_PROTOCOL || "https"}://${process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN}/checkout/success`
		: "http://localhost:3001/checkout/success");
const STRIPE_CANCEL_URL =
	process.env.STRIPE_CANCEL_URL ??
	(process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN
		? `${process.env.NEXT_PUBLIC_TENANT_PROTOCOL || "https"}://${process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN}/onboarding/pago`
		: "http://localhost:3001/onboarding/pago");

const COUNTRY_NORMALIZE: Record<string, string> = {
	Chile: "CL",
	Venezuela: "VE",
	CL: "CL",
	VE: "VE",
};

const ALWAYS_AVAILABLE_METHODS = new Set(["stripe", "paypal"]);

function getMethodCountries(method: { countries?: string[] | null }): string[] {
	return Array.isArray(method.countries)
		? method.countries.map((value) => String(value).trim()).filter(Boolean)
		: [];
}

function isMethodAvailableForCountry(method: { slug?: string | null; countries?: string[] | null }, country: string | null | undefined): boolean {
	const rawCountry = country?.trim() ?? null;
	const normalizedCountry = rawCountry ? COUNTRY_NORMALIZE[rawCountry] ?? rawCountry : null;
	const slug = String(method.slug ?? "").trim().toLowerCase();
	if (ALWAYS_AVAILABLE_METHODS.has(slug)) return true;
	if (!normalizedCountry && !rawCountry) return true;

	const countries = getMethodCountries(method);
	if (countries.length === 0) return false;
	return countries.includes(normalizedCountry ?? "") || countries.includes(rawCountry ?? "");
}

export async function POST(req: NextRequest) {
	try {
		const body = (await req.json().catch(() => ({}))) as { token: string; months?: number };
		const token = typeof body.token === "string" ? body.token.trim() : "";
		const months = Math.min(12, Math.max(1, Number(body.months) || 1));
		const isOneMonthTrialAttempt = months === 1;

		if (!token) {
			return NextResponse.json({ error: "Token faltante" }, { status: 400 });
		}

		const { data: app, error: appError } = await supabaseAdmin
			.from("onboarding_applications")
			.select(
				"id,business_name,responsible_name,email,legal_name,logo_url,fiscal_address,billing_address,billing_rut,social_instagram,social_facebook,social_twitter,description,plan_id,country,payment_methods,currency,custom_plan_name,custom_plan_price,custom_domain,company_id,subscription_payment_method,payment_reference,payment_status,payment_reference_url"
			)
			.eq("verification_token", token)
			.in("status", ["form_completed", "payment_pending"])
			.maybeSingle();

		if (appError || !app) {
			return NextResponse.json({ error: "Solicitud no encontrada o incompleta" }, { status: 404 });
		}

		const normalizedEmail = normalizeEmail(app.email);
		if (isOneMonthTrialAttempt && normalizedEmail) {
			const companyQuery = supabaseAdmin
				.from("companies")
				.select("id")
				.ilike("email", normalizedEmail)
				.limit(1);
			if (app.company_id) companyQuery.neq("id", app.company_id);
			const { data: duplicateCompany } = await companyQuery.maybeSingle();
			if (duplicateCompany?.id) {
				return NextResponse.json(
					{ error: "Este correo ya usó el plan de prueba de 1 mes. Inicia sesión o elige un plan de pago." },
					{ status: 409 }
				);
			}
		}

		const subscriptionMethod = (app.subscription_payment_method ?? "").trim().toLowerCase();
		if (!subscriptionMethod) {
			return NextResponse.json({ error: "Selecciona un metodo de pago" }, { status: 400 });
		}

		const { data: methodRow } = await supabaseAdmin
			.from("plan_payment_methods")
			.select("slug,is_active,countries")
			.eq("slug", subscriptionMethod)
			.maybeSingle();

		if (!methodRow?.is_active || !isMethodAvailableForCountry(methodRow, app.country ?? null)) {
			return NextResponse.json(
				{ error: "El metodo de pago seleccionado no esta disponible" },
				{ status: 400 }
			);
		}

		const isPayPal = subscriptionMethod === "paypal";
		const isManualPayment = isManualMethod(subscriptionMethod);

		if (!isManualPayment && !STRIPE_SECRET && !isPayPal) {
			return NextResponse.json({ error: "Integración de pago no configurada" }, { status: 503 });
		}
		if (isPayPal && (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET)) {
			return NextResponse.json({ error: "PayPal no configurado (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET)" }, { status: 503 });
		}

		const planResult = await resolveCheckoutPlan(supabaseAdmin, app);
		if (!planResult.plan) {
			return NextResponse.json({ error: planResult.error }, { status: planResult.status });
		}
		const plan = planResult.plan;
		const planPricing = resolveCheckoutPlanPrice(plan, app.country);
		const chargedPlan = { ...plan, price: planPricing.price };

		const addonsTotalUsd = await calculateAddonsTotalUsd(supabaseAdmin, app.id, months);

		const amountUsd = Number(chargedPlan.price ?? 0) * months + addonsTotalUsd;

		if (isPayPal) {
			return handlePayPalCheckout({
				app, plan: chargedPlan, planPricing, amountUsd, months, token,
				paypalClientId: PAYPAL_CLIENT_ID,
				paypalClientSecret: PAYPAL_CLIENT_SECRET,
			});
		}

		if (isManualPayment) {
			return handleManualCheckout({
				app, amountUsd, months, subscriptionMethod, plan: chargedPlan, planPricing,
			});
		}

		return handleStripeCheckout({
			app, plan: chargedPlan, planPricing, amountUsd, addonsTotalUsd, months, token,
		});
	} catch (err) {
		console.error("onboarding checkout error:", err);
		return NextResponse.json({ error: "Error interno. Intenta más tarde." }, { status: 500 });
	}
}

async function handlePayPalCheckout(params: {
	app: { id: string; country?: string | null; payment_methods?: string[] | null; currency?: string | null; plan_id: string };
	plan: { name: string };
	planPricing: { continent: string; price: number; currency: string };
	amountUsd: number;
	months: number;
	token: string;
	paypalClientId: string;
	paypalClientSecret: string;
}) {
	const baseUrl =
		process.env.NEXT_PUBLIC_APP_URL ||
		(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
		(process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN
			? `${process.env.NEXT_PUBLIC_TENANT_PROTOCOL || "https"}://${process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN}`
			: "http://localhost:3001");
	const returnUrl = `${baseUrl}/api/onboarding/paypal-capture`;
	const cancelUrl = `${baseUrl}/onboarding/pago?token=${encodeURIComponent(params.token)}`;

	const paypalClient = new Client({
		clientCredentialsAuthCredentials: {
			oAuthClientId: params.paypalClientId,
			oAuthClientSecret: params.paypalClientSecret,
		},
		environment:
			process.env.PAYPAL_ENVIRONMENT === "production"
				? Environment.Production
				: Environment.Sandbox,
	});
	const ordersController = new OrdersController(paypalClient);

	let createRes: Awaited<ReturnType<OrdersController["createOrder"]>>;
	try {
		createRes = await ordersController.createOrder({
			body: {
				intent: CheckoutPaymentIntent.Capture,
				purchaseUnits: [
					{
						customId: `${params.app.id}|${params.months}`,
						amount: { currencyCode: "USD", value: params.amountUsd.toFixed(2) },
						description: params.plan.name ?? "Plan",
					},
				],
				applicationContext: { returnUrl, cancelUrl },
			},
		});
	} catch (error) {
		console.error("paypal create order exception:", error);
		return NextResponse.json({ error: "Error al crear la orden de PayPal" }, { status: 502 });
	}

	const order = createRes.result;
	const orderId = order?.id;
	const approveLink = order?.links?.find((l) => l.rel === "approve" || l.rel === "payer-action")?.href;

	if (!orderId || !approveLink) {
		console.error("paypal create order:", createRes);
		return NextResponse.json({ error: "Error al crear la orden de PayPal" }, { status: 502 });
	}

	await updateApplicationPaymentState(supabaseAdmin, params.app.id, {
		applicationStatus: "payment_pending",
		paymentReference: orderId,
		paymentStatus: "pending",
		paymentMonths: params.months,
		paymentAmount: params.amountUsd,
		updatedAt: new Date().toISOString(),
	});

	return NextResponse.json({
		ok: true,
		url: approveLink,
		sessionId: orderId,
		country: params.app.country,
		plan_name: params.plan.name,
		plan_price: params.planPricing.price,
		plan_region: params.planPricing.continent,
		plan_currency: params.planPricing.currency,
		paymentOptions:
			Array.isArray(params.app.payment_methods) && params.app.payment_methods.length > 0
				? params.app.payment_methods
				: ["PayPal", "Stripe"],
		currency: params.app.currency || "USD",
	});
}

async function handleManualCheckout(params: {
	app: { id: string; country?: string | null; currency?: string | null; plan_id: string; subscription_payment_method?: string | null };
	plan: { name: string; price: number };
	planPricing: { continent: string; price: number; currency: string };
	amountUsd: number;
	months: number;
	subscriptionMethod: string;
}) {
	const paymentRef = `manual-${params.app.id}-${Date.now()}`;

	await updateApplicationPaymentState(supabaseAdmin, params.app.id, {
		applicationStatus: "payment_pending",
		paymentReference: paymentRef,
		paymentStatus: "pending_validation",
		paymentMonths: params.months,
		paymentAmount: params.amountUsd,
		updatedAt: new Date().toISOString(),
	});

	const methodConfig = await getManualMethodConfig(supabaseAdmin, params.subscriptionMethod);

	return NextResponse.json({
		ok: true,
		manual: true,
		payment_reference: paymentRef,
		amount_usd: params.amountUsd,
		months: params.months,
		currency: params.app.currency || "USD",
		country: params.app.country ?? null,
		plan_name: params.plan.name,
		plan_price: params.planPricing.price,
		plan_region: params.planPricing.continent,
		plan_currency: params.planPricing.currency,
		method_slug: params.subscriptionMethod,
		method_config: methodConfig,
	});
}

async function handleStripeCheckout(params: {
	app: {
		id: string;
		email?: string | null;
		country?: string | null;
		payment_methods?: string[] | null;
		currency?: string | null;
		plan_id: string;
	};
	plan: { name: string; price: number };
	planPricing: { continent: string; price: number; currency: string };
	amountUsd: number;
	addonsTotalUsd: number;
	months: number;
	token: string;
}) {
	if (!STRIPE_SECRET) {
		return NextResponse.json({ error: "Integración de pago con tarjeta no configurada" }, { status: 503 });
	}

	const planAmountCents = Math.round(Number(params.plan.price ?? 0) * params.months * 100);
	const cancelUrl = new URL(STRIPE_CANCEL_URL);
	cancelUrl.searchParams.set("token", params.token);
	const stripeParams = new URLSearchParams();
	stripeParams.append("mode", "payment");
	stripeParams.append("success_url", `${STRIPE_SUCCESS_URL}?ref={CHECKOUT_SESSION_ID}`);
	stripeParams.append("cancel_url", cancelUrl.toString());
	stripeParams.append("line_items[0][price_data][currency]", "usd");
	stripeParams.append("line_items[0][price_data][product_data][name]", params.plan.name ?? "Plan");
	stripeParams.append("line_items[0][price_data][unit_amount]", planAmountCents.toString());
	stripeParams.append("line_items[0][quantity]", "1");
	if (params.addonsTotalUsd > 0) {
		stripeParams.append("line_items[1][price_data][currency]", "usd");
		stripeParams.append("line_items[1][price_data][product_data][name]", "Servicios extra");
		stripeParams.append("line_items[1][price_data][unit_amount]", Math.round(params.addonsTotalUsd * 100).toString());
		stripeParams.append("line_items[1][quantity]", "1");
	}
	stripeParams.append("metadata[plan_id]", params.app.plan_id);
	stripeParams.append("metadata[months]", params.months.toString());
	stripeParams.append("metadata[onboarding_application_id]", params.app.id);
	stripeParams.append("metadata[payer_email_normalized]", normalizeEmail(params.app.email));
	if (params.app.email) {
		stripeParams.append("customer_email", params.app.email);
	}

	const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${STRIPE_SECRET}`,
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: stripeParams.toString(),
	});

	if (!stripeRes.ok) {
		const text = await stripeRes.text();
		console.error("stripe checkout:", text);
		return NextResponse.json({ error: "Error al crear sesión de pago" }, { status: 502 });
	}

	const session = (await stripeRes.json()) as { id?: string; url?: string };

	if (session.id) {
		await updateApplicationPaymentState(supabaseAdmin, params.app.id, {
			applicationStatus: "payment_pending",
			paymentReference: session.id,
			paymentStatus: "pending",
			paymentMonths: params.months,
			paymentAmount: params.amountUsd,
			updatedAt: new Date().toISOString(),
		});
	}

	return NextResponse.json({
		ok: true,
		url: session.url,
		sessionId: session.id,
		country: params.app.country,
		plan_name: params.plan.name,
		plan_price: params.planPricing.price,
		plan_region: params.planPricing.continent,
		plan_currency: params.planPricing.currency,
		paymentOptions: Array.isArray(params.app.payment_methods) && params.app.payment_methods.length > 0
			? params.app.payment_methods
			: (params.app.country === "Venezuela" ? ["Pago Móvil", "Zelle", "Transferencia", "Stripe"] : ["Stripe"]),
		currency: params.app.currency || "USD",
	});
}
