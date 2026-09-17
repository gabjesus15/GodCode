import type { NextRequest } from "next/server";

import { jsonOk, parseJsonBody } from "@/lib/api/response";
import { menuAccountPasswordSchema } from "@/lib/api/schemas/tenant/menu-account";
import { enforceScopedRateLimit } from "@/lib/infra/api-guard";
import { changeMenuAccountPassword } from "@/lib/menu-account/account-service";
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

export async function POST(req: NextRequest) {
	const disabled = menuAccountDisabledResponse();
	if (disabled) return disabled;

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
			currentPassword: parsed.data.currentPassword,
			newPassword: parsed.data.newPassword,
		});

		// La UI devuelve a la persona al login tras el cambio; sin cerrar la sesión
		// aquí la cookie seguiría viva y al recargar reaparecería el panel.
		const carrier = createCookieCarrier();
		try {
			await createMenuClientResponseClient(req, carrier).auth.signOut();
		} catch {
			// La contraseña ya cambió: un fallo al cerrar sesión no debe reportarse como error.
		}

		return withCarriedCookies(carrier, jsonOk({ ok: true }));
	} catch (error) {
		return toMenuAccountErrorResponse(error, "menu_account_password");
	}
}
