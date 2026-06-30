import { NextRequest } from "next/server";
import { z } from "zod";

import {
	buildOrderItemsFromBranch,
	type OrderCatalogLine,
} from "@/components/tenant/data/orders/build-order-items-from-branch";
import { jsonWithPublicCors, publicApiCorsHeaders } from "@/lib/infra/api-cors";
import { assertPublicRateLimit } from "@/lib/infra/public-rate-limit";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";

const orderCatalogLineSchema = z.object({
	id: z.string().min(1),
	name: z.string().optional(),
	quantity: z.number().int().positive().optional(),
	price: z.number().optional(),
	has_discount: z.boolean().optional(),
	discount_price: z.number().nullable().optional(),
	description: z.string().nullable().optional(),
	extras_total: z.number().optional(),
	extras: z
		.array(
			z.object({
				id: z.string(),
				name: z.string(),
				price: z.number(),
				qty: z.number(),
			}),
		)
		.optional(),
	custom_item: z.boolean().optional(),
});

const bodySchema = z.object({
	branchId: z.string().uuid(),
	items: z.array(orderCatalogLineSchema).min(1).max(80),
});

export async function OPTIONS(req: NextRequest) {
	return new Response(null, { status: 204, headers: publicApiCorsHeaders(req) });
}

/**
 * Valida ítems de catálogo contra sucursal con service role (evita RLS del cliente anónimo).
 */
export async function POST(req: NextRequest) {
	try {
		const limited = await assertPublicRateLimit(req, "tenant_order_catalog_items", 40, 60_000);
		if (limited) return limited;

		const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
		if (!parsed.success) {
			return jsonWithPublicCors(req, { ok: false as const, error: "bad_request" }, { status: 400 });
		}

		const items = await buildOrderItemsFromBranch(
			supabaseAdmin,
			parsed.data.branchId,
			parsed.data.items as OrderCatalogLine[],
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
