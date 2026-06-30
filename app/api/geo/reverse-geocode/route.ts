import { NextRequest, NextResponse } from "next/server";

import { assertJsonRateLimit } from "@/lib/infra/public-rate-limit";
import {
	openstreetReverseGeocodeLine1Commune,
} from "@/lib/delivery/openstreet-geocoding";

/**
 * Geocodificación inversa (OpenStreetMap/Nominatim) para rellenar calle y comuna tras GPS en el carrito.
 * Uso moderado: una petición por clic del usuario.
 */
export async function GET(req: NextRequest) {
	const limited = await assertJsonRateLimit(req, "geo_reverse_geocode", 25, 60_000);
	if (limited) return limited;

	const lat = Number(req.nextUrl.searchParams.get("lat"));
	const lng = Number(req.nextUrl.searchParams.get("lng"));
	if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
		return NextResponse.json({ error: "invalid_coordinates" }, { status: 400 });
	}
	if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
		return NextResponse.json({ error: "out_of_range" }, { status: 400 });
	}

	const parsed = await openstreetReverseGeocodeLine1Commune(lat, lng);
	if (!parsed) {
		return NextResponse.json({ error: "upstream" }, { status: 502 });
	}
	return NextResponse.json({
		line1: parsed.line1.slice(0, 200),
		commune: parsed.commune.slice(0, 120),
	});
}
