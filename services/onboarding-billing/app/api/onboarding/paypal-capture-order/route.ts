import { NextRequest, NextResponse } from "next/server";
import {
	Client,
	Environment,
	OrdersController,
} from "@paypal/paypal-server-sdk";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import {
	activateCompanyAddonsFromApplication,
	activateCompanySubscription,
} from "@/lib/onboarding/billing-activation";
import {
	provisionCompanyFromApplication,
	recordPayment,
	type OnboardingApplication,
} from "@/lib/onboarding/checkout-service";
import { hashPaymentIdentity, normalizeEmail } from "@/lib/onboarding/trial-eligibility";

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

export async function POST(req: NextRequest) {
	try {
		const body = (await req.json().catch(() => ({}))) as { orderId?: string; token?: string };
		const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
		const token = typeof body.token === "string" ? body.token.trim() : "";

		if (!orderId) {
			return NextResponse.json({ error: "orderId faltante" }, { status: 400 });
		}

		if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
			return NextResponse.json({ error: "PayPal no configurado" }, { status: 503 });
		}

		const { data: existingPayment } = await supabaseAdmin
			.from("payments_history")
			.select("id,status")
			.eq("payment_reference", orderId)
			.maybeSingle();

		if (existingPayment?.status === "paid" || existingPayment?.status === "approved") {
			return NextResponse.json({ ok: true, ref: orderId });
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
		const captureRes = await ordersController.captureOrder({ id: orderId });

		const status = captureRes.result?.status;
		if (status !== "COMPLETED" && status !== "APPROVED") {
			return NextResponse.json({ error: "Pago aún no aprobado" }, { status: 409 });
		}

		const customId = captureRes.result?.purchaseUnits?.[0]?.customId ?? null;
		const amountValue = captureRes.result?.purchaseUnits?.[0]?.amount?.value;
		const amountPaid = Number(amountValue ?? 0);
		const { appId, months } = parsePayPalCustomId(customId);

		if (!appId) {
			return NextResponse.json({ error: "No se pudo resolver la solicitud asociada" }, { status: 400 });
		}

		const { data: app } = await supabaseAdmin
			.from("onboarding_applications")
			.select("id,status,company_id,plan_id,business_name,email,billing_rut,fiscal_address,logo_url,social_instagram,custom_domain,custom_plan_name,custom_plan_price,subscription_payment_method,verification_token")
			.eq("id", appId)
			.maybeSingle();

		if (!app) {
			return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
		}

		if (token) {
			const expectedToken = String(app.verification_token ?? "").trim();
			if (!expectedToken || expectedToken !== token) {
				return NextResponse.json({ error: "Token inválido para este pago" }, { status: 403 });
			}
		}

		const companyResult = await provisionCompanyFromApplication(
			supabaseAdmin,
			app as OnboardingApplication,
			false,
		);
		if (!companyResult.ok) {
			return NextResponse.json({ error: companyResult.error }, { status: companyResult.status });
		}

		const payer = captureRes.result?.payer as {
			email_address?: string | null;
			payer_id?: string | null;
		} | undefined;
		const payerEmail = normalizeEmail(payer?.email_address);
		const payerIdHash = typeof payer?.payer_id === "string" && payer.payer_id.trim()
			? hashPaymentIdentity(payer.payer_id.trim())
			: null;

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
				paymentReference: orderId,
				status: "paid",
				monthsPaid: months,
			});
			if (!paymentInsert.id) {
				return NextResponse.json({ error: "No se pudo registrar el pago" }, { status: 500 });
			}
			await supabaseAdmin
				.from("payments_history")
				.update({
					payer_email_normalized: payerEmail || null,
					paypal_payer_id_hash: payerIdHash,
				})
				.eq("id", paymentInsert.id);
		}

		const now = new Date();
		await supabaseAdmin
			.from("onboarding_applications")
			.update({
				status: "active",
				payment_status: "paid",
				updated_at: now.toISOString(),
			})
			.eq("id", app.id);
		await activateCompanySubscription({
			supabaseAdmin,
			companyId: companyResult.company.id,
			monthsPaid: months,
			now,
		});
		await activateCompanyAddonsFromApplication({
			supabaseAdmin,
			applicationId: app.id,
			companyId: companyResult.company.id,
			monthsPaid: months,
			now,
		});

		return NextResponse.json({ ok: true, ref: orderId });
	} catch (err) {
		console.error("paypal capture order error:", err);
		return NextResponse.json({ error: "Error interno" }, { status: 500 });
	}
}
