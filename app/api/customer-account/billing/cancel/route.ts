import { NextRequest, NextResponse } from "next/server";

import { cancelPortalOrder } from "@/lib/billing/portal-billing";
import { getCustomerAccountContext } from "@/lib/tenant/customer-account-context";
import { assertCustomerAccountRateLimit } from "@/lib/tenant/customer-account-rate-limit";

/** @service-role customer-account
 *
 * Anula un pedido del portal que todavía no se pagó (ni está en revisión). El pedido se
 * busca con ctx.companyId dentro de `cancelPortalOrder`.
 */

export async function POST(req: NextRequest) {
	const ctx = await getCustomerAccountContext();
	if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

	const limited = await assertCustomerAccountRateLimit(ctx.companyId, "billing_cancel_post", 15, 60_000);
	if (limited) return limited;

	const body = (await req.json().catch(() => ({}))) as { paymentId?: string };
	const paymentId = String(body.paymentId ?? "").trim();
	if (!paymentId) return NextResponse.json({ error: "Falta el pago." }, { status: 400 });

	const result = await cancelPortalOrder(ctx.companyId, paymentId);
	if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
	return NextResponse.json({ ok: true, message: "Pago anulado." });
}
