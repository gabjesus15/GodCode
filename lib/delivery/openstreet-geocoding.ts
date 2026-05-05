/**
 * Geocodificación con OpenStreetMap (Nominatim).
 * - Reemplaza la lógica anterior basada en Mapbox para /api/geo/address-search y /api/geo/reverse-geocode.
 *
 * Nota: Nominatim tiene rate limits. Ya aplicamos rate limit adicional en las rutas Next.
 */

const NOMINATIM_SEARCH_BASE = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_REVERSE_BASE = "https://nominatim.openstreetmap.org/reverse";

export type AddressGeocodeHit = {
	lat: number;
	lng: number;
	label: string;
	line1: string;
	commune: string;
	detailLine: string;
	precision: "exact" | "approx";
};

type NominatimAddress = Record<string, unknown>;
type NominatimResult = {
	lat?: string;
	lon?: string;
	display_name?: string;
	class?: string;
	type?: string;
	importance?: number;
	address?: NominatimAddress;
};

function getCountryCodesParam(): string | undefined {
	// Reutilizamos el env existente para no romper configuraciones.
	const c =
		process.env.MAPBOX_GEOCODE_COUNTRIES?.trim() ||
		process.env.OPENSTREET_GEOCODE_COUNTRIES?.trim();
	if (!c) return undefined;
	return c;
}

function safeStr(v: unknown): string {
	return typeof v === "string" ? v.trim() : "";
}

function parseDetailLineFromDisplayName(displayName: string | undefined): string {
	const d = displayName?.trim() ?? "";
	if (!d) return "";
	const parts = d.split(",").map((s) => s.trim()).filter(Boolean);
	// detailLine = desde el 2do segmento en adelante.
	return parts.slice(1).join(", ").slice(0, 300);
}

function line1FromNominatim(r: NominatimResult): string {
	const addr = r.address ?? {};
	const road = safeStr(addr.road);
	const house = safeStr(addr.house_number);
	const path = [road, house].filter(Boolean).join(" ").trim();
	if (path) return path.slice(0, 200);

	// Fallback: primer segmento del display_name.
	const d = safeStr(r.display_name);
	if (!d) return "";
	const first = d.split(",").map((s) => s.trim()).filter(Boolean)[0];
	return (first ?? "").slice(0, 200);
}

function communeFromNominatim(r: NominatimResult): string {
	const addr = r.address ?? {};

	// En OSM para Chile, normalmente comuna ~ county (depende del item).
	const candidates = [
		safeStr(addr.county),
		safeStr(addr.city_district),
		safeStr(addr.suburb),
		safeStr(addr.municipality),
		safeStr(addr.village),
		safeStr(addr.town),
		safeStr(addr.city),
	];

	for (const c of candidates) {
		if (!c) continue;
		// Evitar que se nos cuele "Región Metropolitana de Santiago".
		if (/^regi[oó]n\b/i.test(c)) continue;
		return c.slice(0, 120);
	}

	// Fallback: tomar el segmento que parezca comuna por posición:
	// En el display_name de Chile suele aparecer "Comuna, Región ..." como 3er/4to segmento,
	// pero hay variaciones. Intentamos el 2do segmento y luego el 3ro.
	const d = safeStr(r.display_name);
	const parts = d.split(",").map((s) => s.trim()).filter(Boolean);
	if (parts.length >= 2) {
		const second = parts[1];
		if (second && !/^regi[oó]n\b/i.test(second)) return second.slice(0, 120);
	}
	if (parts.length >= 3) {
		const third = parts[2];
		if (third && !/^regi[oó]n\b/i.test(third)) return third.slice(0, 120);
	}
	return "";
}

function precisionFromNominatim(r: NominatimResult): "exact" | "approx" {
	const addr = r.address ?? {};
	const hasRoad = Boolean(safeStr(addr.road));
	const hasHouse = Boolean(safeStr(addr.house_number));
	return hasRoad && hasHouse ? "exact" : "approx";
}

async function nominatimFetch(url: string): Promise<NominatimResult[]> {
	const res = await fetch(url, {
		headers: {
			// Nominatim recomienda un User-Agent legible.
			"User-Agent": "saas-godcode-admin/1.0 (geocoding; educational)",
			Accept: "application/json",
		},
		cache: "no-store",
	});
	if (!res.ok) return [];
	const data = (await res.json().catch(() => null)) as unknown;
	if (!Array.isArray(data)) return [];
	return data as NominatimResult[];
}

