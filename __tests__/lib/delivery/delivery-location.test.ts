import { describe, expect, it } from "vitest";

import {
	deliveryAddressSearchText,
	gpsLocationSource,
	isApproxLocationSource,
	normalizeDeliveryLocationSource,
	resolveDeliveryMapsUrl,
} from "@/lib/delivery/delivery-location";

describe("delivery-location", () => {
	it("clasifica la precisión del GPS", () => {
		expect(gpsLocationSource(18)).toBe("gps");
		expect(gpsLocationSource(100)).toBe("gps");
		// Un computador ubica por IP/wifi: cientos de metros o kilómetros.
		expect(gpsLocationSource(1500)).toBe("gps_approx");
		expect(gpsLocationSource(undefined)).toBe("gps_approx");
		expect(isApproxLocationSource("gps_approx")).toBe(true);
		expect(isApproxLocationSource("pin")).toBe(false);
	});

	it("solo acepta fuentes conocidas", () => {
		expect(normalizeDeliveryLocationSource("pin")).toBe("pin");
		expect(normalizeDeliveryLocationSource("javascript:alert(1)")).toBeNull();
		expect(normalizeDeliveryLocationSource(undefined)).toBeNull();
	});

	it("arma el texto de búsqueda sin repetir la comuna", () => {
		expect(deliveryAddressSearchText({ line1: "Av. 4 de Mayo 12", commune: "Porlamar" }, "Venezuela")).toBe(
			"Av. 4 de Mayo 12, Porlamar, Venezuela",
		);
		expect(deliveryAddressSearchText({ address: "Irarrázaval 1234, Ñuñoa", commune: "Ñuñoa" }, "Chile")).toBe(
			"Irarrázaval 1234, Ñuñoa, Chile",
		);
		expect(deliveryAddressSearchText({ commune: "Ñuñoa" }, "Chile")).toBe("");
	});

	it("un punto fiable lleva a las coordenadas", () => {
		for (const source of ["gps", "pin", "address", "gps_approx"] as const) {
			expect(
				resolveDeliveryMapsUrl({ lat: -33.45, lng: -70.6, source, address: { line1: "Calle 1" }, countryName: "Chile" }),
			).toBe("https://www.google.com/maps/dir/?api=1&destination=-33.45%2C-70.6");
		}
	});

	it("un punto aproximado por la dirección escrita busca la dirección", () => {
		expect(
			resolveDeliveryMapsUrl({
				lat: -33.45,
				lng: -70.6,
				source: "address_approx",
				address: { line1: "Irarrázaval 1234", commune: "Ñuñoa" },
				countryName: "Chile",
			}),
		).toBe(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent("Irarrázaval 1234, Ñuñoa, Chile")}`);
	});

	it("sin coordenadas (zonas por nombre) también deja un enlace", () => {
		expect(
			resolveDeliveryMapsUrl({ lat: null, lng: null, source: null, address: { line1: "Los Robles 5", named_area_label: "Pampatar" } }),
		).toBe(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent("Los Robles 5, Pampatar")}`);
		expect(resolveDeliveryMapsUrl({ lat: null, lng: null, source: null, address: { commune: "Pampatar" } })).toBeNull();
	});
});
