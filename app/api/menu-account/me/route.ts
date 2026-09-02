import type { NextRequest } from "next/server";

import { jsonOk } from "@/lib/api/response";
import { enforceRateLimit } from "@/lib/infra/api-guard";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { resolveCompanyForMenuAccount } from "@/lib/menu-account/company-resolve";
import { requireMenuAccount, toMenuAccountDto } from "@/lib/menu-account/session";
import { toMenuAccountErrorResponse } from "@/lib/menu-account/route-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
	const limited = await enforceRateLimit(req, "menu_account_me", 60, 60_000);
	if (limited) return limited;

	try {
		const company = await resolveCompanyForMenuAccount(
			req.nextUrl.searchParams.get("companySlug"),
		);
		const { account } = await requireMenuAccount(company.id);

		let preferredBranch: { id: string; name: string } | null = null;
		if (account.preferred_branch_id) {
			const { data } = await supabaseAdmin
				.from("branches")
				.select("id, name")
				.eq("id", account.preferred_branch_id)
				.maybeSingle();
			if (data) preferredBranch = { id: String(data.id), name: data.name };
		}

		return jsonOk({ account: toMenuAccountDto(account), preferredBranch });
	} catch (error) {
		return toMenuAccountErrorResponse(error, "menu_account_me");
	}
}
