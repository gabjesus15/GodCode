import type { NextRequest } from "next/server";

import { jsonError, jsonOk } from "@/lib/api/response";
import { menuAccountCompanyQuerySchema } from "@/lib/api/schemas/tenant/menu-account";
import { enforceRateLimit } from "@/lib/infra/api-guard";
import { listMenuAccountOrders } from "@/lib/menu-account/activity";
import { resolveCompanyForMenuAccount } from "@/lib/menu-account/company-resolve";
import {
	menuAccountDisabledResponse,
	toMenuAccountErrorResponse,
} from "@/lib/menu-account/route-helpers";
import { requireMenuAccount } from "@/lib/menu-account/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
	const disabled = menuAccountDisabledResponse();
	if (disabled) return disabled;

	const limited = await enforceRateLimit(req, "menu_account_orders", 30, 60_000);
	if (limited) return limited;

	const query = menuAccountCompanyQuerySchema.safeParse({
		companySlug: req.nextUrl.searchParams.get("companySlug"),
	});
	if (!query.success) return jsonError(400, "Datos inválidos.", { code: "validation_error" });

	try {
		const company = await resolveCompanyForMenuAccount(query.data.companySlug);
		const { account } = await requireMenuAccount(company.id);
		const orders = await listMenuAccountOrders(account);
		return jsonOk({ orders });
	} catch (error) {
		return toMenuAccountErrorResponse(error, "menu_account_orders");
	}
}
