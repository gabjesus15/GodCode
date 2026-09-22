import type { NextRequest } from "next/server";

import { jsonOk, parseJsonBody } from "@/lib/api/response";
import { menuAccountRecoverConfirmSchema } from "@/lib/api/schemas/tenant/menu-account";
import { enforceRateLimit, enforceScopedRateLimit } from "@/lib/infra/api-guard";
import { resetMenuAccountPassword } from "@/lib/menu-account/account-service";
import { resolveCompanyForMenuAccount } from "@/lib/menu-account/company-resolve";
import {
	documentRateKey,
	menuAccountDisabledResponse,
	toMenuAccountErrorResponse,
} from "@/lib/menu-account/route-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Fija la contraseña nueva con el código de recuperación. No abre sesión. */
export async function POST(req: NextRequest) {
	const disabled = menuAccountDisabledResponse();
	if (disabled) return disabled;

	const limited = await enforceRateLimit(req, "menu_account_recover_confirm", 10, 60_000);
	if (limited) return limited;

	const parsed = await parseJsonBody(req, menuAccountRecoverConfirmSchema);
	if (!parsed.ok) return parsed.response;

	try {
		const company = await resolveCompanyForMenuAccount(parsed.data.companySlug);

		// Mismo criterio que la verificación: un código se adivina probando.
		const documentLimited = await enforceScopedRateLimit(
			`menu_account_recover_confirm_doc:${documentRateKey(company, parsed.data.document)}`,
			5,
			15 * 60_000,
		);
		if (documentLimited) return documentLimited;

		await resetMenuAccountPassword({
			company,
			document: parsed.data.document,
			code: parsed.data.code,
			newPassword: parsed.data.newPassword,
		});
		return jsonOk({ ok: true });
	} catch (error) {
		return toMenuAccountErrorResponse(error, "menu_account_recover_confirm");
	}
}
