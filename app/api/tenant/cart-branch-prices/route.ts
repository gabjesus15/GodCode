import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonWithPublicCors, publicApiCorsHeaders } from "@/lib/infra/api-cors";
import { assertPublicRateLimit } from "@/lib/infra/public-rate-limit";
import { fetchCartBranchPrices } from "@/lib/orders/fetch-cart-branch-prices";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import {
	resolveBranchStorefrontAccess,
	STORE_NOT_OPEN_CODE,
	STORE_NOT_OPEN_MESSAGE,
	storefrontTakesOrders,
} from "@/lib/tenant/store-draft-viewer";

/** @service-role public
 *
 * Precios del menú público: mismo criterio que el checkout anónimo. Una tienda en vista
 * previa o cerrada no los sirve (403 `store_not_open`), salvo a su dueño en la vista previa.
 */

const bodySchema = z.object({
	branchId: z.string().uuid(),
	productIds: z.array(z.string().min(1).max(64)).min(1).max(80),
});

export async function OPTIONS(req: NextRequest) {
	return new Response(null, { status: 204, headers: publicApiCorsHeaders(req) });
}

/** Precios de carrito por sucursal (service role; mismo criterio que checkout). */
export async function POST(req: NextRequest) {
	try {
		const limited = await assertPublicRateLimit(req, "tenant_cart_branch_prices", 60, 60_000);
		if (limited) return limited;

		const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
		if (!parsed.success) {
			return jsonWithPublicCors(req, { ok: false as const, error: "bad_request" }, { status: 400 });
		}

		// Una tienda sin publicar o cerrada no vende: sus precios no salen de aquí (el dueño
		// en vista previa sí los ve, con su sesión).
		const { companyId, access } = await resolveBranchStorefrontAccess(parsed.data.branchId);
		if (!companyId) {
			return jsonWithPublicCors(req, { ok: false as const, error: "branch_not_found" }, { status: 404 });
		}
		if (!storefrontTakesOrders(access)) {
			return jsonWithPublicCors(
				req,
				{ ok: false as const, error: STORE_NOT_OPEN_MESSAGE, code: STORE_NOT_OPEN_CODE },
				{ status: 403 },
			);
		}

		const rows = await fetchCartBranchPrices(
			supabaseAdmin,
			parsed.data.branchId,
			parsed.data.productIds,
		);

		return jsonWithPublicCors(req, { ok: true as const, rows });
	} catch {
		return jsonWithPublicCors(
			req,
			{ ok: false as const, error: "No se pudieron cargar los precios de la sucursal." },
			{ status: 500 },
		);
	}
}
