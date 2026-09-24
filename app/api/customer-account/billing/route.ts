import { NextRequest, NextResponse } from "next/server";

import { createPortalOrder, findOpenOrder, loadPortalBillingContext } from "@/lib/billing/portal-billing";
import { formatUsd, quoteCoTermCharge } from "@/lib/billing/portal-pricing";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { logger } from "@/lib/infra/logger";
import { getCustomerAccountContext } from "@/lib/tenant/customer-account-context";
import { assertCustomerAccountRateLimit } from "@/lib/tenant/customer-account-rate-limit";
import { buildBillingOptionsResponse, getCustomerAccountBillingContext } from "@/lib/tenant/customer-account-billing";

/** @service-role customer-account
 *
 * GET: opciones de facturación del portal (capacidad de sucursales, métodos de pago, PayPal).
 * POST: comprar sucursales extra. Vencen con la suscripción: hoy se paga hasta el
 * vencimiento y después entran en cada renovación. Nuestro equipo crea la sucursal pedida
 * cuando se confirma el pago (queda un ticket con los datos).
 */

export async function GET() {
	const ctx = await getCustomerAccountContext();
	if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

	const limited = await assertCustomerAccountRateLimit(ctx.companyId, "billing_get", 30, 60_000);
	if (limited) return limited;

	const billingCtx = await getCustomerAccountBillingContext(ctx.companyId);
	if (!billingCtx) return NextResponse.json({ error: "No se pudo cargar la facturación." }, { status: 404 });

	return NextResponse.json(buildBillingOptionsResponse(ctx.companyId, billingCtx));
}

const MAX_BRANCHES_PER_ORDER = 10;

export async function POST(req: NextRequest) {
	const ctx = await getCustomerAccountContext();
	if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

	const limited = await assertCustomerAccountRateLimit(ctx.companyId, "billing_post", 10, 60_000);
	if (limited) return limited;

	const payload = (await req.json().catch(() => ({}))) as {
		quantity?: number;
		notes?: string;
		branchName?: string;
		branchAddress?: string;
	};
	const quantity = Math.max(1, Math.min(MAX_BRANCHES_PER_ORDER, Math.floor(Number(payload.quantity ?? 1)) || 1));
	const notes = String(payload.notes ?? "").trim().slice(0, 500);
	const branchName = String(payload.branchName ?? "").trim().slice(0, 120);
	const branchAddress = String(payload.branchAddress ?? "").trim().slice(0, 200);
	if (!branchName) return NextResponse.json({ error: "Indica el nombre de la nueva sucursal." }, { status: 400 });

	const [billingCtx, billing] = await Promise.all([
		getCustomerAccountBillingContext(ctx.companyId),
		loadPortalBillingContext(ctx.companyId),
	]);
	if (!billingCtx || !billing) return NextResponse.json({ error: "No se pudo cargar la facturación." }, { status: 404 });

	if (!billingCtx.requiresPaymentForExpansion) {
		return NextResponse.json(
			{ error: "Tu plan todavía tiene cupo: pide la sucursal sin pago desde «Agregar sucursal»." },
			{ status: 400 },
		);
	}
	if (billing.phase !== "active" && billing.phase !== "trial") {
		const message =
			billing.phase === "cancelling"
				? "Tu suscripción está cancelada. Reactívala para sumar sucursales."
				: billing.phase === "expired"
					? "Tu suscripción venció. Renueva tu plan para sumar sucursales."
					: billing.phase === "payment_pending"
						? "Estamos validando tu primer pago. Podrás sumar sucursales en cuanto quede activo."
						: "Las sucursales extra de esta cuenta las activa nuestro equipo. Escríbenos por Soporte.";
		return NextResponse.json({ error: message }, { status: 409 });
	}
	if (!billing.company.plan_id) {
		return NextResponse.json({ error: "Tu cuenta no tiene plan asignado. Escríbenos para regularizarla." }, { status: 409 });
	}
	if (findOpenOrder(billing, (kind) => kind.kind === "branch_expansion")) {
		return NextResponse.json(
			{ error: "Ya tienes un pago pendiente de sucursales extra. Págalo o anúlalo en «Pagos pendientes»." },
			{ status: 409 },
		);
	}

	const unitPrice = billingCtx.branchPriceMonthly;
	const quote = quoteCoTermCharge({ unitMonthly: unitPrice, quantity, endsAt: billing.company.subscription_ends_at });
	if (!quote || !(unitPrice > 0)) {
		return NextResponse.json({ error: "No pudimos calcular el precio. Escríbenos por Soporte." }, { status: 409 });
	}

	const created = await createPortalOrder({
		companyId: ctx.companyId,
		planId: billing.company.plan_id,
		kind: "branch_expansion",
		amount: quote.amount,
	});
	if (!created.ok) return NextResponse.json({ error: created.error }, { status: 500 });
	const order = created.order;

	const factor = Number((quote.remainingDays / 30).toFixed(6));
	const { error: entitlementError } = await supabaseAdmin.from("company_branch_extra_entitlements").insert({
		company_id: ctx.companyId,
		payment_id: order.id,
		quantity,
		months_purchased: 1,
		first_cycle_factor: factor,
		effective_months: factor,
		unit_price: unitPrice,
		amount_paid: quote.amount,
		status: "pending",
		starts_at: null,
		expires_at: null,
		updated_at: new Date().toISOString(),
	});
	if (entitlementError) {
		logger.error("branch expansion entitlement insert", { companyId: ctx.companyId, error: entitlementError.message });
		await supabaseAdmin.from("payments_history").delete().eq("id", order.id);
		return NextResponse.json({ error: "No pudimos registrar la compra. Intenta de nuevo." }, { status: 500 });
	}

	// La sucursal la crea el equipo: el ticket lleva lo que pidió el dueño. Si anula el pago,
	// `cancelPortalOrder` lo cierra.
	const description = [
		`Nueva sucursal: ${branchName}`,
		branchAddress ? `Dirección: ${branchAddress}` : null,
		`Cupos comprados: ${quantity}`,
		`Monto: ${formatUsd(quote.amount)} (hasta el vencimiento del plan, ${quote.remainingDays} días)`,
		`Referencia del pago: ${order.payment_reference}`,
		notes ? `Notas: ${notes}` : null,
		"Se crea cuando el pago quede confirmado.",
	]
		.filter(Boolean)
		.join("\n");
	const nowIso = new Date().toISOString();
	const { data: ticket } = await supabaseAdmin
		.from("saas_tickets")
		.insert({
			company_id: ctx.companyId,
			created_by_email: ctx.email,
			source: "tenant",
			subject: `Nueva sucursal: ${branchName} · ${order.payment_reference}`,
			description,
			category: "account",
			priority: "medium",
			status: "open",
			last_message_at: nowIso,
		})
		.select("id")
		.single();
	if (ticket?.id) {
		await supabaseAdmin.from("saas_ticket_messages").insert({
			ticket_id: ticket.id,
			author_type: "tenant",
			author_email: ctx.email,
			is_internal: false,
			message: description,
		});
	}

	return NextResponse.json({
		ok: true,
		order,
		summary: { unitPrice, quantity, amount: quote.amount, remainingDays: quote.remainingDays, coversUntil: quote.coversUntil },
	});
}
