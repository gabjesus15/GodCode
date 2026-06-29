import { NextRequest, NextResponse } from "next/server";

import { checkBetaBranchLimit } from "@/lib/super-admin/beta-branch-limit";
import { SAAS_READ_ROLES, validateAdminRolesOnServer } from "@/utils/admin/server-auth";

export async function GET(req: NextRequest) {
	const access = await validateAdminRolesOnServer([...SAAS_READ_ROLES]);
	if (!access.ok) {
		return NextResponse.json({ error: access.error ?? "No autorizado" }, { status: access.status });
	}

	const company_id = req.nextUrl.searchParams.get("company_id");
	if (!company_id) {
		return NextResponse.json({ allowed: false, error: "Missing company_id" }, { status: 400 });
	}

	const result = await checkBetaBranchLimit(company_id);
	if (result.reason === "Company not found") {
		return NextResponse.json({ allowed: false, error: result.reason }, { status: 404 });
	}

	return NextResponse.json({
		allowed: result.allowed,
		reason: result.reason,
		branchCount: result.branchCount,
	});
}
