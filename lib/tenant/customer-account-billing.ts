import { quoteCoTermCharge, resolveSubscriptionPhase, type SubscriptionPhase } from "@/lib/billing/portal-pricing";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { resolveContinentFromCountryInput } from "@/lib/plans/plan-regional-pricing";
import {
	getPortalPayPalClientId,
	listPortalPaymentMethods,
	type PortalPaymentMethod,
} from "@/lib/tenant/customer-account-payment-methods";

export type CompanyBillingSnapshot = {
	id: string;
	name: string;
	country: string | null;
	plan_id: string | null;
	subscription_status: string | null;
	subscription_ends_at: string | null;
	plan: {
		id: string;
		name: string;
		max_branches: number | null;
	} | null;
};

type AddonSnapshot = {
	id: string;
	slug: string;
	name: string;
	type: string;
	price_monthly: number | null;
	price_one_time: number | null;
};

type BranchEntitlementSnapshot = {
	quantity: number | null;
	status: string | null;
	expires_at: string | null;
};

const DEFAULT_BRANCH_EXPANSION_MONTHLY_USD = 20;

function isBranchExpansionAddon(addon: AddonSnapshot): boolean {
	const haystack = `${addon.slug} ${addon.name} ${addon.type}`.toLowerCase();
	return haystack.includes("branch") || haystack.includes("sucursal");
}

function resolveBranchAddonPrice(addon: AddonSnapshot | null, country: string | null | undefined): number {
	if (addon?.price_monthly && addon.price_monthly > 0) {
		return addon.price_monthly;
	}
	const continent = resolveContinentFromCountryInput(country);
	if (continent === "USA/Canada" || continent === "Europe") {
		return 30;
	}
	return DEFAULT_BRANCH_EXPANSION_MONTHLY_USD;
}

export type CustomerAccountBillingContext = {
	company: CompanyBillingSnapshot;
	phase: SubscriptionPhase;
	activeBranchCount: number;
	maxBranches: number | null;
	extraBranchEntitlements: number;
	effectiveMaxBranches: number | null;
	branchAddon: AddonSnapshot | null;
	branchPriceMonthly: number;
	requiresPaymentForExpansion: boolean;
	paymentMethods: PortalPaymentMethod[];
	paypalClientId: string | null;
};

export async function getCustomerAccountBillingContext(companyId: string): Promise<CustomerAccountBillingContext | null> {
	const [{ data: company }, { count: branchCount }, { data: addons }, { data: entitlements }] =
		await Promise.all([
			supabaseAdmin
				.from("companies")
				.select("id,name,country,plan_id,subscription_status,subscription_ends_at,plan:plans(id,name,max_branches)")
				.eq("id", companyId)
				.maybeSingle(),
			supabaseAdmin
				.from("branches")
				.select("id", { count: "exact", head: true })
				.eq("company_id", companyId)
				.eq("is_active", true),
			supabaseAdmin
				.from("addons")
				.select("id,slug,name,type,price_monthly,price_one_time")
				.eq("is_active", true)
				.order("sort_order", { ascending: true }),
			supabaseAdmin
				.from("company_branch_extra_entitlements")
				.select("quantity,status,expires_at")
				.eq("company_id", companyId),
		]);

	const snapshot = company as CompanyBillingSnapshot | null;
	if (!snapshot?.id) return null;

	const [paymentMethods, paypalClientId] = await Promise.all([
		listPortalPaymentMethods(snapshot.country),
		getPortalPayPalClientId(snapshot.country),
	]);

	const branchAddon = ((addons ?? []) as AddonSnapshot[]).find(isBranchExpansionAddon) ?? null;
	const branchPriceMonthly = resolveBranchAddonPrice(branchAddon, snapshot.country);
	const maxBranches = snapshot.plan?.max_branches ?? null;
	const activeBranchCount = Number(branchCount ?? 0);
	const nowIso = new Date().toISOString();
	const extraBranchEntitlements = ((entitlements ?? []) as BranchEntitlementSnapshot[])
		.filter((row) => row.status === "active")
		.filter((row) => !row.expires_at || row.expires_at > nowIso)
		.reduce((acc, row) => acc + Math.max(0, Number(row.quantity ?? 0) || 0), 0);
	const effectiveMaxBranches = maxBranches == null ? null : maxBranches + extraBranchEntitlements;
	const requiresPaymentForExpansion = effectiveMaxBranches != null && activeBranchCount >= effectiveMaxBranches;

	return {
		company: snapshot,
		phase: resolveSubscriptionPhase(snapshot.subscription_status, snapshot.subscription_ends_at),
		activeBranchCount,
		maxBranches,
		extraBranchEntitlements,
		effectiveMaxBranches,
		branchAddon,
		branchPriceMonthly,
		requiresPaymentForExpansion,
		paymentMethods,
		paypalClientId,
	};
}

export function buildBillingOptionsResponse(companyId: string, billingCtx: CustomerAccountBillingContext) {
	// Una sucursal extra vence con la suscripción: hoy se paga hasta el vencimiento.
	const coTerm = quoteCoTermCharge({
		unitMonthly: billingCtx.branchPriceMonthly,
		quantity: 1,
		endsAt: billingCtx.company.subscription_ends_at,
	});

	return {
		companyId,
		phase: billingCtx.phase,
		activeBranchCount: billingCtx.activeBranchCount,
		maxBranches: billingCtx.maxBranches,
		extraBranchEntitlements: billingCtx.extraBranchEntitlements,
		effectiveMaxBranches: billingCtx.effectiveMaxBranches,
		requiresPaymentForExpansion: billingCtx.requiresPaymentForExpansion,
		branchExpansionPriceMonthly: billingCtx.branchPriceMonthly,
		expansionQuote: coTerm
			? { remainingDays: coTerm.remainingDays, amountPerBranch: coTerm.amount, coversUntil: coTerm.coversUntil }
			: null,
		paymentMethods: billingCtx.paymentMethods,
		paypalClientId: billingCtx.paypalClientId,
	};
}
