import { NextRequest, NextResponse } from "next/server";

import {
	buildRecurringCharges,
	createPortalOrder,
	findOpenOrder,
	findPublicPlan,
	loadPortalBillingContext,
	nextCyclePlan,
	planMonthlyUsd,
	type BillingPlanRow,
	type PortalBillingContext,
} from "@/lib/billing/portal-billing";
import { isSubscriptionOrderKind } from "@/lib/billing/portal-orders";
import { isRenewalMonths, quoteRenewal } from "@/lib/billing/portal-pricing";
import { getCustomerAccountContext } from "@/lib/tenant/customer-account-context";
import { assertCustomerAccountRateLimit } from "@/lib/tenant/customer-account-rate-limit";

/** @service-role customer-account
 *
 * Renovar la suscripción desde /cuenta: N meses del plan más los extras mensuales, sumados
 * desde el vencimiento vigente (o desde hoy si ya venció). Crea un pedido que el dueño paga
 * con PayPal o con comprobante; se aplica al pagarse (`applyPortalPayment`).
 */

type RenewalPlan = { plan: BillingPlanRow; monthly: number };

function resolveRenewalPlan(
	ctx: PortalBillingContext,
	requestedPlanId: string,
): { ok: true; value: RenewalPlan } | { ok: false; error: string; status: number } {
	if (ctx.phase === "payment_pending") {
		return { ok: false, error: "Estamos validando tu primer pago. Cuando esté listo podrás renovar aquí.", status: 409 };
	}
	if (ctx.phase === "open_ended") {
		return { ok: false, error: "Tu cuenta no tiene fecha de vencimiento. Si necesitas cambiar algo, escríbenos.", status: 409 };
	}

	const country = ctx.company.country;
	const next = nextCyclePlan(ctx);
	let plan: BillingPlanRow | null;
	if (ctx.phase === "expired") {
		// Vencida: puede volver con cualquier plan a la venta, o con el suyo.
		plan = requestedPlanId
			? requestedPlanId === next?.id
				? next
				: findPublicPlan(ctx, requestedPlanId)
			: next;
		if (!plan) return { ok: false, error: "Elige un plan para renovar.", status: 400 };
	} else {
		// Con el periodo vigente se renueva el plan que regirá al vencimiento; para otro plan
		// está «Cambiar plan».
		if (requestedPlanId && requestedPlanId !== next?.id) {
			return { ok: false, error: "Para pasar a otro plan usa «Cambiar plan».", status: 400 };
		}
		plan = next;
		if (!plan) return { ok: false, error: "Tu cuenta no tiene plan asignado. Escríbenos para regularizarla.", status: 409 };
	}

	const monthly = planMonthlyUsd(plan, country);
	if (!(monthly > 0)) {
		return {
			ok: false,
			error:
				ctx.phase === "expired"
					? "Ese plan no tiene precio. Elige uno de los planes disponibles."
					: "Tu plan actual no tiene costo y no se renueva desde aquí. Elige un plan de pago en «Cambiar plan».",
			status: 409,
		};
	}
	return { ok: true, value: { plan, monthly } };
}

function buildQuote(ctx: PortalBillingContext, renewal: RenewalPlan, months: number) {
	return quoteRenewal({
		plan: { label: `Plan ${renewal.plan.name}`, unitMonthly: renewal.monthly },
		recurring: buildRecurringCharges(ctx, renewal.plan),
		months,
		endsAt: ctx.company.subscription_ends_at,
	});
}

function openSubscriptionOrder(ctx: PortalBillingContext) {
	return findOpenOrder(ctx, (kind) => isSubscriptionOrderKind(kind.kind));
}

export async function GET(req: NextRequest) {
	const ctx = await getCustomerAccountContext();
	if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

	const limited = await assertCustomerAccountRateLimit(ctx.companyId, "renewal_get", 40, 60_000);
	if (limited) return limited;

	const months = Number(req.nextUrl.searchParams.get("months") ?? 1);
	if (!isRenewalMonths(months)) return NextResponse.json({ error: "Elige 1, 3, 6 o 12 meses." }, { status: 400 });
	const planId = String(req.nextUrl.searchParams.get("planId") ?? "").trim();

	const billing = await loadPortalBillingContext(ctx.companyId);
	if (!billing) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });

	const renewal = resolveRenewalPlan(billing, planId);
	if (!renewal.ok) return NextResponse.json({ error: renewal.error, phase: billing.phase }, { status: renewal.status });

	return NextResponse.json({
		ok: true,
		phase: billing.phase,
		plan: { id: renewal.value.plan.id, name: renewal.value.plan.name, monthly: renewal.value.monthly },
		quote: buildQuote(billing, renewal.value, months),
		openOrderId: openSubscriptionOrder(billing)?.id ?? null,
	});
}

export async function POST(req: NextRequest) {
	const ctx = await getCustomerAccountContext();
	if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

	const limited = await assertCustomerAccountRateLimit(ctx.companyId, "renewal_post", 10, 60_000);
	if (limited) return limited;

	const body = (await req.json().catch(() => ({}))) as { months?: number; planId?: string };
	const months = Number(body.months ?? 1);
	if (!isRenewalMonths(months)) return NextResponse.json({ error: "Elige 1, 3, 6 o 12 meses." }, { status: 400 });

	const billing = await loadPortalBillingContext(ctx.companyId);
	if (!billing) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });

	const open = openSubscriptionOrder(billing);
	if (open) {
		return NextResponse.json(
			{ error: "Ya tienes un pago pendiente de tu plan. Págalo o anúlalo en «Pagos pendientes».", openOrderId: open.id },
			{ status: 409 },
		);
	}

	const renewal = resolveRenewalPlan(billing, String(body.planId ?? "").trim());
	if (!renewal.ok) return NextResponse.json({ error: renewal.error }, { status: renewal.status });

	const quote = buildQuote(billing, renewal.value, months);
	const created = await createPortalOrder({
		companyId: ctx.companyId,
		planId: renewal.value.plan.id,
		kind: "renewal",
		amount: quote.amount,
		monthsPaid: months,
	});
	if (!created.ok) return NextResponse.json({ error: created.error }, { status: 500 });

	return NextResponse.json({ ok: true, order: created.order, quote });
}
