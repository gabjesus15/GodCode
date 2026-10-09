import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAllCurrentExchangeRates, getCurrentExchangeRate } from "@/lib/exchange-rates/current";
import { isExchangeRateSource } from "@/lib/exchange-rates/sources";
import { enforceRateLimit } from "@/lib/infra/api-guard";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";

/** @service-role public
 *
 * Tasas de cambio de Venezuela (BCV dólar y BCV euro), al día.
 *
 * - `?branchId=<uuid>`: la tasa de la fuente que eligió esa sucursal (la usan el menú y el
 *   carrito). Responde `rate: null` si la sucursal no tiene fuente (fuera de Venezuela).
 * - Sin parámetros: las dos fuentes (la usa el Panel para que el local elija).
 *
 * Son datos públicos y no se mandan cookies, así que se permite cualquier origen: el
 * Panel vive en otro dominio. El service role solo se usa para registrar una tasa nueva
 * cuando la guardada venció.
 *
 * La caché de 60 s que pone `json()` la respetan `proxy.ts` (que excluye esta ruta del
 * `no-store` de `/api/*`) y `next.config.ts` (regla propia después de la general).
 */

// `*` a propósito y no `jsonWithPublicCors`: esa lista (`PUBLIC_API_CORS_ORIGINS`) es para
// APIs que atienden al menú embebido; esto es dato público sin cookies y lo pide el Panel.
const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, OPTIONS",
	"Access-Control-Max-Age": "86400",
} as const;

function json(body: unknown, status = 200, cacheSeconds = 0) {
	const res = NextResponse.json(body, { status });
	for (const [key, value] of Object.entries(CORS_HEADERS)) res.headers.set(key, value);
	res.headers.set(
		"Cache-Control",
		cacheSeconds > 0 ? `public, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds}` : "no-store",
	);
	return res;
}

const branchIdSchema = z.string().uuid();

export async function OPTIONS() {
	return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: NextRequest) {
	const limited = await enforceRateLimit(req, "tenant_exchange_rates", 120, 60_000);
	if (limited) {
		for (const [key, value] of Object.entries(CORS_HEADERS)) limited.headers.set(key, value);
		return limited;
	}

	try {
		const rawBranchId = req.nextUrl.searchParams.get("branchId");
		if (rawBranchId == null) {
			const rates = await getAllCurrentExchangeRates(supabaseAdmin);
			return json({ ok: true as const, rates }, 200, 60);
		}

		const branchId = branchIdSchema.safeParse(rawBranchId);
		if (!branchId.success) return json({ ok: false as const, error: "bad_request" }, 400);

		const { data: branch, error } = await supabaseAdmin
			.from("branches")
			.select("exchange_rate_source")
			.eq("id", branchId.data)
			.maybeSingle();
		if (error) throw error;
		if (!branch) return json({ ok: false as const, error: "not_found" }, 404);

		const source = branch.exchange_rate_source;
		if (!isExchangeRateSource(source)) {
			return json({ ok: true as const, source: null, rate: null }, 200, 300);
		}

		const current = await getCurrentExchangeRate(supabaseAdmin, source);
		return json({ ok: true as const, source, rate: current }, 200, 60);
	} catch {
		return json({ ok: false as const, error: "exchange_rate_unavailable" }, 500);
	}
}
