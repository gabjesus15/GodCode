import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";

import { jsonOk, parseJsonBody } from "@/lib/api/response";
import { menuAccountLoginSchema } from "@/lib/api/schemas/tenant/menu-account";
import { enforceRateLimit, enforceScopedRateLimit } from "@/lib/infra/api-guard";
import { loginMenuAccount } from "@/lib/menu-account/account-service";
import { resolveCompanyForMenuAccount } from "@/lib/menu-account/company-resolve";
import {
	createCookieCarrier,
	toMenuAccountErrorResponse,
	withCarriedCookies,
} from "@/lib/menu-account/route-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
	const limited = await enforceRateLimit(req, "menu_account_login", 10, 60_000);
	if (limited) return limited;

	const parsed = await parseJsonBody(req, menuAccountLoginSchema);
	if (!parsed.ok) return parsed.response;

	try {
		const company = await resolveCompanyForMenuAccount(parsed.data.companySlug);

		// Segundo límite por cuenta: sin él, rotar IPs permitiría fuerza bruta contra
		// un documento concreto. Se hashea para no dejar el documento en el store.
		const documentKey = createHash("sha256")
			.update(`${company.id}:${parsed.data.document.trim().toUpperCase()}`)
			.digest("hex")
			.slice(0, 16);
		const accountLimited = await enforceScopedRateLimit(
			`menu_account_login_doc:${documentKey}`,
			5,
			15 * 60_000,
		);
		if (accountLimited) return accountLimited;

		const carrier = createCookieCarrier();
		const account = await loginMenuAccount(
			{ company, document: parsed.data.document, password: parsed.data.password },
			req,
			carrier,
		);

		return withCarriedCookies(carrier, jsonOk({ account }));
	} catch (error) {
		return toMenuAccountErrorResponse(error, "menu_account_login");
	}
}
