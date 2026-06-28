import { NextRequest } from "next/server";
import { z } from "zod";

import { buildOrderItemsFromBranch } from "@/components/tenant/data/orders/build-order-items-from-branch";
import { jsonWithPublicCors, publicApiCorsHeaders } from "@/lib/infra/api-cors";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";

const bodySchema = z.object({
	branchId: z.string().uuid(),
	items: z.array(z.record(z.string(), z.unknown())).min(1).max(80),
});

export async function OPTIONS(req: NextRequest) {
	return new Response(null, { status: 204, headers: publicApiCorsHeaders(req) });
}

/**
 * Valida ítems de catálogo contra sucursal con service role (evita RLS del cliente anónimo).
 */
export async function POST(req: NextRequest) {
	try {
		const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
		if (!parsed.success) {
			return jsonWithPublicCors(req, { ok: false as const, error: "bad_request" }, { status: 400 });
		}

		const items = await buildOrderItemsFromBranch(
			supabaseAdmin,
			parsed.data.branchId,
			parsed.data.items as Parameters<typeof buildOrderItemsFromBranch>[2],
		);

		return jsonWithPublicCors(req, { ok: true as const, items });
	} catch {
		return jsonWithPublicCors(
			req,
			{ ok: false as const, error: "No se pudo validar los productos de la sucursal." },
			{ status: 500 },
		);
	}
}
