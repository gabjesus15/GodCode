import { NextRequest, NextResponse } from "next/server";

import { validatePayment } from "@/lib/billing/payment-review";
import { logAdminAudit } from "@/lib/super-admin/admin-audit";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { proxyToOnboardingBilling } from "@/lib/onboarding/service-proxy";
import { SAAS_MUTATE_ROLES, validateAdminRolesOnServer } from "@/utils/admin/server-auth";

/** @service-role super-admin
 *
 * El rol se valida antes de reenviar al microservicio. Con el servicio activo lo ejecuta
 * él; si no, este mismo proceso con el mismo código (`lib/billing/payment-review`).
 * La auditoría se registra aquí en ambos casos.
 */

type ValidateResponse = { error?: string; company_id?: string | null; source?: string; kind?: string | null; welcome_email_sent?: boolean };

export async function POST(req: NextRequest) {
	const permission = await validateAdminRolesOnServer([...SAAS_MUTATE_ROLES]);
	if (!permission.ok) {
		return NextResponse.json({ error: permission.error ?? "No autorizado" }, { status: permission.status ?? 403 });
	}

	const body = (await req.clone().json().catch(() => ({}))) as { payment_id?: string; payment_reference?: string };
	const paymentId = typeof body.payment_id === "string" ? body.payment_id.trim() : "";
	const paymentRef = typeof body.payment_reference === "string" ? body.payment_reference.trim() : "";
	if (!paymentId && !paymentRef) {
		return NextResponse.json({ error: "Indica payment_id o payment_reference" }, { status: 400 });
	}

	let response: NextResponse;
	const proxied = await proxyToOnboardingBilling(req, "/api/super-admin/payments/validate");
	if (proxied) {
		response = proxied;
	} else {
		const result = await validatePayment({
			supabaseAdmin,
			paymentId,
			paymentReference: paymentRef,
		});
		response = result.ok
			? NextResponse.json({
					ok: true,
					message: result.message,
					company_id: result.companyId,
					source: result.source,
					kind: result.kind ?? null,
					welcome_email_sent: result.welcomeSent ?? false,
					owner_ready: result.ownerReady ?? null,
				})
			: NextResponse.json({ error: result.error }, { status: result.status });
	}

	if (response.ok) {
		const payload = (await response.clone().json().catch(() => ({}))) as ValidateResponse;
		await logAdminAudit({
			actorEmail: permission.email ?? "",
			actorRole: permission.role,
			action: "payment.validate",
			resourceType: paymentId ? "payments_history" : "payment_reference",
			resourceId: paymentId || paymentRef,
			companyId: payload.company_id ?? null,
			metadata: {
				payment_reference: paymentRef || null,
				source: payload.source ?? null,
				kind: payload.kind ?? null,
				welcome_email_sent: payload.welcome_email_sent ?? false,
				via: proxied ? "onboarding-billing" : "local",
			},
		});
	}

	return response;
}
