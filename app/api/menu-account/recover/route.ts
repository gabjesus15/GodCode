import type { NextRequest } from "next/server";

import { jsonOk, parseJsonBody } from "@/lib/api/response";
import { menuAccountDocumentSchema } from "@/lib/api/schemas/tenant/menu-account";
import { enforceRateLimit, enforceScopedRateLimit } from "@/lib/infra/api-guard";
import { requestMenuAccountRecovery } from "@/lib/menu-account/account-service";
import { resolveCompanyForMenuAccount } from "@/lib/menu-account/company-resolve";
import {
	documentRateKey,
	menuAccountDisabledResponse,
	toMenuAccountErrorResponse,
} from "@/lib/menu-account/route-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Pide el código para recuperar la contraseña. Responde SIEMPRE lo mismo, exista o no
 * la cuenta: si distinguiera, sería un oráculo de "¿este documento compró aquí?".
 */
export async function POST(req: NextRequest) {
	const disabled = menuAccountDisabledResponse();
	if (disabled) return disabled;

	const limited = await enforceRateLimit(req, "menu_account_recover", 5, 60_000);
	if (limited) return limited;

	const parsed = await parseJsonBody(req, menuAccountDocumentSchema);
	if (!parsed.ok) return parsed.response;

	try {
		const company = await resolveCompanyForMenuAccount(parsed.data.companySlug);

		const documentLimited = await enforceScopedRateLimit(
			`menu_account_code_send_doc:${documentRateKey(company, parsed.data.document)}`,
			3,
			15 * 60_000,
		);
		if (documentLimited) return documentLimited;

		await requestMenuAccountRecovery({ company, document: parsed.data.document });
		return jsonOk({ status: "sent_if_exists" });
	} catch (error) {
		return toMenuAccountErrorResponse(error, "menu_account_recover");
	}
}
