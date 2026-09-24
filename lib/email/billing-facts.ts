import { buildRecurringCharges, loadPortalBillingContext, nextCyclePlan, planMonthlyUsd, type PortalBillingContext } from "@/lib/billing/portal-billing";
import { classifyPortalPaymentReference, isOrderAwaitingPayment, isSubscriptionOrderKind } from "@/lib/billing/portal-orders";
import { formatUsd, quoteRenewal } from "@/lib/billing/portal-pricing";

import { timeZoneForCountry } from "./format";

export type RenewalFacts = {
	ctx: PortalBillingContext;
	planName: string;
	/** Renovación mensual en USD (plan regional + extras mensuales + sucursales extra). */
	monthly: number;
	amount: string;
	lines: Array<{ label: string; value: string }>;
	/** Ya hay una renovación o cambio de plan iniciado sin pagar. */
	hasOpenOrder: boolean;
	timeZone: string;
};

/** La renovación mensual tal como la muestra /cuenta, para citarla en los correos. */
export async function loadRenewalFacts(companyId: string, now = new Date()): Promise<RenewalFacts | null> {
	const ctx = await loadPortalBillingContext(companyId, now);
	if (!ctx) return null;
	const plan = nextCyclePlan(ctx) ?? ctx.currentPlan;
	const planName = plan?.name ?? ctx.currentPlan?.name ?? "tu plan";
	const quote = quoteRenewal({
		plan: { label: `Plan ${planName}`, unitMonthly: planMonthlyUsd(plan, ctx.company.country) },
		recurring: buildRecurringCharges(ctx, plan),
		months: 1,
		endsAt: ctx.company.subscription_ends_at,
		now,
	});
	const hasOpenOrder = ctx.openOrders.some((order) => {
		const kind = classifyPortalPaymentReference(order.payment_reference)?.kind;
		return isSubscriptionOrderKind(kind) && isOrderAwaitingPayment(order);
	});
	return {
		ctx,
		planName,
		monthly: quote.monthlyTotal,
		amount: formatUsd(quote.monthlyTotal),
		lines: quote.lines.map((line) => ({ label: line.label, value: formatUsd(line.monthly) })),
		hasOpenOrder,
		timeZone: timeZoneForCountry(ctx.company.country),
	};
}
