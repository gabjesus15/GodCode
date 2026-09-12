import { describe, expect, it } from "vitest";

import {
	CLIENT_ADDRESS_FIELDS,
	pickClientAddressFields,
} from "@/lib/delivery/client-address-fields";

describe("pickClientAddressFields", () => {
	it("descarta maps_url enviado por el cliente", () => {
		// El bug: `POST /api/tenant/public-order-delivery` es público y hacía
		// `{ ...draftAddr }`, así que este `maps_url` se persistía y el panel del
		// cajero lo renderizaba en un `href`.
		const picked = pickClientAddressFields({
			address: "Calle 1",
			maps_url: "javascript:alert(document.cookie)",
		});

		expect(picked).toEqual({ address: "Calle 1" });
		expect(picked.maps_url).toBeUndefined();
	});

	it("descarta lat y lng, que los calcula el servidor", () => {
		const picked = pickClientAddressFields({
			address: "Calle 1",
			lat: -33.4,
			lng: -70.6,
		});

		expect(picked).toEqual({ address: "Calle 1" });
	});

	it("descarta los campos del proveedor de delivery", () => {
		const picked = pickClientAddressFields({
			address: "Calle 1",
			delivery_provider: "uber_direct",
			uber_quote_id: "falsificado",
		});

		expect(picked).toEqual({ address: "Calle 1" });
	});

	it("descarta cualquier clave desconocida", () => {
		const picked = pickClientAddressFields({
			address: "Calle 1",
			__proto__polluted: true,
			basura: { anidada: true },
		});

		expect(Object.keys(picked)).toEqual(["address"]);
	});

	it("conserva todos los campos legítimos de dirección", () => {
		// La lista se derivó de las claves presentes en los pedidos de producción.
		// Si un campo se cae, el cajero deja de ver parte de la dirección y no hay
		// ningún error que lo delate.
		const entrada = Object.fromEntries(
			CLIENT_ADDRESS_FIELDS.map((field) => [field, `valor-${field}`]),
		);

		expect(pickClientAddressFields(entrada)).toEqual(entrada);
	});

	it("omite las claves ausentes en vez de ponerlas en undefined", () => {
		const picked = pickClientAddressFields({ address: "Calle 1" });

		expect(Object.keys(picked)).toEqual(["address"]);
		expect("reference" in picked).toBe(false);
	});
});
