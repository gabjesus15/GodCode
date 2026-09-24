/**
 * Caché en memoria para endpoints públicos de delivery (proceso Node).
 * No apto para múltiples instancias sin sticky session; suficiente para MVP.
 */

const responseCache = new Map<string, { expires: number; payload: unknown }>();

export function deliveryGeocodeCacheGet<T>(key: string): T | null {
	const e = responseCache.get(key);
	if (!e || Date.now() > e.expires) {
		if (e) responseCache.delete(key);
		return null;
	}
	return e.payload as T;
}

export function deliveryGeocodeCacheSet(
	key: string,
	payload: unknown,
	ttlMs: number,
): void {
	responseCache.set(key, { expires: Date.now() + ttlMs, payload });
}

export function hashDeliveryAddressKey(branchId: string, address: string): string {
	const n = address
		.normalize("NFD")
		.replace(/\p{M}/gu, "")
		.toLowerCase()
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 300);
	let h = 0;
	for (let i = 0; i < n.length; i++) {
		h = (Math.imul(31, h) + n.charCodeAt(i)) | 0;
	}
	return `${branchId}:${h}`;
}
