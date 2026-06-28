import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonWithPublicCors, publicApiCorsHeaders } from "@/lib/infra/api-cors";
import { fetchCartBranchPrices } from "@/lib/orders/fetch-cart-branch-prices";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";

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
		const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
		if (!parsed.success) {
			return jsonWithPublicCors(req, { ok: false as const, error: "bad_request" }, { status: 400 });
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
