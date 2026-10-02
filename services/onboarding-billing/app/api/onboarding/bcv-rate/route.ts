import { NextResponse } from "next/server";

// Tasa oficial del BCV (dolarapi la toma de bcv.org.ve). Se cachea media hora en el servidor.
const BCV_OFFICIAL_ENDPOINT = "https://ve.dolarapi.com/v1/dolares/oficial";
const CACHE_SECONDS = 1800;

type BcvRate = { rate: number; updatedAt: string | null };

async function fetchOfficialRate(): Promise<BcvRate | null> {
	try {
		const res = await fetch(BCV_OFFICIAL_ENDPOINT, {
			next: { revalidate: CACHE_SECONDS },
			signal: AbortSignal.timeout(5000),
		});
		if (!res.ok) return null;
		const data = (await res.json()) as { promedio?: unknown; fechaActualizacion?: unknown };
		const rate = Number(data.promedio);
		if (!Number.isFinite(rate) || rate <= 0) return null;
		return {
			rate,
			updatedAt: typeof data.fechaActualizacion === "string" ? data.fechaActualizacion : null,
		};
	} catch {
		return null;
	}
}

/** Respaldo manual solo si la API no responde; sin él no se muestra un monto inventado. */
function envFallbackRate(): number | null {
	const rate = Number(process.env.BCV_RATE ?? process.env.NEXT_PUBLIC_BCV_RATE);
	return Number.isFinite(rate) && rate > 0 ? rate : null;
}

export async function GET() {
	const live = await fetchOfficialRate();
	if (live) {
		return NextResponse.json(
			{ rate: live.rate, updatedAt: live.updatedAt, source: "bcv" },
			{ headers: { "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=3600` } },
		);
	}
	const fallback = envFallbackRate();
	return NextResponse.json(
		{ rate: fallback, updatedAt: null, source: fallback != null ? "env" : null },
		{ headers: { "Cache-Control": "no-store" } },
	);
}
