import type { SupabaseClient } from "@supabase/supabase-js";

import { hashPaymentIdentity, normalizeEmail } from "@/lib/onboarding/trial-eligibility";
import { capturePayPalOrder, getPayPalOrder, toCents, type PayPalOrderSnapshot } from "@/lib/payments/paypal";
import { applyPortalPayment, PORTAL_PAYMENT_COLUMNS, type PortalPaymentRow } from "./payment-review";

export type CapturePortalOrderResult =
	| { ok: true; alreadyPaid?: boolean; message: string }
	| { ok: false; error: string; status: number };

/**
 * Cobra la orden de PayPal de un pedido del portal y aplica lo comprado.
 *
 * - La orden debe ser de un pedido de esta empresa y por el importe exacto del pedido.
 * - No se captura si el pedido ya está pagado, anulado o con un comprobante en revisión:
 *   así no se cobra dos veces lo mismo (PayPal además rechaza un segundo cobro con el
 *   mismo `invoiceId`).
 * - Si PayPal cobró pero no se pudo aplicar, el pedido queda para revisión del equipo y
 *   se abre un ticket para que nadie pierda el pago.
 */
export async function capturePortalPayPalOrder(params: {
	supabaseAdmin: SupabaseClient;
	companyId: string;
	orderId: string;
}): Promise<CapturePortalOrderResult> {
	const { supabaseAdmin, companyId, orderId } = params;

	const order = await getPayPalOrder(orderId);
	if (!order) return { ok: false, error: "No pudimos consultar el pago en PayPal. Intenta de nuevo.", status: 502 };
	if (order.meta?.kind !== "portal") return { ok: false, error: "Esta orden de PayPal no es de tu cuenta.", status: 400 };

	const { data } = await supabaseAdmin
		.from("payments_history")
		.select(`${PORTAL_PAYMENT_COLUMNS},reference_file_url`)
		.eq("id", order.meta.paymentId)
		.maybeSingle();
	const payment = data as (PortalPaymentRow & { reference_file_url: string | null }) | null;
	if (!payment || payment.company_id !== companyId) {
		return { ok: false, error: "Esta orden de PayPal no es de tu cuenta.", status: 403 };
	}

	const expectedCents = toCents(payment.amount_paid);
	const amountMatches = (snapshot: PayPalOrderSnapshot) =>
		expectedCents > 0 && snapshot.amountCents === expectedCents && (snapshot.currency ?? "USD") === "USD";
	if (!amountMatches(order)) {
		return { ok: false, error: "El importe de la orden no coincide con el pago. Vuelve a intentarlo.", status: 409 };
	}

	const status = String(payment.status ?? "").toLowerCase();
	if (status === "paid") {
		// Doble clic o regreso de PayPal: la misma orden ya se aplicó.
		return order.status === "COMPLETED"
			? { ok: true, alreadyPaid: true, message: "Este pago ya estaba confirmado." }
			: { ok: false, error: "Este pago ya está hecho.", status: 409 };
	}
	if (status === "cancelled") return { ok: false, error: "Anulaste este pago. Crea uno nuevo si lo necesitas.", status: 409 };
	if (status === "pending_validation" && String(payment.reference_file_url ?? "").trim()) {
		return { ok: false, error: "Ya enviaste un comprobante para este pago y lo estamos revisando.", status: 409 };
	}

	const captured = order.status === "COMPLETED" ? order : await capturePayPalOrder(orderId);
	if (!captured || captured.status !== "COMPLETED") {
		return { ok: false, error: "PayPal todavía no confirma el pago. Si se cobró, lo verás aplicado en unos minutos.", status: 409 };
	}
	if (!amountMatches(captured)) {
		await openPaymentIssueTicket(supabaseAdmin, payment, orderId, "El importe cobrado por PayPal no coincide con el pedido.");
		return { ok: false, error: "El importe cobrado no coincide. Nuestro equipo lo revisa y te escribe.", status: 409 };
	}

	const payerEmail = normalizeEmail(captured.payerEmail);
	const applied = await applyPortalPayment(supabaseAdmin, payment, {
		// Con el dinero ya cobrado se aplica aunque el pedido se haya anulado en el camino.
		claimFrom: ["pending", "pending_validation", "rejected", "cancelled"],
		method: { slug: "paypal", name: "PayPal" },
		payerEmailNormalized: payerEmail || null,
		paypalPayerIdHash: captured.payerId ? hashPaymentIdentity(captured.payerId) : null,
		notify: true,
	});
	if (applied.ok) return { ok: true, message: applied.message.replace(/^Pago validado: /, "Pago recibido: ") };

	// Otra petición pudo aplicarlo a la vez (misma orden): eso es un éxito.
	const { data: after } = await supabaseAdmin.from("payments_history").select("status").eq("id", payment.id).maybeSingle();
	if (String(after?.status ?? "") === "paid") return { ok: true, alreadyPaid: true, message: "Pago recibido." };

	await openPaymentIssueTicket(supabaseAdmin, payment, orderId, `PayPal cobró pero no se pudo aplicar: ${applied.error}`);
	return {
		ok: false,
		error: "Recibimos tu pago, pero no pudimos aplicarlo automáticamente. Nuestro equipo lo revisa hoy y te escribe.",
		status: 500,
	};
}

async function openPaymentIssueTicket(
	supabaseAdmin: SupabaseClient,
	payment: PortalPaymentRow,
	paypalOrderId: string,
	detail: string,
): Promise<void> {
	console.error("portal paypal capture issue:", { paymentId: payment.id, paypalOrderId, detail });
	const nowIso = new Date().toISOString();
	await supabaseAdmin.from("saas_tickets").insert({
		company_id: payment.company_id,
		source: "system",
		created_by_email: "system@internal",
		subject: `Revisar cobro de PayPal · ${payment.payment_reference ?? payment.id}`,
		description: [
			detail,
			`Pedido: ${payment.payment_reference ?? payment.id}`,
			`Orden de PayPal: ${paypalOrderId}`,
			"Aplica el pago desde «Pagos por validar» o reembolsa desde PayPal.",
		].join("\n"),
		category: "billing",
		priority: "high",
		status: "open",
		last_message_at: nowIso,
	});
}
