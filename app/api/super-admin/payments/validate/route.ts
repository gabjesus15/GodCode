import { NextRequest, NextResponse } from "next/server";

import { logAdminAudit } from "@/lib/super-admin/admin-audit";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { logger, createRequestContext } from "@/lib/infra/logger";
import { SAAS_MUTATE_ROLES, validateAdminRolesOnServer } from "@/utils/admin/server-auth";
import {
	activateCompanyAddonsFromApplication,
	activateCompanySubscription,
	getMonthsPaidFromPayment,
} from "@/lib/onboarding/billing-activation";
import {
	getBookingContactDate,
	queueBookingReminder,
	sendPaymentValidatedNotice,
} from "@/lib/onboarding/booking-notifications";
import { provisionOnboardingWelcome } from "@/lib/onboarding/welcome-provisioning";
import { proxyToOnboardingBilling } from "@/lib/onboarding/service-proxy";
import {
	provisionCompanyFromApplication,
	recordPayment,
	type OnboardingApplication,
} from "@/lib/onboarding/checkout-service";
import { resolveFirstPaymentPromo } from "@/lib/onboarding/first-payment-promo";
import { isFirstPaymentPromoEligible } from "@/lib/onboarding/first-payment-promo-service";

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const RESEND_FROM = process.env.RESEND_FROM?.trim() || "";

