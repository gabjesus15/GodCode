import type { NextRequest } from "next/server";

import { jsonError, jsonOk } from "@/lib/api/response";
import { menuAccountCompanyQuerySchema } from "@/lib/api/schemas/tenant/menu-account";
import { enforceRateLimit } from "@/lib/infra/api-guard";
import { resolveCompanyForMenuAccount } from "@/lib/menu-account/company-resolve";
import { getMenuAccountEarnRules, getMenuAccountPoints } from "@/lib/menu-account/points";
import {
	menuAccountDisabledResponse,
	toMenuAccountErrorResponse,
} from "@/lib/menu-account/route-helpers";
import { requireMenuAccount } from "@/lib/menu-account/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Puntos de la persona en este negocio: el mismo número que la columna PUNTOS del panel. */
export async function GET(req: NextRequest) {
	const disabled = menuAccountDisabledResponse();
	if (disabled) return disabled;

	const limited = await enforceRateLimit(req, "menu_account_points", 30, 60_000);
	if (limited) return limited;

	const query = menuAccountCompanyQuerySchema.safeParse({
		companySlug: req.nextUrl.searchParams.get("companySlug"),
	});
	if (!query.success) return jsonError(400, "Datos inválidos.", { code: "validation_error" });

	try {
		const company = await resolveCompanyForMenuAccount(query.data.companySlug);
		const { account } = await requireMenuAccount(company.id);
		const [points, earnRules] = await Promise.all([getMenuAccountPoints(account), getMenuAccountEarnRules(account)]);
		return jsonOk({ points, earnRules });
	} catch (error) {
		return toMenuAccountErrorResponse(error, "menu_account_points");
	}
}
