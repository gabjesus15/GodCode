import { NextRequest, NextResponse } from "next/server";

import { PORTAL_ORDER_COLUMNS, type PortalOrderRow } from "@/lib/billing/portal-billing";
import { classifyPortalPaymentReference, describePortalOrder, isOrderAwaitingPayment } from "@/lib/billing/portal-orders";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { createPayPalOrder } from "@/lib/payments/paypal";
import { getCustomerAccountContext } from "@/lib/tenant/customer-account-context";
import { getPortalPayPalClientId } from "@/lib/tenant/customer-account-payment-methods";
import { assertCustomerAccountRateLimit } from "@/lib/tenant/customer-account-rate-limit";

/** @service-role customer-account
 *
 * Crea la orden de PayPal de un pedido del portal. El importe sale del pedido (lo calculó
 * el servidor al crearlo) y el pedido se busca con ctx.companyId.
 */

export async function POST(req: NextRequest) {
	const ctx = await getCustomerAccountContext();
	if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

	const limited = await assertCustomerAccountRateLimit(ctx.companyId, "paypal_order_post", 15, 60_000);
	if (limited) return limited;

	const body = (await req.json().catch(() => ({}))) as { paymentId?: string };
	const paymentId = String(body.paymentId ?? "").trim();
	if (!paymentId) return NextResponse.json({ error: "Falta el pago." }, { status: 400 });

	const [{ data: payment }, { data: company }] = await Promise.all([
		supabaseAdmin
			.from("payments_history")
			.select(PORTAL_ORDER_COLUMNS)
			.eq("id", paymentId)
			.eq("company_id", ctx.companyId)
			.maybeSingle(),
		supabaseAdmin.from("companies").select("name,country").eq("id", ctx.companyId).maybeSingle(),
	]);
	const order = payment as PortalOrderRow | null;
	if (!order) return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
	if (!isOrderAwaitingPayment(order)) {
		return NextResponse.json(
			{
				error:
					order.status === "paid"
						? "Este pago ya está hecho."
						: order.status === "pending_validation"
							? "Ya enviaste un comprobante y lo estamos revisando."
							: "Este pago ya no se puede pagar.",
			},
			{ status: 409 },
		);
	}
	const amount = Number(order.amount_paid ?? 0);
	if (!(amount > 0)) return NextResponse.json({ error: "Este pago no tiene importe." }, { status: 409 });

	if (!(await getPortalPayPalClientId((company?.country as string | null) ?? null))) {
		return NextResponse.json({ error: "PayPal no está disponible para tu cuenta. Usa otro método." }, { status: 409 });
	}

	const addonId = classifyPortalPaymentReference(order.payment_reference)?.addonId ?? null;
	const [{ data: plan }, { data: addon }] = await Promise.all([
		supabaseAdmin.from("plans").select("name").eq("id", order.plan_id).maybeSingle(),
		addonId ? supabaseAdmin.from("addons").select("name").eq("id", addonId).maybeSingle() : Promise.resolve({ data: null }),
	]);
	const concept = describePortalOrder(order, {
		plan: () => (plan as { name?: string } | null)?.name ?? null,
		addon: () => (addon as { name?: string } | null)?.name ?? null,
	});

	const created = await createPayPalOrder({
		amountUsd: amount,
		description: `${concept} · ${String(company?.name ?? "").trim()}`.trim(),
		meta: { kind: "portal", paymentId: order.id },
		invoiceId: order.id,
	});
	if (!created.ok) return NextResponse.json({ error: created.error }, { status: 502 });
	return NextResponse.json({ ok: true, orderId: created.orderId });
}
