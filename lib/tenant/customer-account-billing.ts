import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { normalizeCountryCode } from "@/lib/geo/country-registry";
import { resolveContinentFromCountryInput } from "@/lib/plans/plan-regional-pricing";
import { computeExpansionAmount } from "@/lib/tenant/customer-account-expansion-pricing";

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

type MethodSnapshot = {
	id: string;
	slug: string;
	name: string;
	countries: string[] | null;
	auto_verify: boolean;
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

export async function getCustomerAccountBillingContext(companyId: string) {
	const [{ data: company }, { count: branchCount }, { data: addons }, { data: methods }, { data: entitlements }] =
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
				.from("plan_payment_methods")
				.select("id,slug,name,countries,auto_verify")
				.eq("is_active", true)
				.order("sort_order", { ascending: true }),
			supabaseAdmin
				.from("company_branch_extra_entitlements")
				.select("quantity,status,expires_at")
				.eq("company_id", companyId),
		]);

	const snapshot = company as CompanyBillingSnapshot | null;
	if (!snapshot?.id) return null;

	const normalizedCountry = normalizeCountryCode(snapshot.country);
	const methodsRows = ((methods ?? []) as MethodSnapshot[]).filter((method) => {
		if (!normalizedCountry) return true;
		if (!Array.isArray(method.countries) || method.countries.length === 0) return true;
		return method.countries.includes(normalizedCountry) || method.countries.includes(snapshot.country ?? "");
	});

	const methodsWithConfig = await Promise.all(
		methodsRows.map(async (method) => {
			const { data: configRows } = await supabaseAdmin
				.from("plan_payment_method_config")
				.select("key,value")
				.eq("method_id", method.id);

			const config: Record<string, string> = {};
			for (const row of configRows ?? []) {
				if (row.key) config[row.key] = row.value ?? "";
			}

			return { ...method, config };
		}),
	);

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
		activeBranchCount,
		maxBranches,
		extraBranchEntitlements,
		effectiveMaxBranches,
		branchAddon,
		branchPriceMonthly,
		requiresPaymentForExpansion,
		paymentMethods: methodsWithConfig,
	};
}

export function buildBillingOptionsResponse(
	companyId: string,
	billingCtx: NonNullable<Awaited<ReturnType<typeof getCustomerAccountBillingContext>>>,
) {
	const pricing = computeExpansionAmount({
		unitPrice: billingCtx.branchPriceMonthly,
		quantity: 1,
		months: 1,
		subscriptionEndsAt: billingCtx.company.subscription_ends_at,
	});

	return {
		companyId,
		activeBranchCount: billingCtx.activeBranchCount,
		maxBranches: billingCtx.maxBranches,
		extraBranchEntitlements: billingCtx.extraBranchEntitlements,
		effectiveMaxBranches: billingCtx.effectiveMaxBranches,
		requiresPaymentForExpansion: billingCtx.requiresPaymentForExpansion,
		branchExpansionPriceMonthly: billingCtx.branchPriceMonthly,
		coTermWithSubscription: true,
		daysUntilPlanEnd: pricing.daysUntilPlanEnd,
		expansionPreview: {
			unitPrice: billingCtx.branchPriceMonthly,
			firstCycleFactor: pricing.firstCycleFactor,
			sampleAmountQty1Months1: pricing.amount,
		},
		branchAddon: billingCtx.branchAddon
			? {
					id: billingCtx.branchAddon.id,
					slug: billingCtx.branchAddon.slug,
					name: billingCtx.branchAddon.name,
				}
			: null,
		paymentMethods: billingCtx.paymentMethods,
	};
}

export { computeExpansionAmount };
