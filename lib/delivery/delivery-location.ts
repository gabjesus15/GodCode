/**
 * De dónde salió la ubicación de entrega y a dónde lleva el enlace de mapa del
 * pedido. Puro: lo usan el carrito, la ruta que cierra el pedido y los tests.
 *
 * - `gps`: el GPS del teléfono con buena precisión (≤ 100 m).
 * - `gps_approx`: GPS impreciso (típico de un computador: ubica por IP o wifi).
 * - `pin`: el cliente movió el mapa hasta su puerta. Es lo más fiable.
 * - `address`: la dirección escrita, encontrada con número de casa.
 * - `address_approx`: la dirección escrita sin número encontrado: el punto cae
 *   en el centro de la calle o del barrio.
 */

export const DELIVERY_LOCATION_SOURCES = ["gps", "gps_approx", "pin", "address", "address_approx"] as const;
export type DeliveryLocationSource = (typeof DELIVERY_LOCATION_SOURCES)[number];

/** Por encima de esto el GPS no sirve para encontrar una puerta. */
export const GPS_PRECISE_MAX_METERS = 100;

export function normalizeDeliveryLocationSource(value: unknown): DeliveryLocationSource | null {
	const raw = String(value ?? "").trim();
	return (DELIVERY_LOCATION_SOURCES as readonly string[]).includes(raw) ? (raw as DeliveryLocationSource) : null;
}

export function gpsLocationSource(accuracyMeters: unknown): DeliveryLocationSource {
	const accuracy = Number(accuracyMeters);
	return Number.isFinite(accuracy) && accuracy > 0 && accuracy <= GPS_PRECISE_MAX_METERS ? "gps" : "gps_approx";
}

export function isApproxLocationSource(source: DeliveryLocationSource | null | undefined): boolean {
	return source === "gps_approx" || source === "address_approx";
}

/** Navegación en Google Maps hacia unas coordenadas. */
export function googleMapsDirectionsToPoint(lat: number, lng: number): string {
	return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lng}`)}`;
}

/** Navegación en Google Maps hacia una dirección escrita (Google la ubica con su propio mapa). */
export function googleMapsDirectionsToAddress(address: string): string {
	return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

type AddressText = {
	line1?: unknown;
	address?: unknown;
	formatted_address?: unknown;
	commune?: unknown;
	named_area_label?: unknown;
};

function text(value: unknown): string {
	return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

/** «Calle 123, Comuna, País» con lo que haya; vacío si no hay calle. */
export function deliveryAddressSearchText(address: AddressText | null | undefined, countryName?: string | null): string {
	if (!address) return "";
	const street = text(address.line1) || text(address.address) || text(address.formatted_address);
	if (!street) return "";
	const area = text(address.commune) || text(address.named_area_label);
	const parts = [street];
	if (area && !street.toLowerCase().includes(area.toLowerCase())) parts.push(area);
	const country = text(countryName);
	if (country && !parts.join(" ").toLowerCase().includes(country.toLowerCase())) parts.push(country);
	return parts.join(", ").slice(0, 300);
}

/**
 * El enlace que abre el repartidor. Con un punto fiable (GPS preciso, punto
 * ajustado o dirección con número) va a las coordenadas. Si el punto es
 * aproximado por la dirección escrita, o no hay coordenadas, busca la dirección
 * en Google Maps, que sí conoce los números de casa. Sin nada, `null`.
 */
export function resolveDeliveryMapsUrl(input: {
	lat: number | null;
	lng: number | null;
	source: DeliveryLocationSource | null;
	address: AddressText | null | undefined;
	countryName?: string | null;
}): string | null {
	const hasPoint = input.lat != null && input.lng != null && Number.isFinite(input.lat) && Number.isFinite(input.lng);
	const searchText = deliveryAddressSearchText(input.address, input.countryName);
	if (searchText && (!hasPoint || input.source === "address_approx")) {
		return googleMapsDirectionsToAddress(searchText);
	}
	if (hasPoint) return googleMapsDirectionsToPoint(input.lat as number, input.lng as number);
	return null;
}
