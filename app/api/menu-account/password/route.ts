import type { NextRequest } from "next/server";

import { jsonOk, parseJsonBody } from "@/lib/api/response";
import { menuAccountPasswordSchema } from "@/lib/api/schemas/tenant/menu-account";
import { enforceScopedRateLimit } from "@/lib/infra/api-guard";
import { changeMenuAccountPassword } from "@/lib/menu-account/account-service";
import { resolveCompanyForMenuAccount } from "@/lib/menu-account/company-resolve";
import { requireMenuAccount } from "@/lib/menu-account/session";
import { toMenuAccountErrorResponse } from "@/lib/menu-account/route-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
	const parsed = await parseJsonBody(req, menuAccountPasswordSchema);
	if (!parsed.ok) return parsed.response;

	try {
		const company = await resolveCompanyForMenuAccount(parsed.data.companySlug);
		const { account, authUserId } = await requireMenuAccount(company.id);

		// Límite por cuenta (no por IP): el objetivo es frenar el sondeo de la
		// contraseña actual desde una sesión ya iniciada.
		const limited = await enforceScopedRateLimit(
			`menu_account_password:${account.id}`,
			5,
			15 * 60_000,
		);
		if (limited) return limited;

		await changeMenuAccountPassword({
			account,
			authUserId,
			currentPassword: parsed.data.currentPassword ?? null,
			newPassword: parsed.data.newPassword,
		});

		return jsonOk({ ok: true });
	} catch (error) {
		return toMenuAccountErrorResponse(error, "menu_account_password");
	}
}
