/**
 * Filtro de los campos de dirección que puede aportar el cliente.
 *
 * La ruta `POST /api/tenant/public-order-delivery` es pública y sin autenticación:
 * cualquiera puede enviar un `deliveryAddress` arbitrario. Copiar ese objeto entero
 * a `orders.delivery_address` significaba persistir cualquier clave que mandara el
 * emisor — entre ellas `maps_url`, que el panel del cajero renderiza en un `href`.
 * Un `javascript:…` ahí ejecuta en una sesión privilegiada.
 *
 * La lista se derivó de las claves realmente presentes en los pedidos de producción
 * y de lo que consumen los componentes del panel (detalle de pedido, panel de caja,
 * texto de WhatsApp e impresión térmica).
 */

/**
 * Campos que el cliente tiene permitido enviar.
 *
 * Quedan fuera a propósito los campos derivados que calcula el servidor:
 * `lat`, `lng`, `maps_url` (a partir de `body.deliveryLat`/`deliveryLng`, que son
 * campos aparte y sí se validan), y `delivery_provider` / `uber_quote_id`.
 */
export const CLIENT_ADDRESS_FIELDS = [
	"address",
	"formatted_address",
	"line1",
	"commune",
	"reference",
	"street_detail",
	"named_area_id",
	"named_area_label",
] as const;

/** Proyecta sólo los campos de dirección que el cliente tiene permitido enviar. */
export function pickClientAddressFields(
	raw: Record<string, unknown>,
): Record<string, unknown> {
	const picked: Record<string, unknown> = {};
	for (const field of CLIENT_ADDRESS_FIELDS) {
		if (raw[field] !== undefined) picked[field] = raw[field];
	}
	return picked;
}