export async function openstreetSearchAddressHits(
	query: string,
	options?: {
		nearLat?: number | null;
		nearLon?: number | null;
		communeHint?: string;
		regionHint?: string;
	},
): Promise<AddressGeocodeHit[] | null> {
	const q = query.trim();
	if (q.length < 3) return null;

	const cc = getCountryCodesParam();
	const limit = 10;

	// Nota: Nominatim no soporta proximity directo igual que Mapbox.
	// Usamos `viewbox` aproximado cuando hay lat/lng para sesgar.
	let viewbox: string | undefined;
	const nearLat = options?.nearLat ?? null;
	const nearLon = options?.nearLon ?? null;
	if (Number.isFinite(nearLat) && Number.isFinite(nearLon)) {
		// bbox aproximado ~ 30km.
		const lat = nearLat as number;
		const lon = nearLon as number;
		const d = 0.27; // ~30km en lat
		const minLat = Math.max(-90, lat - d);
		const maxLat = Math.min(90, lat + d);
		const minLon = lon - d;
		const maxLon = lon + d;
		viewbox = `${minLon},${maxLat},${maxLon},${minLat}`; // left,top,right,bottom
	}

	const params = new URLSearchParams({
		q,
		format: "jsonv2",
		addressdetails: "1",
		limit: String(limit),
		accept_language: "es",
	});
	if (cc) params.set("countrycodes", cc);
	if (viewbox) {
		params.set("viewbox", viewbox);
		params.set("bounded", "1");
	}
	// `dedupe=1` reduce duplicados.
	params.set("dedupe", "1");

	const url = `${NOMINATIM_SEARCH_BASE}?${params.toString()}`;
	const results = await nominatimFetch(url);
	if (!results.length) return null;

	const communeHint = options?.communeHint?.trim().toLowerCase() ?? "";
	const regionHint = options?.regionHint?.trim().toLowerCase() ?? "";

	const rows: { hit: AddressGeocodeHit; score: number }[] = [];
	for (const r of results) {
		const lat = Number(r.lat);
		const lng = Number(r.lon);
		if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
		const displayName = safeStr(r.display_name);
		if (!displayName) continue;
		const commune = communeFromNominatim(r);
		const line1 = line1FromNominatim(r);
		const detailLine = parseDetailLineFromDisplayName(displayName);
		const label = displayName.slice(0, 220);

		let score = (r.importance ?? 0) * 10;
		if (communeHint && commune.toLowerCase().includes(communeHint)) score += 35;

		if (regionHint) {
			// Región a veces aparece en display_name.
			if (displayName.toLowerCase().includes(regionHint)) score += 10;
		}

		// Si se busca algo tipo "calle 1432" damos preferencia a resultados que contengan house_number.
		const addr = r.address ?? {};
		const house = safeStr(addr.house_number);
		const road = safeStr(addr.road);
		if (/\d/.test(q) && house && road) score += 20;

		rows.push({
			hit: {
				lat,
				lng,
				label,
				line1: line1 || label.split(",")[0]?.trim() || "Ubicación",
				commune,
				detailLine,
				precision: precisionFromNominatim(r),
			},
			score,
		});
	}

	if (!rows.length) return null;
	rows.sort((a, b) => b.score - a.score);
	return rows.slice(0, 10).map((x) => x.hit);
}

export async function openstreetForwardGeocodeFeatures(
	address: string,
): Promise<Record<string, unknown>[] | null> {
	const q = address.trim();
	if (q.length < 8) return null;

	const cc = getCountryCodesParam();

	const params = new URLSearchParams({
		q,
		format: "jsonv2",
		addressdetails: "1",
		limit: "6",
		accept_language: "es",
	});
	if (cc) params.set("countrycodes", cc);
	const url = `${NOMINATIM_SEARCH_BASE}?${params.toString()}`;
	const results = await nominatimFetch(url);
	if (!results.length) return null;

	const out: Record<string, unknown>[] = [];
	for (const r of results) {
		const addr = r.address ?? {};
		const display = safeStr(r.display_name);
		if (!display) continue;
		const city = safeStr(addr.city) || safeStr(addr.town) || safeStr(addr.village) || "";
		const district =
			safeStr(addr.county) ||
			safeStr(addr.city_district) ||
			safeStr(addr.suburb) ||
			"";
		const locality = city;
		const state = safeStr(addr.state) || safeStr(addr.region) || "";
		const country = safeStr(addr.country) || "";
		const name =
			safeStr(addr.road) && safeStr(addr.house_number)
				? `${safeStr(addr.road)} ${safeStr(addr.house_number)}`
				: display.split(",")[0]?.trim() || display;

		out.push({
			name: name.slice(0, 200),
			city: city.slice(0, 120),
			district: district.slice(0, 120),
			locality: locality.slice(0, 120),
			county: district.slice(0, 120),
			state: state.slice(0, 120),
			country: country.slice(0, 120),
		});
	}

	return out.length ? out : null;
}

export async function openstreetReverseGeocodeLine1Commune(
	lat: number,
	lng: number,
): Promise<{ line1: string; commune: string } | null> {
	if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
	const params = new URLSearchParams({
		format: "jsonv2",
		lat: String(lat),
		lon: String(lng),
		addressdetails: "1",
		zoom: "18",
		accept_language: "es",
	});
	const url = `${NOMINATIM_REVERSE_BASE}?${params.toString()}`;

	const res = await fetch(url, {
		headers: {
			"User-Agent": "saas-godcode-admin/1.0 (geocoding; educational)",
			Accept: "application/json",
		},
		cache: "no-store",
	});
	if (!res.ok) return null;
	const data = (await res.json().catch(() => null)) as
		| { address?: NominatimAddress; display_name?: string }
		| null;
	if (!data) return null;

	const r: NominatimResult = {
		lat: String(lat),
		lon: String(lng),
		display_name: data.display_name,
		address: data.address,
	};

	const line1 = line1FromNominatim(r);
	const commune = communeFromNominatim(r);
	if (!line1 && !commune) return null;

	return {
		line1: line1.slice(0, 200),
		commune: commune.slice(0, 120),
	};
}

