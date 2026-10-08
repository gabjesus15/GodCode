import type { NextRequest } from "next/server";

import { jsonOk, parseJsonBody } from "@/lib/api/response";
import { menuAccountDeleteSchema } from "@/lib/api/schemas/tenant/menu-account";
import { enforceScopedRateLimit } from "@/lib/infra/api-guard";
import { deleteMenuAccount, deleteMenuIdentity } from "@/lib/menu-account/account-deletion";
import { resolveCompanyForMenuAccount } from "@/lib/menu-account/company-resolve";
import { createMenuClientResponseClient } from "@/lib/menu-account/cookies";
import { requireMenuAccount } from "@/lib/menu-account/session";
import {
	createCookieCarrier,
	menuAccountDisabledResponse,
	toMenuAccountErrorResponse,
	withCarriedCookies,
} from "@/lib/menu-account/route-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Elimina la cuenta de la sesión en este negocio, con el código enviado al correo. */
export async function POST(req: NextRequest) {
	const disabled = menuAccountDisabledResponse();
	if (disabled) return disabled;

	const parsed = await parseJsonBody(req, menuAccountDeleteSchema);
	if (!parsed.ok) return parsed.response;

	try {
		const company = await resolveCompanyForMenuAccount(parsed.data.companySlug);
		const { account, authUserId } = await requireMenuAccount(company.id);

		// Límite por cuenta, como el cambio de contraseña: frena adivinar el código.
		const limited = await enforceScopedRateLimit(
			`menu_account_delete:${account.id}`,
			5,
			15 * 60_000,
		);
		if (limited) return limited;

		const { lastAccount } = await deleteMenuAccount({ account, authUserId, code: parsed.data.code });

		// Se cierra la sesión antes de borrar el usuario de auth, mientras todavía existe.
		const carrier = createCookieCarrier();
		try {
			await createMenuClientResponseClient(req, carrier).auth.signOut();
		} catch {
			// La cuenta ya no existe: un fallo al cerrar sesión no debe reportarse como error.
		}
		if (lastAccount) await deleteMenuIdentity(authUserId);

		return withCarriedCookies(carrier, jsonOk({ ok: true }));
	} catch (error) {
		return toMenuAccountErrorResponse(error, "menu_account_delete");
	}
}
