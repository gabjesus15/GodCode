const EARTH_RADIUS_KM = 6371;

export type GeoPoint = { lat: number; lng: number };

function toRad(deg: number): number {
	return (deg * Math.PI) / 180;
}

/** Distancia en km entre dos puntos WGS84 (fórmula haversine). */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
	const dLat = toRad(b.lat - a.lat);
	const dLng = toRad(b.lng - a.lng);
	const lat1 = toRad(a.lat);
	const lat2 = toRad(b.lat);
	const sinDLat = Math.sin(dLat / 2);
	const sinDLng = Math.sin(dLng / 2);
	const h =
		sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
	const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
	return Math.round(EARTH_RADIUS_KM * c * 1000) / 1000;
}

export function isValidLatLng(lat: unknown, lng: unknown): lat is number {
	// `Number(null) === 0` hace que null se considere válido incorrectamente.
	// Queremos que `null/undefined` (y strings vacías) sean inválidos.
	if (lat == null || lng == null) return false;
	if (typeof lat === "string" && lat.trim() === "") return false;
	if (typeof lng === "string" && lng.trim() === "") return false;

	const la = Number(lat);
	const ln = Number(lng);
	return (
		Number.isFinite(la) &&
		Number.isFinite(ln) &&
		la >= -90 &&
		la <= 90 &&
		ln >= -180 &&
		ln <= 180
	);
}

/** Enlace para abrir navegación hacia el punto de entrega. */
export function buildGoogleMapsDirectionsUrl(lat: number, lng: number): string {
	return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lng}`)}`;
}
