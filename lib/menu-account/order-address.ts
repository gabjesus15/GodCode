import "server-only";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";

import { isSealedPii, openPii, sealPii } from "./pii";

/**
 * Dirección de envío de un pedido de cliente con cuenta.
 *
 * En `orders.delivery_address` queda en claro solo lo operativo: la zona (cocina y
 * caja la usan para agrupar y cobrar) y el proveedor de envío. Calle, referencia,
 * comuna, coordenadas y enlace de mapa van juntos en `sealed`. El panel los revela
 * con la Edge Function `client-pii`, que entiende esta misma forma.
 */

const OPERATIONAL_KEYS = new Set([
	"named_area_id",
	"named_area_label",
	"zone_label",
	"delivery_provider",
	"uber_quote_id",
]);

type AddressObject = Record<string, unknown>;

function isAddressObject(value: unknown): value is AddressObject {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isSealedOrderAddress(value: unknown): boolean {
	return isAddressObject(value) && isSealedPii(value.sealed as string | undefined);
}

/** Separa lo operativo y cifra el resto. Una dirección ya cifrada se deja igual. */
export function sealOrderDeliveryAddress(value: unknown): AddressObject | null {
	if (!isAddressObject(value)) return null;
	if (isSealedOrderAddress(value)) return value;

	const clear: AddressObject = {};
	const personal: AddressObject = {};
	for (const [key, field] of Object.entries(value)) {
		if (field === undefined) continue;
		if (OPERATIONAL_KEYS.has(key)) clear[key] = field;
		else personal[key] = field;
	}
	if (Object.keys(personal).length === 0) return clear;
	return { ...clear, sealed: sealPii(JSON.stringify(personal)) };
}

/** Devuelve la dirección completa para la dueña de la cuenta (historial, repetir pedido). */
export function openOrderDeliveryAddress(value: unknown): AddressObject | null {
	if (!isAddressObject(value)) return null;
	if (!isSealedOrderAddress(value)) return value;
	const { sealed, ...clear } = value;
	const plain = openPii(String(sealed));
	try {
		const parsed = JSON.parse(plain ?? "{}");
		return isAddressObject(parsed) ? { ...clear, ...parsed } : clear;
	} catch {
		return clear;
	}
}

/** ¿La ficha pertenece a una cuenta del menú? Decide si el pedido se guarda cifrado. */
export async function isMenuAccountClient(clientId: unknown, companyId: unknown): Promise<boolean> {
	if (!clientId || !companyId) return false;
	const { data } = await supabaseAdmin
		.from("menu_client_accounts")
		.select("id")
		.eq("client_id", String(clientId))
		.eq("company_id", String(companyId))
		.limit(1)
		.maybeSingle();
	return Boolean(data);
}