export async function POST(req: NextRequest) {
	const permission = await validateAdminRolesOnServer([...SAAS_MUTATE_ROLES]);
	if (!permission.ok) {
		return NextResponse.json({ error: permission.error ?? "No autorizado" }, { status: permission.status ?? 403 });
	}

	const proxied = await proxyToOnboardingBilling(req, "/api/super-admin/payments/validate");
	if (proxied) return proxied;

	const ctx = createRequestContext("/api/super-admin/payments/validate", "POST");

	try {
		const body = (await req.json().catch(() => ({}))) as { payment_id?: string; payment_reference?: string };
		const paymentId = typeof body.payment_id === "string" ? body.payment_id.trim() : "";
		const paymentRef = typeof body.payment_reference === "string" ? body.payment_reference.trim() : "";

		if (!paymentId && !paymentRef) {
			return NextResponse.json({ error: "Indica payment_id o payment_reference" }, { status: 400 });
		}

		const query = supabaseAdmin
			.from("payments_history")
			.select("id,company_id,plan_id,status,months_paid,payment_reference,amount_paid")
			.limit(1);
		if (paymentId) query.eq("id", paymentId);
		else query.eq("payment_reference", paymentRef);

		const { data: payment, error: payError } = await query.maybeSingle();

		if (payError || !payment) {
			const refForApp =
				paymentRef ||
				(paymentId
					? ((
							await supabaseAdmin
								.from("payments_history")
								.select("payment_reference")
								.eq("id", paymentId)
								.maybeSingle()
						).data?.payment_reference ?? "")
					: "");

			if (!refForApp) {
				return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
			}

			const { data: appPending } = await supabaseAdmin
				.from("onboarding_applications")
				.select(
					"id,business_name,responsible_name,email,plan_id,company_id,subscription_payment_method,payment_reference,payment_status,payment_months,payment_amount,welcome_email_sent_at",
				)
				.eq("payment_reference", refForApp)
				.maybeSingle();

			if (!appPending) {
				return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
			}

			const pendingStatus = String(appPending.payment_status ?? "").toLowerCase();
			if (
				!appPending.payment_reference ||
				!["pending_validation", "rejected", "pending"].includes(pendingStatus)
			) {
				return NextResponse.json(
					{ error: "Este pago ya fue validado o no está pendiente de validación" },
					{ status: 400 },
				);
			}

			const app = appPending as OnboardingApplication;
			const monthsPaid = getMonthsPaidFromPayment({ months_paid: app.payment_months }, 1);
			const isPromoEligible = await isFirstPaymentPromoEligible(supabaseAdmin, {
				email: app.email,
				excludeCompanyId: app.company_id,
			});
			const promo = resolveFirstPaymentPromo(monthsPaid, isPromoEligible);
			const amountPaid = Number(app.payment_amount ?? 0) || 0;
			const now = new Date();

			const companyResult = await provisionCompanyFromApplication(supabaseAdmin, app, true);
			if (!companyResult.ok) {
				return NextResponse.json({ error: companyResult.error }, { status: companyResult.status });
			}

			const paymentInsert = await recordPayment(supabaseAdmin, {
				companyId: companyResult.company.id,
				planId: app.plan_id,
				amountPaid,
				paymentMethod: app.subscription_payment_method ?? "manual",
				paymentMethodSlug: app.subscription_payment_method ?? "manual",
				paymentReference: app.payment_reference ?? refForApp,
				status: "paid",
				monthsPaid,
			});

			if (paymentInsert.error) {
				return NextResponse.json({ error: paymentInsert.error }, { status: 500 });
			}

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

			await supabaseAdmin
				.from("onboarding_applications")
				.update({
					company_id: companyResult.company.id,
					status: "payment_validated",
					payment_status: "paid",
					updated_at: now.toISOString(),
				})
				.eq("id", app.id);

			try {
				const preferredContactDate = getBookingContactDate(now);
				const booking = await queueBookingReminder({
					supabaseAdmin,
					companyId: companyResult.company.id,
					businessName: app.business_name,
					requesterEmail: app.email,
					scheduledFor: preferredContactDate,
				});
				await sendPaymentValidatedNotice({
					supabaseAdmin,
					companyId: companyResult.company.id,
					businessName: app.business_name,
					responsibleName: app.responsible_name ?? "",
					recipientEmail: app.email,
					contactDate: booking.scheduledFor,
				});
			} catch (error) {
				logger.warn("payment_validated_email_failed", ctx, {
					companyId: companyResult.company.id,
					error: String(error),
				});
			}

			let welcomeSent = false;
			if (!appPending.welcome_email_sent_at && RESEND_API_KEY && RESEND_FROM) {
				try {
					await provisionOnboardingWelcome({
						supabaseAdmin,
						application: {
							id: app.id,
							email: app.email,
							responsible_name: app.responsible_name ?? null,
							business_name: app.business_name ?? null,
						},
						companyId: companyResult.company.id,
						resendApiKey: RESEND_API_KEY,
						resendFrom: RESEND_FROM,
					});
					welcomeSent = true;
				} catch {
					logger.warn("welcome_email_failed", ctx, { companyId: companyResult.company.id });
				}
			}

			await activateCompanyAddonsFromApplication({
				supabaseAdmin,
				applicationId: app.id,
				companyId: companyResult.company.id,
				monthsPaid: promo.grantedMonths,
				now,
			});

			await logAdminAudit({
				actorEmail: permission.email ?? "",
				actorRole: permission.role,
				action: "payment.validate",
				resourceType: "onboarding_applications",
				resourceId: app.id,
				metadata: {
					company_id: companyResult.company.id,
					payment_reference: refForApp,
					fallback: "application_only",
					welcome_email_sent: welcomeSent,
				},
			});

			logger.info("Pago validado (application fallback)", ctx, {
				companyId: companyResult.company.id,
				welcomeSent,
			});

			return NextResponse.json({
				ok: true,
				message: "Pago validado. La suscripcion quedo activa correctamente.",
				welcome_email_sent: welcomeSent,
			});
		}

		if (payment.status !== "pending_validation") {
			return NextResponse.json(
				{ error: "Este pago ya fue validado o no está pendiente de validación" },
				{ status: 400 }
			);
		}

		const monthsPaid = getMonthsPaidFromPayment({ months_paid: payment.months_paid }, 1);
		const now = new Date();
		const isCustomerAccountExpansion = String(payment.payment_reference ?? "").startsWith("CUST-");
		const isCustomerPlanChange = String(payment.payment_reference ?? "").startsWith("PLANCHG-");
		const addonRefMatch = String(payment.payment_reference ?? "").match(/^ADDON-([0-9a-f-]{36})-M(\d+)-/i);
		const isCustomerAddonPurchase = Boolean(addonRefMatch);
		const isOnboardingFlow = !isCustomerAccountExpansion && !isCustomerPlanChange && !isCustomerAddonPurchase;

		let addonForPurchase: { id: string; price_monthly: number | null } | null = null;
		if (isCustomerAddonPurchase && addonRefMatch) {
			const { data: addon } = await supabaseAdmin
				.from("addons")
				.select("id,price_monthly")
				.eq("id", addonRefMatch[1])
				.maybeSingle();
			if (!addon?.id) {
				return NextResponse.json({ error: "No se encontro el extra asociado al pago" }, { status: 400 });
			}
			addonForPurchase = addon;
		}

		const { data: app } = await supabaseAdmin
			.from("onboarding_applications")
			.select("id,business_name,responsible_name,email,welcome_email_sent_at")
			.eq("company_id", payment.company_id)
			.eq("status", "payment_pending")
			.maybeSingle();

		let promo = resolveFirstPaymentPromo(monthsPaid, false);
		if (isOnboardingFlow && app?.email) {
			const isPromoEligible = await isFirstPaymentPromoEligible(supabaseAdmin, {
				email: app.email,
				excludeCompanyId: payment.company_id,
			});
			promo = resolveFirstPaymentPromo(monthsPaid, isPromoEligible);
		}

		if (app && isOnboardingFlow) {
			try {
				const preferredContactDate = getBookingContactDate(now);
				const booking = await queueBookingReminder({
					supabaseAdmin,
					companyId: payment.company_id,
					businessName: app.business_name,
					requesterEmail: app.email,
					scheduledFor: preferredContactDate,
				});
				await sendPaymentValidatedNotice({
					supabaseAdmin,
					companyId: payment.company_id,
					businessName: app.business_name,
					responsibleName: app.responsible_name ?? "",
					recipientEmail: app.email,
					contactDate: booking.scheduledFor,
				});
			} catch (error) {
				logger.warn("payment_validated_email_failed", ctx, {
					companyId: payment.company_id,
					error: String(error),
				});
			}
		}

		let branchExtraQuantity = 0;

	if (isCustomerPlanChange) {
		await supabaseAdmin
			.from("companies")
			.update({
				plan_id: payment.plan_id,
				updated_at: now.toISOString(),
			})
			.eq("id", payment.company_id);
		await activateCompanySubscription({
			supabaseAdmin,
			companyId: payment.company_id,
			monthsPaid,
			now,
		});
	} else if (isCustomerAddonPurchase && addonRefMatch && addonForPurchase) {
			const addonId = addonRefMatch[1];
			const [{ data: company }] = await Promise.all([
				supabaseAdmin
					.from("companies")
					.select("subscription_ends_at")
					.eq("id", payment.company_id)
					.maybeSingle(),
			]);

			const isMonthlyAddon = Number(addonForPurchase.price_monthly ?? 0) > 0;
			await supabaseAdmin.from("company_addons").upsert(
				{
					company_id: payment.company_id,
					addon_id: addonForPurchase.id,
					status: "active",
					price_paid: Number(payment.amount_paid ?? 0) || null,
					expires_at: isMonthlyAddon ? company?.subscription_ends_at ?? null : null,
					updated_at: now.toISOString(),
				},
				{ onConflict: "company_id,addon_id" }
			);
		} else if (!isCustomerAccountExpansion) {
			if (app?.id) {
				await supabaseAdmin
					.from("onboarding_applications")
					.update({ status: "payment_validated", updated_at: now.toISOString() })
					.eq("id", app.id)
					.eq("status", "payment_pending");
			}
		} else {
			const [{ data: company }, { data: addons }, { data: entitlement }] = await Promise.all([
				supabaseAdmin
					.from("companies")
					.select("subscription_ends_at")
					.eq("id", payment.company_id)
					.maybeSingle(),
				supabaseAdmin
					.from("addons")
					.select("id,slug,name,type")
					.eq("is_active", true)
					.order("sort_order", { ascending: true }),
				supabaseAdmin
					.from("company_branch_extra_entitlements")
					.select("id,quantity")
					.eq("payment_id", payment.id)
					.maybeSingle(),
			]);

			branchExtraQuantity = Math.max(0, Number(entitlement?.quantity ?? 0) || 0);

			const branchAddon = (addons ?? []).find((row) => {
				const haystack = `${String(row.slug ?? "")} ${String(row.name ?? "")} ${String(row.type ?? "")}`.toLowerCase();
				return haystack.includes("branch") || haystack.includes("sucursal");
			});

			if (branchAddon?.id) {
				await supabaseAdmin.from("company_addons").upsert(
					{
						company_id: payment.company_id,
						addon_id: branchAddon.id,
						status: "active",
						price_paid: Number(payment.amount_paid ?? 0) || null,
						expires_at: company?.subscription_ends_at ?? null,
						updated_at: now.toISOString(),
					},
					{ onConflict: "company_id,addon_id" }
				);
			}

			if (entitlement?.id) {
				await supabaseAdmin
					.from("company_branch_extra_entitlements")
					.update({
						status: "active",
						starts_at: now.toISOString(),
						expires_at: company?.subscription_ends_at ?? null,
						updated_at: now.toISOString(),
					})
					.eq("id", entitlement.id);
			}
		}

		let welcomeSent = false;
		if (app && isOnboardingFlow && !app.welcome_email_sent_at && RESEND_API_KEY && RESEND_FROM) {
			try {
				await provisionOnboardingWelcome({
					supabaseAdmin,
					application: app,
					companyId: payment.company_id,
					resendApiKey: RESEND_API_KEY,
					resendFrom: RESEND_FROM,
				});
				welcomeSent = true;
			} catch {
				logger.warn("welcome_email_failed", ctx, { companyId: payment.company_id });
			}
		}

		const { data: paidRow, error: paidError } = await supabaseAdmin
			.from("payments_history")
			.update({ status: "paid", payment_date: now.toISOString() })
			.eq("id", payment.id)
			.eq("status", "pending_validation")
			.select("id")
			.maybeSingle();

		if (paidError || !paidRow) {
			return NextResponse.json(
				{ error: "Este pago ya fue validado o no está pendiente de validación" },
				{ status: 409 },
			);
		}

		if (app?.id && !isOnboardingFlow && !isCustomerAccountExpansion && !isCustomerPlanChange && !isCustomerAddonPurchase) {
			await activateCompanyAddonsFromApplication({
				supabaseAdmin,
				applicationId: app.id,
				companyId: payment.company_id,
				monthsPaid,
				now,
			});
		}

		if (isOnboardingFlow) {
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

			if (app?.id) {
				await activateCompanyAddonsFromApplication({
					supabaseAdmin,
					applicationId: app.id,
					companyId: payment.company_id,
					monthsPaid: promo.grantedMonths,
					now,
				});
			}
		}

		await logAdminAudit({
			actorEmail: permission.email ?? "",
			actorRole: permission.role,
			action: "payment.validate",
			resourceType: "payments_history",
			resourceId: payment.id,
			metadata: {
				company_id: payment.company_id,
				welcome_email_sent: welcomeSent,
				branch_extra_quantity: branchExtraQuantity,
				customer_addon_purchase: isCustomerAddonPurchase,
			},
		});
		logger.info("Pago validado", ctx, {
			companyId: payment.company_id,
			welcomeSent,
			customerAccountExpansion: isCustomerAccountExpansion,
			customerPlanChange: isCustomerPlanChange,
			customerAddonPurchase: isCustomerAddonPurchase,
		});
		return NextResponse.json({
			ok: true,
			message: isCustomerPlanChange
				? "Pago validado. El cambio de plan se aplico correctamente."
				: isCustomerAddonPurchase
					? "Pago validado. El extra se activo correctamente."
				: isCustomerAccountExpansion
					? "Pago validado. Se registro el extra de sucursal en la cuenta del cliente."
					: isOnboardingFlow
						? "Pago validado. La suscripcion quedo activa correctamente."
						: "Pago validado. Quedo pendiente activacion manual tras la configuracion.",
			welcome_email_sent: welcomeSent,
		});
	} catch (err) {
		logger.error("validate payment error", ctx, { error: String(err) });
		return NextResponse.json({ error: "Error interno" }, { status: 500 });
	}
}
