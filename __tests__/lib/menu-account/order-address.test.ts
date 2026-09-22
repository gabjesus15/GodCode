import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/infra/supabase-admin", () => ({ supabaseAdmin: {} }));

import {
	isSealedOrderAddress,
	openOrderDeliveryAddress,
	sealOrderDeliveryAddress,
} from "@/lib/menu-account/order-address";

const direccion = {
	address: "Av. Principal 123, Depto 4B",
	reference: "portón verde",
	commune: "Providencia",
	lat: -33.45,
	lng: -70.66,
	maps_url: "https://maps.google.com/?q=-33.45,-70.66",
	named_area_id: "zona-centro",
	named_area_label: "Centro",
	delivery_provider: "uber_direct",
	uber_quote_id: "q-1",
};

describe("dirección de un pedido de cuenta", () => {
	it("deja en claro solo lo operativo y cifra el resto", () => {
		const sellada = sealOrderDeliveryAddress(direccion)!;
		expect(isSealedOrderAddress(sellada)).toBe(true);
		expect(sellada).toMatchObject({
			named_area_id: "zona-centro",
			named_area_label: "Centro",
			delivery_provider: "uber_direct",
			uber_quote_id: "q-1",
		});
		const texto = JSON.stringify(sellada);
		for (const privado of ["Principal", "portón", "Providencia", "-33.45", "maps.google"]) {
			expect(texto).not.toContain(privado);
		}
	});

	it("la dueña la recupera entera", () => {
		expect(openOrderDeliveryAddress(sealOrderDeliveryAddress(direccion))).toEqual(direccion);
	});

	it("no cifra dos veces ni toca lo que no es una dirección", () => {
		const sellada = sealOrderDeliveryAddress(direccion);
		expect(sealOrderDeliveryAddress(sellada)).toBe(sellada);
		expect(sealOrderDeliveryAddress(null)).toBeNull();
		expect(sealOrderDeliveryAddress("texto")).toBeNull();
	});

	it("una dirección solo con zona queda igual, sin blob cifrado", () => {
		expect(sealOrderDeliveryAddress({ named_area_id: "z", named_area_label: "Centro" })).toEqual({
			named_area_id: "z",
			named_area_label: "Centro",
		});
	});

	it("una dirección antigua en claro se devuelve tal cual", () => {
		expect(openOrderDeliveryAddress({ address: "Calle 1" })).toEqual({ address: "Calle 1" });
	});
});
