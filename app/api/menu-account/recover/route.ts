import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";

import { jsonOk, parseJsonBody } from "@/lib/api/response";
import { menuAccountRecoverSchema } from "@/lib/api/schemas/tenant/menu-account";
import { enforceRateLimit, enforceScopedRateLimit } from "@/lib/infra/api-guard";
import { requestPasswordReset } from "@/lib/menu-account/account-service";
import { resolveCompanyForMenuAccount } from "@/lib/menu-account/company-resolve";
import { toMenuAccountErrorResponse } from "@/lib/menu-account/route-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Pide el enlace de recuperación.
 *
 * Responde SIEMPRE lo mismo, exista o no la cuenta: si distinguiera, sería un
 * oráculo gratuito de "¿este documento compró en este local?".
 */
export async function POST(req: NextRequest) {
	const limited = await enforceRateLimit(req, "menu_account_recover", 3, 15 * 60_000);
	if (limited) return limited;

	const parsed = await parseJsonBody(req, menuAccountRecoverSchema);
	if (!parsed.ok) return parsed.response;

	try {
		const company = await resolveCompanyForMenuAccount(parsed.data.companySlug);

		const documentKey = createHash("sha256")
			.update(`${company.id}:${parsed.data.document.trim().toUpperCase()}`)
			.digest("hex")
			.slice(0, 16);
		const documentLimited = await enforceScopedRateLimit(
			`menu_account_recover_doc:${documentKey}`,
			3,
			60 * 60_000,
		);
		if (documentLimited) return documentLimited;

		await requestPasswordReset({
			company,
			document: parsed.data.document,
			origin: req.nextUrl.origin,
		});

		return jsonOk({ status: "email_sent_if_exists" });
	} catch (error) {
		return toMenuAccountErrorResponse(error, "menu_account_recover");
	}
}
