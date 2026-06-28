import { NextRequest, NextResponse } from "next/server";

import { logAdminAudit } from "@/lib/super-admin/admin-audit";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { logger, createRequestContext } from "@/lib/infra/logger";
import { SAAS_MUTATE_ROLES, validateAdminRolesOnServer } from "@/utils/admin/server-auth";
import { proxyToOnboardingBilling } from "@/lib/onboarding/service-proxy";

export async function POST(req: NextRequest) {
	const proxied = await proxyToOnboardingBilling(req, "/api/super-admin/payments/reject");
	if (proxied) return proxied;

	const ctx = createRequestContext("/api/super-admin/payments/reject", "POST");
	const permission = await validateAdminRolesOnServer([...SAAS_MUTATE_ROLES]);
	if (!permission.ok) {
		return NextResponse.json({ error: permission.error ?? "No autorizado" }, { status: permission.status ?? 403 });
	}

	try {
		const body = (await req.json().catch(() => ({}))) as {
			payment_id?: string;
			payment_reference?: string;
			reason?: string;
		};
		const paymentId = typeof body.payment_id === "string" ? body.payment_id.trim() : "";
		const paymentRef = typeof body.payment_reference === "string" ? body.payment_reference.trim() : "";
		const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 280) : "";

		if (!paymentId && !paymentRef) {
			return NextResponse.json({ error: "Indica payment_id o payment_reference" }, { status: 400 });
		}

		const query = supabaseAdmin
			.from("payments_history")
			.select("id,company_id,status,payment_reference")
			.limit(1);
		if (paymentId) query.eq("id", paymentId);
		else query.eq("payment_reference", paymentRef);

		const { data: payment, error: payError } = await query.maybeSingle();

		if (payError || !payment) {
			const refForApp = paymentRef || (paymentId
				? (await supabaseAdmin
						.from("payments_history")
						.select("payment_reference")
						.eq("id", paymentId)
						.maybeSingle()).data?.payment_reference ?? ""
				: "");

			const { data: app } = await supabaseAdmin
				.from("onboarding_applications")
				.select("id,payment_reference,payment_status")
				.eq("payment_reference", refForApp || paymentRef)
				.maybeSingle();

			if (!app || String(app.payment_status ?? "").toLowerCase() === "rejected") {
				return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
			}

			if (!["pending_validation", "pending"].includes(String(app.payment_status ?? "").toLowerCase())) {
				return NextResponse.json(
					{ error: "Este pago ya fue procesado o no está pendiente de validación" },
					{ status: 400 },
				);
			}

			const nowIso = new Date().toISOString();
			await supabaseAdmin
				.from("onboarding_applications")
				.update({ payment_status: "rejected", updated_at: nowIso })
				.eq("id", app.id);

			await logAdminAudit({
				actorEmail: permission.email ?? "",
				actorRole: permission.role,
				action: "payment.reject",
				resourceType: "onboarding_applications",
				resourceId: app.id,
				metadata: reason ? { reason } : {},
			});

			logger.info("Pago rechazado", ctx, { ...(reason ? { reason } : {}) });
			return NextResponse.json({ ok: true, message: "Pago rechazado correctamente" });
		}

		if (payment.status !== "pending_validation") {
			return NextResponse.json(
				{ error: "Este pago ya fue procesado o no está pendiente de validación" },
				{ status: 400 },
			);
		}

		const nowIso = new Date().toISOString();
		const { data: rejectedRow, error: updateError } = await supabaseAdmin
			.from("payments_history")
			.update({ status: "rejected", payment_date: nowIso })
			.eq("id", payment.id)
			.eq("status", "pending_validation")
			.select("id")
			.maybeSingle();

		if (updateError || !rejectedRow) {
			return NextResponse.json({ error: "No se pudo rechazar el pago" }, { status: 409 });
		}

		if (payment.company_id) {
			await supabaseAdmin
				.from("onboarding_applications")
				.update({ payment_status: "rejected", updated_at: nowIso })
				.eq("company_id", payment.company_id)
				.in("payment_status", ["pending_validation", "pending"]);
		}

		await logAdminAudit({
			actorEmail: permission.email ?? "",
			actorRole: permission.role,
			action: "payment.reject",
			resourceType: "payments_history",
			resourceId: payment.id,
			metadata: {
				company_id: payment.company_id,
				...(reason ? { reason } : {}),
			},
		});

		logger.info("Pago rechazado", ctx, {
			companyId: payment.company_id ?? undefined,
			paymentId: payment.id ?? undefined,
			...(reason ? { reason } : {}),
		});

		return NextResponse.json({ ok: true, message: "Pago rechazado correctamente" });
	} catch (err) {
		logger.error("reject payment error", ctx, { error: String(err) });
		return NextResponse.json({ error: "Error interno" }, { status: 500 });
	}
}
