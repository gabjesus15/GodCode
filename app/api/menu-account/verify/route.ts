import type { NextRequest } from "next/server";

import { jsonOk, parseJsonBody } from "@/lib/api/response";
import { menuAccountVerifySchema } from "@/lib/api/schemas/tenant/menu-account";
import { enforceRateLimit, enforceScopedRateLimit } from "@/lib/infra/api-guard";
import { verifyMenuAccountEmail } from "@/lib/menu-account/account-service";
import { resolveCompanyForMenuAccount } from "@/lib/menu-account/company-resolve";
import {
	createCookieCarrier,
	documentRateKey,
	menuAccountDisabledResponse,
	toMenuAccountErrorResponse,
	withCarriedCookies,
} from "@/lib/menu-account/route-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Confirma el correo con el código y abre la sesión. */
export async function POST(req: NextRequest) {
	const disabled = menuAccountDisabledResponse();
	if (disabled) return disabled;

	const limited = await enforceRateLimit(req, "menu_account_verify", 10, 60_000);
	if (limited) return limited;

	const parsed = await parseJsonBody(req, menuAccountVerifySchema);
	if (!parsed.ok) return parsed.response;

	try {
		const company = await resolveCompanyForMenuAccount(parsed.data.companySlug);

		// Un código de 6 dígitos se adivina probando: el límite va por documento para
		// que rotar IPs no sirva.
		const documentLimited = await enforceScopedRateLimit(
			`menu_account_verify_doc:${documentRateKey(company, parsed.data.document)}`,
			5,
			15 * 60_000,
		);
		if (documentLimited) return documentLimited;

		const carrier = createCookieCarrier();
		const account = await verifyMenuAccountEmail(
			{ company, document: parsed.data.document, code: parsed.data.code },
			req,
			carrier,
		);

		return withCarriedCookies(carrier, jsonOk({ account }));
	} catch (error) {
		return toMenuAccountErrorResponse(error, "menu_account_verify");
	}
}
