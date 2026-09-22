import type { NextRequest } from "next/server";

import { jsonOk, parseJsonBody } from "@/lib/api/response";
import { menuAccountCompanyQuerySchema } from "@/lib/api/schemas/tenant/menu-account";
import { enforceScopedRateLimit } from "@/lib/infra/api-guard";
import { sendPasswordChangeCode } from "@/lib/menu-account/account-service";
import { resolveCompanyForMenuAccount } from "@/lib/menu-account/company-resolve";
import { requireMenuAccount } from "@/lib/menu-account/session";
import {
	menuAccountDisabledResponse,
	toMenuAccountErrorResponse,
} from "@/lib/menu-account/route-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Manda al correo de la sesión el código para cambiar la contraseña. */
export async function POST(req: NextRequest) {
	const disabled = menuAccountDisabledResponse();
	if (disabled) return disabled;

	const parsed = await parseJsonBody(req, menuAccountCompanyQuerySchema);
	if (!parsed.ok) return parsed.response;

	try {
		const company = await resolveCompanyForMenuAccount(parsed.data.companySlug);
		const { account } = await requireMenuAccount(company.id);

		const limited = await enforceScopedRateLimit(
			`menu_account_password_code:${account.id}`,
			3,
			15 * 60_000,
		);
		if (limited) return limited;

		await sendPasswordChangeCode(account);
		return jsonOk({ status: "sent" });
	} catch (error) {
		return toMenuAccountErrorResponse(error, "menu_account_password_code");
	}
}
