import type { NextRequest } from "next/server";

import { jsonError, jsonOk } from "@/lib/api/response";
import { menuAccountCheckoutProfileQuerySchema } from "@/lib/api/schemas/tenant/menu-account";
import type { MenuAccountCheckoutProfile } from "@/components/tenant/account/menu-account-types";
import { enforceRateLimit } from "@/lib/infra/api-guard";
import { listMenuAccountAddresses } from "@/lib/menu-account/activity";
import { ensureMenuAccountClient } from "@/lib/menu-account/client-link";
import { resolveCompanyByIdForMenuAccount } from "@/lib/menu-account/company-resolve";
import {
	menuAccountDisabledResponse,
	toMenuAccountErrorResponse,
} from "@/lib/menu-account/route-helpers";
import { getMenuAccountSession } from "@/lib/menu-account/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Datos con los que el carrito rellena el checkout de una persona logueada.
 *
 * Garantiza la ficha en `clients` para leer sus direcciones guardadas. El id de la
 * ficha no se devuelve: el pedido con sesión lo crea el servidor.
 *
 * Sin sesión responde 200 con `profile: null`, no 401: comprar sin cuenta es el caso
 * normal del menú y no debe dejar errores en la consola de cada visitante.
 */
export async function GET(req: NextRequest) {
	const disabled = menuAccountDisabledResponse();
	if (disabled) return disabled;

	const limited = await enforceRateLimit(req, "menu_account_checkout_profile", 30, 60_000);
	if (limited) return limited;

	const query = menuAccountCheckoutProfileQuerySchema.safeParse({
		companyId: req.nextUrl.searchParams.get("companyId"),
	});
	if (!query.success) return jsonError(400, "Datos inválidos.", { code: "validation_error" });

	try {
		const company = await resolveCompanyByIdForMenuAccount(query.data.companyId);
		const session = await getMenuAccountSession(company.id);
		if (!session) return jsonOk({ profile: null });
		const { account } = session;

		const clientId = await ensureMenuAccountClient(account);
		const addresses = await listMenuAccountAddresses({ ...account, client_id: clientId });

		// El id de la ficha no sale al navegador: el pedido lo crea el servidor con la
		// cuenta de la sesión (POST /api/menu-account/order).
		const profile: MenuAccountCheckoutProfile = {
			fullName: account.full_name,
			phone: account.phone,
			document: account.document_raw ?? account.document_normalized,
			addresses,
		};
		return jsonOk({ profile });
	} catch (error) {
		return toMenuAccountErrorResponse(error, "menu_account_checkout_profile");
	}
}
