import type { NextRequest } from "next/server";

import { jsonOk, parseJsonBody } from "@/lib/api/response";
import { menuAccountRegisterSchema } from "@/lib/api/schemas/tenant/menu-account";
import { enforceRateLimit, enforceScopedRateLimit } from "@/lib/infra/api-guard";
import { registerMenuAccount } from "@/lib/menu-account/account-service";
import { resolveCompanyForMenuAccount } from "@/lib/menu-account/company-resolve";
import {
	createCookieCarrier,
	toMenuAccountErrorResponse,
	withCarriedCookies,
} from "@/lib/menu-account/route-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
	// Escritura de identidad: más restrictivo que las rutas públicas de lectura.
	const limited = await enforceRateLimit(req, "menu_account_register", 5, 60_000);
	if (limited) return limited;

	const parsed = await parseJsonBody(req, menuAccountRegisterSchema);
	if (!parsed.ok) return parsed.response;

	try {
		const company = await resolveCompanyForMenuAccount(parsed.data.companySlug);

		const companyLimited = await enforceScopedRateLimit(
			`menu_account_register_company:${company.id}`,
			30,
			60_000,
		);
		if (companyLimited) return companyLimited;

		const carrier = createCookieCarrier();
		const result = await registerMenuAccount(
			{
				company,
				document: parsed.data.document,
				email: parsed.data.email,
				password: parsed.data.password,
				fullName: parsed.data.fullName,
				phone: parsed.data.phone,
				preferredBranchId: parsed.data.preferredBranchId ?? null,
				origin: req.nextUrl.origin,
			},
			req,
			carrier,
		);

		if (result.status === "link_email_sent") {
			return jsonOk({ status: "link_email_sent" });
		}

		return withCarriedCookies(
			carrier,
			jsonOk({ status: "created", account: result.account }, { status: 201 }),
		);
	} catch (error) {
		return toMenuAccountErrorResponse(error, "menu_account_register");
	}
}
