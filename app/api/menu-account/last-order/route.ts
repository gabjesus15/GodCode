import type { NextRequest } from "next/server";

import { jsonError, jsonOk } from "@/lib/api/response";
import { menuAccountLastOrderQuerySchema } from "@/lib/api/schemas/tenant/menu-account";
import { enforceRateLimit } from "@/lib/infra/api-guard";
import { listMenuAccountOrders } from "@/lib/menu-account/activity";
import { resolveCompanyByIdForMenuAccount } from "@/lib/menu-account/company-resolve";
import {
	menuAccountDisabledResponse,
	toMenuAccountErrorResponse,
} from "@/lib/menu-account/route-helpers";
import { getMenuAccountSession } from "@/lib/menu-account/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Último pedido de la persona logueada, para el atajo "repetir" del carrito vacío.
 *
 * Existe aparte de `orders` porque el carrito conoce el `company_id` de la sucursal y
 * no el slug, y porque solo necesita una fila: así el carrito vacío no arrastra las
 * treinta del historial.
 *
 * Sin sesión responde 200 con `order: null`, igual que `checkout-profile`: el carrito
 * anónimo es el caso normal y no debe dejar errores en la consola de cada visitante.
 */
export async function GET(req: NextRequest) {
	const disabled = menuAccountDisabledResponse();
	if (disabled) return disabled;

	const limited = await enforceRateLimit(req, "menu_account_last_order", 30, 60_000);
	if (limited) return limited;

	const query = menuAccountLastOrderQuerySchema.safeParse({
		companyId: req.nextUrl.searchParams.get("companyId"),
	});
	if (!query.success) return jsonError(400, "Datos inválidos.", { code: "validation_error" });

	try {
		const company = await resolveCompanyByIdForMenuAccount(query.data.companyId);
		const session = await getMenuAccountSession(company.id);
		if (!session) return jsonOk({ order: null });

		const orders = await listMenuAccountOrders(session.account, 1);
		return jsonOk({ order: orders[0] ?? null });
	} catch (error) {
		return toMenuAccountErrorResponse(error, "menu_account_last_order");
	}
}
