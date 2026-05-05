import { NextRequest, NextResponse } from "next/server";

import type { PhotonAddressHit } from "@/lib/delivery/delivery-area-resolve";
import { photonSearchAddressHits } from "@/lib/delivery/delivery-area-resolve";
import { deliveryPublicRateOk } from "@/lib/delivery/delivery-public-limiter";
import { haversineKm, isValidLatLng } from "@/lib/geo/geo";
import { normalizeDeliverySettings } from "@/lib/delivery/delivery-settings";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";

function clientKey(req: NextRequest): string {
	const xf = req.headers.get("x-forwarded-for");
	if (xf) return xf.split(",")[0]?.trim() || "unknown";
	return "unknown";
}

/**
 * Si el local no define tope de km, igual acotamos sugerencias para no listar coincidencias muy lejanas.
 */
const DEFAULT_SUGGESTION_RADIUS_KM = 420;

function filterHitsInRadius(
	hits: PhotonAddressHit[],
	origin: { lat: number; lng: number },
	maxKm: number,
): PhotonAddressHit[] {
	const cap = Math.max(0, maxKm) + 1e-3;
	return hits.filter((h) => {
		const d = haversineKm(origin, { lat: h.lat, lng: h.lng });
		return d <= cap;
	});
}

/**
 * Autocompletado de direcciones (OpenStreetMap/Nominatim).
 * Mismo backend que resolución de zonas por nombre.
 * Público, con rate limit.
 * Con `branchId`, solo se devuelven puntos dentro del radio de delivery de la sucursal
 * (o un radio por defecto si no hay tope configurado).
 */
export async function GET(req: NextRequest) {
	try {
		const raw = req.nextUrl.searchParams.get("q")?.trim() ?? "";
		const communeHintRaw =
			req.nextUrl.searchParams.get("communeHint")?.trim() ?? "";
		const regionRaw = req.nextUrl.searchParams.get("region")?.trim() ?? "";
		if (raw.length < 3) {
			return NextResponse.json({ ok: true as const, results: [] });
		}

		const ip = clientKey(req);
		if (!deliveryPublicRateOk(`addr-search:${ip}`, 40, 60_000)) {
			return NextResponse.json(
				{ error: "Demasiadas consultas. Espera un momento." },
				{ status: 429 },
			);
		}

		const branchIdRaw = req.nextUrl.searchParams.get("branchId");
		const branchId =
			typeof branchIdRaw === "string" ? branchIdRaw.trim() : "";

		const nearLatRaw = req.nextUrl.searchParams.get("nearLat");
		const nearLonRaw = req.nextUrl.searchParams.get("nearLon");
		const nearLat = nearLatRaw != null ? Number(nearLatRaw) : NaN;
		const nearLon = nearLonRaw != null ? Number(nearLonRaw) : NaN;

		let origin: { lat: number; lng: number } | null = null;
		let maxKm = DEFAULT_SUGGESTION_RADIUS_KM;

		if (branchId) {
			if (!deliveryPublicRateOk(`addr-search:branch:${branchId}:${ip}`, 55, 60_000)) {
				return NextResponse.json(
					{ error: "Demasiadas consultas para esta sucursal." },
					{ status: 429 },
				);
			}

			const { data: branch, error } = await supabaseAdmin
				.from("branches")
				.select("id, delivery_settings, origin_lat, origin_lng")
				.eq("id", branchId)
				.maybeSingle();

			if (error || !branch) {
				return NextResponse.json({ error: "Sucursal no encontrada" }, { status: 404 });
			}

			const olat = Number(branch.origin_lat);
			const olng = Number(branch.origin_lng);
			if (!isValidLatLng(olat, olng)) {
				return NextResponse.json({
					ok: true as const,
					results: [],
					code: "no_branch_origin" as const,
				});
			}

			origin = { lat: olat, lng: olng };
			const settings = normalizeDeliverySettings(branch.delivery_settings);
			const m = settings.maxDeliveryKm;
			maxKm =
				m != null && Number.isFinite(m) && m > 0 ? m : DEFAULT_SUGGESTION_RADIUS_KM;
		} else if (Number.isFinite(nearLat) && Number.isFinite(nearLon)) {
			origin = { lat: nearLat, lng: nearLon };
			maxKm = DEFAULT_SUGGESTION_RADIUS_KM;
		}

		const bias =
			origin != null
				? { nearLat: origin.lat, nearLon: origin.lng }
				: Number.isFinite(nearLat) && Number.isFinite(nearLon)
					? { nearLat, nearLon }
					: undefined;

		const rawHits = await photonSearchAddressHits(raw, {
			...bias,
			communeHint:
				communeHintRaw.length >= 2 ? communeHintRaw : undefined,
			regionHint:
				regionRaw.length >= 2 ? regionRaw : undefined,
		});
		let hits = rawHits ?? [];

		if (origin) {
			hits = filterHitsInRadius(hits, origin, maxKm);
		}

		return NextResponse.json({
			ok: true as const,
			results: hits,
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : "Error en el servidor";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
