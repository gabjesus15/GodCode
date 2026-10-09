import { NextResponse } from "next/server";

import { getCurrentExchangeRate } from "@/lib/exchange-rates/current";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";

/**
 * Tasa oficial del BCV para mostrar en bolívares el monto del alta y de los pagos de
 * /cuenta. Es la misma de la tienda (`lib/exchange-rates`, con historial en
 * `exchange_rates`): antes este servicio leía dolarapi por su cuenta y el alta podía
 * mostrar otra tasa que el menú.
 *
 * Respaldos, en orden: si la tabla todavía no existe (migración pendiente) o la base no
 * responde, dolarapi directo como antes; si nada responde, `BCV_RATE`. Sin ninguno no se
 * muestra un monto inventado. La respuesta conserva su forma `{ rate, updatedAt, source }`.
 */

const BCV_OFFICIAL_ENDPOINT = "https://ve.dolarapi.com/v1/dolares/oficial";
/** El caché del respaldo directo a dolarapi, como antes de compartir la tasa. */
const DIRECT_CACHE_SECONDS = 1800;
/** El mismo que la ruta de tasas de la tienda: el alta y el menú cambian de tasa a la vez. */
const CACHE_SECONDS = 60;

type BcvRate = { rate: number; updatedAt: string | null; stale: boolean };

async function fetchOfficialRate(): Promise<BcvRate | null> {
	try {
		const res = await fetch(BCV_OFFICIAL_ENDPOINT, {
			next: { revalidate: DIRECT_CACHE_SECONDS },
			signal: AbortSignal.timeout(5000),
		});
		if (!res.ok) return null;
		const data = (await res.json()) as { promedio?: unknown; fechaActualizacion?: unknown };
		const rate = Number(data.promedio);
		if (!Number.isFinite(rate) || rate <= 0) return null;
		return {
			rate,
			updatedAt: typeof data.fechaActualizacion === "string" ? data.fechaActualizacion : null,
			stale: false,
		};
	} catch {
		return null;
	}
}

async function currentRate(): Promise<BcvRate | null> {
	try {
		const shared = await getCurrentExchangeRate(supabaseAdmin, "bcv_usd");
		// `null`: dolarapi no respondió y no hay ninguna guardada. Volver a pedirla aquí solo
		// sumaría otra espera: pasa directo a `BCV_RATE`.
		return shared ? { rate: shared.rate, updatedAt: shared.publishedAt, stale: shared.stale } : null;
	} catch {
		return fetchOfficialRate();
	}
}

/** Respaldo manual solo si la API no responde; sin él no se muestra un monto inventado. */
function envFallbackRate(): number | null {
	const rate = Number(process.env.BCV_RATE ?? process.env.NEXT_PUBLIC_BCV_RATE);
	return Number.isFinite(rate) && rate > 0 ? rate : null;
}

export async function GET() {
	const live = await currentRate();
	if (live) {
		return NextResponse.json(
			{ rate: live.rate, updatedAt: live.updatedAt, source: "bcv" },
			{
				// Una tasa vieja (dolarapi caído) no se cachea: la próxima visita vuelve a probar.
				headers: {
					"Cache-Control": live.stale ? "no-store" : `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS}`,
				},
			},
		);
	}
	const fallback = envFallbackRate();
	return NextResponse.json(
		{ rate: fallback, updatedAt: null, source: fallback != null ? "env" : null },
		{ headers: { "Cache-Control": "no-store" } },
	);
}
