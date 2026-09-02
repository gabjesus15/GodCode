import type { NextRequest } from "next/server";

import { jsonOk, parseJsonBody } from "@/lib/api/response";
import { menuAccountProfileSchema } from "@/lib/api/schemas/tenant/menu-account";
import { enforceRateLimit } from "@/lib/infra/api-guard";
import { updateMenuAccountProfile } from "@/lib/menu-account/account-service";
import { resolveCompanyForMenuAccount } from "@/lib/menu-account/company-resolve";
import { requireMenuAccount } from "@/lib/menu-account/session";
import { toMenuAccountErrorResponse } from "@/lib/menu-account/route-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * El documento y el correo no son editables: cambiarlos cambia la identidad de la
 * cuenta. Cambiar de sucursal dentro del mismo negocio pasa por aquí, y no dispara
 * ningún correo — la vinculación solo aplica entre negocios distintos.
 */
export async function PATCH(req: NextRequest) {
	const limited = await enforceRateLimit(req, "menu_account_profile", 20, 60_000);
	if (limited) return limited;

	const parsed = await parseJsonBody(req, menuAccountProfileSchema);
	if (!parsed.ok) return parsed.response;

	try {
		const company = await resolveCompanyForMenuAccount(parsed.data.companySlug);
		const { account } = await requireMenuAccount(company.id);

		const updated = await updateMenuAccountProfile({
			accountId: account.id,
			companyId: company.id,
			fullName: parsed.data.fullName,
			phone: parsed.data.phone,
			preferredBranchId: parsed.data.preferredBranchId,
		});

		return jsonOk({ account: updated });
	} catch (error) {
		return toMenuAccountErrorResponse(error, "menu_account_profile");
	}
}
