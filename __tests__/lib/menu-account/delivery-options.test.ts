import { describe, expect, it } from "vitest";

import {
	resolveMenuAccountDeliveryOptions,
	shortZoneName,
} from "@/lib/menu-account/delivery-options";

const zonesBranch = {
	id: "branch-zones",
	name: "Oishi Centro",
	delivery_settings: {
		enabled: true,
		deliveryPricingStrategy: "named_areas",
		namedAreaResolution: "manual_select",
		namedAreas: [
			{ id: "z1", name: "Maipú · Región Metropolitana de Santiago", feeFlat: 2000 },
			{ id: "z2", name: "Cerrillos", feeFlat: 2500 },
		],
	},
};

const distanceBranch = {
	id: "branch-distance",
	name: "Otra",
	delivery_settings: { enabled: true, deliveryPricingStrategy: "distance" },
};

describe("resolveMenuAccountDeliveryOptions", () => {
	it("usa zonas cuando la sucursal cobra por zona elegida a mano", () => {
		const options = resolveMenuAccountDeliveryOptions([zonesBranch]);
		expect(options).toEqual({
			mode: "zones",
			zones: [
				{ id: "z1", name: "Maipú", branchId: "branch-zones", branchName: "Oishi Centro" },
				{ id: "z2", name: "Cerrillos", branchId: "branch-zones", branchName: "Oishi Centro" },
			],
		});
	});

	it("pide dirección cuando la zona se detecta desde la dirección", () => {
		const branch = {
			...zonesBranch,
			delivery_settings: { ...zonesBranch.delivery_settings, namedAreaResolution: "address_matched" },
		};
		expect(resolveMenuAccountDeliveryOptions([branch])).toEqual({ mode: "address" });
	});

	it("pide dirección cuando se cobra por distancia", () => {
		expect(resolveMenuAccountDeliveryOptions([distanceBranch])).toEqual({ mode: "address" });
	});

	it("las zonas mandan si conviven con sucursales por dirección", () => {
		expect(resolveMenuAccountDeliveryOptions([distanceBranch, zonesBranch]).mode).toBe("zones");
	});

	it("sin delivery activo no hay direcciones", () => {
		const off = { ...zonesBranch, delivery_settings: { ...zonesBranch.delivery_settings, enabled: false } };
		expect(resolveMenuAccountDeliveryOptions([off])).toEqual({ mode: "none" });
		expect(resolveMenuAccountDeliveryOptions([])).toEqual({ mode: "none" });
	});
});

describe("shortZoneName", () => {
	it("quita la región que agrega el geocoder", () => {
		expect(shortZoneName("Maipú · Región Metropolitana de Santiago")).toBe("Maipú");
		expect(shortZoneName("Cerrillos")).toBe("Cerrillos");
	});
});
