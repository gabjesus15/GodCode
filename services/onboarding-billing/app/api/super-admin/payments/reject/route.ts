import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { logger, createRequestContext } from "@/lib/infra/logger";
import { rejectPayment } from "@/lib/billing/payment-review";
import { validateApiKey } from "../../../../../lib/api-key-auth";

/** @service-role internal-api-key
 *
 * El rol super_admin ya lo validó el Portal antes de reenviar (y registra la auditoría).
 */

export async function POST(req: NextRequest) {
	const ctx = createRequestContext("/api/super-admin/payments/reject", "POST");

	const auth = validateApiKey(req);
	if (!auth.ok) return auth.response;

	try {
		const body = (await req.json().catch(() => ({}))) as { payment_id?: string; payment_reference?: string; reason?: string };
		const paymentId = typeof body.payment_id === "string" ? body.payment_id.trim() : "";
		const paymentRef = typeof body.payment_reference === "string" ? body.payment_reference.trim() : "";
		const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 280) : "";
		if (!paymentId && !paymentRef) {
			return NextResponse.json({ error: "Indica payment_id o payment_reference" }, { status: 400 });
		}

		const result = await rejectPayment({
			supabaseAdmin,
			paymentId,
			paymentReference: paymentRef,
			reason,
		});
		if (!result.ok) {
			return NextResponse.json({ error: result.error }, { status: result.status });
		}

		logger.info("Pago rechazado", ctx, { companyId: result.companyId ?? undefined, source: result.source });
		return NextResponse.json({ ok: true, message: result.message, company_id: result.companyId, source: result.source });
	} catch (err) {
		logger.error("reject payment error", ctx, { error: String(err) });
		return NextResponse.json({ error: "Error interno" }, { status: 500 });
	}
}
