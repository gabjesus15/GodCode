import { supabaseAdmin } from "@/lib/infra/supabase-admin";

export const BETA_BRANCH_LIMIT = 2;

export async function checkBetaBranchLimit(companyId: string): Promise<{
	allowed: boolean;
	reason?: string;
	branchCount?: number;
}> {
	const { data: company, error: companyError } = await supabaseAdmin
		.from("companies")
		.select("plan_id")
		.eq("id", companyId)
		.maybeSingle();

	if (companyError || !company) {
		return { allowed: false, reason: "Company not found" };
	}

	const { data: betaPlan } = await supabaseAdmin
		.from("plans")
		.select("id")
		.ilike("name", "%beta%")
		.maybeSingle();

	if (!betaPlan || company.plan_id !== betaPlan.id) {
		return { allowed: true };
	}

	const { count } = await supabaseAdmin
		.from("branches")
		.select("id", { count: "exact", head: true })
		.eq("company_id", companyId);

	const branchCount = count ?? 0;
	if (branchCount >= BETA_BRANCH_LIMIT) {
		return {
			allowed: false,
			reason: `El plan beta solo permite ${BETA_BRANCH_LIMIT} sucursales`,
			branchCount,
		};
	}

	return { allowed: true, branchCount };
}
