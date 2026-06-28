import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { logger, createRequestContext } from "@/lib/infra/logger";
import {
	activateCompanyAddonsFromApplication,
	activateCompanySubscription,
	getMonthsPaidFromPayment,
} from "@/lib/onboarding/billing-activation";
import {
	provisionCompanyFromApplication,
	recordPayment,
	type OnboardingApplication,
} from "@/lib/onboarding/checkout-service";
import {
	provisionOnboardingWelcome,
	WelcomeProvisioningError,
} from "@/lib/onboarding/welcome-provisioning";
import { normalizeEmail } from "@/lib/onboarding/trial-eligibility";
import { resolveFirstPaymentPromo } from "@/lib/onboarding/first-payment-promo";
import { isFirstPaymentPromoEligible } from "@/lib/onboarding/first-payment-promo-service";

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const RESEND_FROM = process.env.RESEND_FROM ?? "noreply@example.com";

export async function POST(req: NextRequest) {
	const ctx = createRequestContext("/api/onboarding/finalize", "POST");
	try {
		const ref = req.nextUrl.searchParams.get("ref") ?? (await req.json().catch(() => ({}))).ref;
		if (!ref || typeof ref !== "string" || ref.length > 100 || !/^[a-zA-Z0-9_-]+$/.test(ref)) {
			logger.warn("Intento de finalización de pago con referencia de formato inválido (posible tampering/SSRF)", ctx, { ref });
			return NextResponse.json({ error: "Referencia de pago inválida o faltante" }, { status: 400 });
		}

		const { data: payment, error: payError } = await supabaseAdmin
			.from("payments_history")
			.select("id,company_id,plan_id,status,payment_method_slug,payer_email_normalized,paypal_payer_id_hash")
			.eq("payment_reference", ref)
			.maybeSingle();

		if (!payment) {
			const { data: app } = await supabaseAdmin
				.from("onboarding_applications")
				.select("id,business_name,responsible_name,email,plan_id,company_id,billing_rut,fiscal_address,logo_url,social_instagram,custom_domain,custom_plan_name,custom_plan_price,subscription_payment_method,payment_reference,payment_status,payment_months,payment_amount")
				.eq("payment_reference", ref)
				.maybeSingle();

			if (!app) {
				return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
			}

			const stripeSecret = process.env.STRIPE_SECRET_KEY;
			if (!stripeSecret) {
				return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
			}

			try {
				const stripeRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${ref}`, {
					headers: { Authorization: `Bearer ${stripeSecret}` },
				});
				if (!stripeRes.ok) {
					return NextResponse.json({ ok: true, message: "Pago aún no confirmado" });
				}

				const session = (await stripeRes.json()) as { payment_status?: string; amount_total?: number };
				if (session.payment_status !== "paid") {
					return NextResponse.json({ ok: true, message: "Pago aún no confirmado" });
				}

				const appRecord = app as OnboardingApplication;
				const monthsPaid = getMonthsPaidFromPayment({ months_paid: app.payment_months }, 1);
				const isPromoEligible = await isFirstPaymentPromoEligible(supabaseAdmin, {
					email: app.email,
					excludeCompanyId: app.company_id,
				});
				const promo = resolveFirstPaymentPromo(monthsPaid, isPromoEligible);
				const amountPaid = Number(session.amount_total ?? app.payment_amount ?? 0) / 100;
				const companyResult = await provisionCompanyFromApplication(supabaseAdmin, appRecord, false);
				if (!companyResult.ok) {
					return NextResponse.json({ error: companyResult.error }, { status: companyResult.status });
				}

				const paymentInsert = await recordPayment(supabaseAdmin, {
					companyId: companyResult.company.id,
					planId: appRecord.plan_id,
					amountPaid,
					paymentMethod: String(appRecord.subscription_payment_method ?? "stripe"),
					paymentMethodSlug: "stripe",
					paymentReference: ref,
					status: "paid",
					monthsPaid,
				});

				if (paymentInsert.error) {
					return NextResponse.json({ error: paymentInsert.error }, { status: 500 });
				}

				const now = new Date();
				await supabaseAdmin
					.from("onboarding_applications")
					.update({ company_id: companyResult.company.id, status: "active", payment_status: "paid", updated_at: now.toISOString() })
					.eq("id", appRecord.id);

				await activateCompanySubscription({
					supabaseAdmin,
					companyId: companyResult.company.id,
					monthsPaid: promo.grantedMonths,
					now,
				});

				if (promo.promoApplied) {
					await supabaseAdmin
						.from("companies")
						.update({ first_payment_promo_used_at: now.toISOString() })
						.eq("id", companyResult.company.id);
				}

				await activateCompanyAddonsFromApplication({
					supabaseAdmin,
					applicationId: appRecord.id,
					companyId: companyResult.company.id,
					monthsPaid: promo.grantedMonths,
					now,
				});

				logger.info("Finalize completado", ctx, { companyId: companyResult.company.id });
				return NextResponse.json({ ok: true, message: "Usuario creado y email de bienvenida enviado" });
			} catch (stripeError) {
				logger.error("stripe finalize fallback error", ctx, { error: String(stripeError) });
				return NextResponse.json({ error: "Error interno" }, { status: 500 });
			}
		}

		if (payError || !payment) {
			return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
		}
		const isPaid = payment.status === "paid" || payment.status === "approved";
		if (!isPaid && ref.startsWith("cs_")) {
			const stripeSecret = process.env.STRIPE_SECRET_KEY;
			if (stripeSecret) {
				try {
					const stripeRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${ref}`, {
						headers: { Authorization: `Bearer ${stripeSecret}` },
					});
					if (stripeRes.ok) {
						const session = (await stripeRes.json()) as { payment_status?: string };
						if (session.payment_status === "paid") {
							await supabaseAdmin
								.from("payments_history")
								.update({ status: "paid" })
								.eq("payment_reference", ref);
						}
					}
				} catch {
					/* ignore */
				}
			}
		}
		const { data: paymentUpdated } = await supabaseAdmin
			.from("payments_history")
			.select("status,months_paid")
			.eq("payment_reference", ref)
			.maybeSingle();
		const status = paymentUpdated?.status ?? payment.status;
		const monthsPaid = getMonthsPaidFromPayment(
			{ months_paid: paymentUpdated?.months_paid },
			1
		);
		if (status !== "paid" && status !== "approved") {
			return NextResponse.json({ ok: true, message: "Pago aún no confirmado" });
		}

		const { data: appGuard } = await supabaseAdmin
			.from("onboarding_applications")
			.select("id,email")
			.eq("company_id", payment.company_id)
			.eq("status", "payment_pending")
			.maybeSingle();

		const payerEmail = normalizeEmail(appGuard?.email);
		const isPromoEligible = await isFirstPaymentPromoEligible(supabaseAdmin, {
			email: payerEmail,
			excludeCompanyId: payment.company_id,
		});
		const promo = resolveFirstPaymentPromo(monthsPaid, isPromoEligible);

		if (payerEmail) {
			await supabaseAdmin
				.from("payments_history")
				.update({ payer_email_normalized: payerEmail })
				.eq("id", payment.id);
		}

		const now = new Date();
		await activateCompanySubscription({
			supabaseAdmin,
			companyId: payment.company_id,
			monthsPaid: promo.grantedMonths,
			now,
		});

		if (promo.promoApplied) {
			await supabaseAdmin
				.from("companies")
				.update({ first_payment_promo_used_at: now.toISOString() })
				.eq("id", payment.company_id);
		}

		const { data: app, error: appError } = await supabaseAdmin
			.from("onboarding_applications")
			.select("id,business_name,responsible_name,email,welcome_email_sent_at")
			.eq("company_id", payment.company_id)
			.eq("status", "payment_pending")
			.maybeSingle();

		if (appError || !app) {
			return NextResponse.json({ ok: true, message: "No es onboarding o ya procesado" });
		}
		if (app.welcome_email_sent_at) {
			return NextResponse.json({ ok: true, alreadySent: true });
		}

		await supabaseAdmin
			.from("companies")
			.select("id,public_slug")
			.eq("id", payment.company_id)
			.maybeSingle();

		try {
			await provisionOnboardingWelcome({
				supabaseAdmin,
				application: app,
				companyId: payment.company_id,
				resendApiKey: RESEND_API_KEY,
				resendFrom: RESEND_FROM,
			});
		} catch (error) {
			if (error instanceof WelcomeProvisioningError) {
				return NextResponse.json({ error: error.message }, { status: error.status });
			}
			throw error;
		}

		await activateCompanyAddonsFromApplication({
			supabaseAdmin,
			applicationId: app.id,
			companyId: payment.company_id,
			monthsPaid: promo.grantedMonths,
			now,
		});

		await supabaseAdmin
			.from("onboarding_applications")
			.update({ status: "active", payment_status: "paid", updated_at: now.toISOString() })
			.eq("id", app.id);

		logger.info("Finalize completado", ctx, { companyId: payment.company_id });
		return NextResponse.json({
			ok: true,
			message: "Usuario creado y email de bienvenida enviado",
		});
	} catch (err) {
		logger.error("onboarding finalize error", ctx, { error: String(err) });
		return NextResponse.json({ error: "Error interno" }, { status: 500 });
	}
}
