import { NextRequest, NextResponse } from "next/server";
import {
	Client,
	Environment,
	OrdersController,
} from "@paypal/paypal-server-sdk";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import {
	getBookingContactDate,
	queueBookingReminder,
	sendPaymentValidatedNotice,
} from "@/lib/onboarding/booking-notifications";
import { hashPaymentIdentity, normalizeEmail } from "@/lib/onboarding/trial-eligibility";
import {
	activateCompanyAddonsFromApplication,
	activateCompanySubscription,
} from "@/lib/onboarding/billing-activation";
import {
	provisionCompanyFromApplication,
	recordPayment,
	type OnboardingApplication,
} from "@/lib/onboarding/checkout-service";

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID ?? "";
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET ?? "";

function parsePayPalCustomId(customId: string | null | undefined): { appId: string | null; months: number } {
	if (!customId) return { appId: null, months: 1 };
	const [rawAppId, rawMonths] = String(customId).split("|");
	const appId = rawAppId?.trim() || null;
	const monthsParsed = Number(rawMonths);
	const months = Number.isFinite(monthsParsed) ? Math.min(12, Math.max(1, Math.floor(monthsParsed))) : 1;
	return { appId, months };
}

export async function GET(req: NextRequest) {
	try {
		const token = req.nextUrl.searchParams.get("token");
		if (!token) {
			return NextResponse.redirect(
				new URL("/onboarding/pago?error=missing_token", req.url)
			);
		}

		if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
			return NextResponse.redirect(
				new URL("/onboarding/pago?error=paypal_not_configured", req.url)
			);
		}

		const paypalClient = new Client({
			clientCredentialsAuthCredentials: {
				oAuthClientId: PAYPAL_CLIENT_ID,
				oAuthClientSecret: PAYPAL_CLIENT_SECRET,
			},
			environment:
				process.env.PAYPAL_ENVIRONMENT === "production"
					? Environment.Production
					: Environment.Sandbox,
		});
		const ordersController = new OrdersController(paypalClient);

		const captureRes = await ordersController.captureOrder({
			id: token,
		});

		const status = captureRes.result?.status;
		if (status === "COMPLETED" || status === "APPROVED") {
			const customId = captureRes.result?.purchaseUnits?.[0]?.customId ?? null;
			const amountValue = captureRes.result?.purchaseUnits?.[0]?.amount?.value;
			const amountPaid = Number(amountValue ?? 0);
			const { appId, months } = parsePayPalCustomId(customId);

			if (!appId) {
				return NextResponse.redirect(
					new URL("/onboarding/pago?error=paypal_missing_application", req.url)
				);
			}

			const { data: app } = await supabaseAdmin
				.from("onboarding_applications")
				.select("id,status,company_id,plan_id,business_name,email,responsible_name,billing_rut,fiscal_address,logo_url,social_instagram,custom_domain,custom_plan_name,custom_plan_price,subscription_payment_method")
				.eq("id", appId)
				.maybeSingle();

			if (!app) {
				return NextResponse.redirect(
					new URL("/onboarding/pago?error=application_not_found", req.url)
				);
			}

			const payer = captureRes.result?.payer as {
				email_address?: string | null;
				payer_id?: string | null;
			} | undefined;
			const payerEmail = normalizeEmail(payer?.email_address);
			const payerIdHash = typeof payer?.payer_id === "string" && payer.payer_id.trim()
				? hashPaymentIdentity(payer.payer_id.trim())
				: null;

			const companyResult = await provisionCompanyFromApplication(
				supabaseAdmin,
				app as OnboardingApplication,
				false,
			);
			if (!companyResult.ok) {
				return NextResponse.redirect(
					new URL("/onboarding/pago?error=company_provision_failed", req.url)
				);
			}

			const { data: existingPayment } = await supabaseAdmin
				.from("payments_history")
				.select("id")
				.eq("payment_reference", token)
				.maybeSingle();

			if (existingPayment?.id) {
				await supabaseAdmin
					.from("payments_history")
					.update({
						company_id: companyResult.company.id,
						plan_id: app.plan_id,
						amount_paid: Number.isFinite(amountPaid) ? amountPaid : 0,
						status: "paid",
						months_paid: months,
						payment_date: new Date().toISOString(),
						payer_email_normalized: payerEmail || null,
						paypal_payer_id_hash: payerIdHash,
					})
					.eq("id", existingPayment.id);
			} else {
				const paymentInsert = await recordPayment(supabaseAdmin, {
					companyId: companyResult.company.id,
					planId: app.plan_id,
					amountPaid: Number.isFinite(amountPaid) ? amountPaid : 0,
					paymentMethod: "paypal",
					paymentMethodSlug: "paypal",
					paymentReference: token,
					status: "paid",
					monthsPaid: months,
				});
				if (!paymentInsert.id) {
					return NextResponse.redirect(
						new URL("/onboarding/pago?error=payment_record_failed", req.url)
					);
				}
				await supabaseAdmin
					.from("payments_history")
					.update({
						payer_email_normalized: payerEmail || null,
						paypal_payer_id_hash: payerIdHash,
					})
					.eq("id", paymentInsert.id);
			}

			const { data: application } = await supabaseAdmin
				.from("onboarding_applications")
				.select("business_name,responsible_name,email,status")
				.eq("company_id", companyResult.company.id)
				.eq("status", "payment_pending")
				.maybeSingle();

			if (application) {
				const preferredContactDate = getBookingContactDate();
				const booking = await queueBookingReminder({
					supabaseAdmin,
					companyId: companyResult.company.id,
					businessName: application.business_name,
					requesterEmail: application.email,
					scheduledFor: preferredContactDate,
				});
				await sendPaymentValidatedNotice({
					supabaseAdmin,
					companyId: companyResult.company.id,
					businessName: application.business_name,
					responsibleName: application.responsible_name ?? "",
					recipientEmail: application.email,
					contactDate: booking.scheduledFor,
				});
			}

			const finalizeAt = new Date();
			await supabaseAdmin
				.from("onboarding_applications")
				.update({
					status: "active",
					payment_status: "paid",
					updated_at: finalizeAt.toISOString(),
				})
				.eq("id", app.id);
			await activateCompanySubscription({
				supabaseAdmin,
				companyId: companyResult.company.id,
				monthsPaid: months,
				now: finalizeAt,
			});
			await activateCompanyAddonsFromApplication({
				supabaseAdmin,
				applicationId: app.id,
				companyId: companyResult.company.id,
				monthsPaid: months,
				now: finalizeAt,
			});
		}

		const baseUrl =
			process.env.NEXT_PUBLIC_APP_URL ||
			(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
			(process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN
				? `${process.env.NEXT_PUBLIC_TENANT_PROTOCOL || "https"}://${process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN}`
				: "http://localhost:3001");
		const successUrl = `${baseUrl}/checkout/success?ref=${encodeURIComponent(token)}`;
		return NextResponse.redirect(successUrl);
	} catch (err) {
		console.error("paypal capture error:", err);
		const baseUrl =
			process.env.NEXT_PUBLIC_APP_URL ||
			(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
			(process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN
				? `${process.env.NEXT_PUBLIC_TENANT_PROTOCOL || "https"}://${process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN}`
				: "http://localhost:3001");
		return NextResponse.redirect(
			new URL("/onboarding/pago?error=paypal_capture_failed", baseUrl)
		);
	}
}
