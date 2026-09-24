import { NextRequest, NextResponse } from "next/server";

import { capturePortalPayPalOrder } from "@/lib/billing/portal-paypal";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { getCustomerAccountContext } from "@/lib/tenant/customer-account-context";
import { assertCustomerAccountRateLimit } from "@/lib/tenant/customer-account-rate-limit";

/** @service-role customer-account
 *
 * Captura la orden de PayPal aprobada en /cuenta. `capturePortalPayPalOrder` comprueba que
 * la orden sea de un pedido de ctx.companyId y por su importe exacto antes de cobrar.
 */

export async function POST(req: NextRequest) {
	const ctx = await getCustomerAccountContext();
	if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

	const limited = await assertCustomerAccountRateLimit(ctx.companyId, "paypal_capture_post", 15, 60_000);
	if (limited) return limited;

	const body = (await req.json().catch(() => ({}))) as { orderId?: string };
	const orderId = String(body.orderId ?? "").trim();
	if (!orderId) return NextResponse.json({ error: "Falta la orden de PayPal." }, { status: 400 });

	const result = await capturePortalPayPalOrder({ supabaseAdmin, companyId: ctx.companyId, orderId });
	if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
	return NextResponse.json({ ok: true, message: result.message, alreadyPaid: result.alreadyPaid ?? false });
}
