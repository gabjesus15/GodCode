import {
	effectiveDeliveryPricingMode,
	normalizeDeliverySettings,
} from "@/lib/delivery/delivery-settings";

/**
 * Cómo pide la dirección de entrega un negocio, para el formulario de "Mis direcciones".
 *
 * - `zones`:   al menos una sucursal cobra por zona elegida a mano (p. ej. Oishi): la
 *              persona elige su zona de la lista y agrega indicaciones.
 * - `address`: se cobra por distancia, proveedor externo o zona detectada desde la
 *              dirección: se escribe calle y número.
 * - `none`:    ninguna sucursal activa hace delivery.
 *
 * Isomorfo a propósito: la página lo calcula para pintar el formulario y la API lo
 * vuelve a calcular para validar, sin confiar en lo que mande el navegador.
 */
export type MenuAccountDeliveryZone = {
	id: string;
	/** Nombre corto para mostrar, sin la región que agrega el geocoder ("X · Región…"). */
	name: string;
	branchId: string;
	branchName: string;
};

export type MenuAccountDeliveryOptions =
	| { mode: "zones"; zones: MenuAccountDeliveryZone[] }
	| { mode: "address" }
	| { mode: "none" };

export type BranchDeliverySource = {
	id: string;
	name: string;
	delivery_settings: unknown;
};

export function shortZoneName(name: string): string {
	const short = name.split(" · ")[0]?.trim();
	return short || name.trim();
}

/** El RPC guarda `address` tal como llegó, a veces con la calle vacía (", Comuna"). */
export function cleanSavedAddressLine(line: string): string {
	return line.replace(/^[\s,]+/, "").trim();
}

/**
 * Etiqueta corta de una dirección guardada para el chip del carrito: en negocios
 * por zona es la zona (sin la región) más la calle si la hay; si no, la calle.
 */
export function savedAddressLabel(
	address: { addressLine: string; reference: string; namedAreaId: string | null },
	namedAreas: ReadonlyArray<{ id: string; name: string }>,
): string {
	const line = cleanSavedAddressLine(address.addressLine);
	const area = address.namedAreaId ? namedAreas.find((item) => item.id === address.namedAreaId) : undefined;
	if (area) {
		const zone = shortZoneName(area.name);
		const street = line && !area.name.startsWith(line) ? line : "";
		return street ? `${zone} · ${street}` : zone;
	}
	return line || address.reference || "—";
}

export function resolveMenuAccountDeliveryOptions(
	branches: BranchDeliverySource[],
): MenuAccountDeliveryOptions {
	const zones: MenuAccountDeliveryZone[] = [];
	let hasAddressDelivery = false;

	for (const branch of branches) {
		const settings = normalizeDeliverySettings(branch.delivery_settings);
		if (!settings.enabled) continue;

		const mode = effectiveDeliveryPricingMode(settings);
		if (mode === "named" && settings.namedAreaResolution === "manual_select") {
			for (const area of settings.namedAreas) {
				zones.push({
					id: area.id,
					name: shortZoneName(area.name),
					branchId: String(branch.id),
					branchName: branch.name,
				});
			}
		} else {
			hasAddressDelivery = true;
		}
	}

	// Si conviven sucursales por zona y por dirección, manda la zona: es la única forma
	// de que la dirección guardada le sirva al carrito de esas sucursales.
	if (zones.length > 0) return { mode: "zones", zones };
	if (hasAddressDelivery) return { mode: "address" };
	return { mode: "none" };
}
