import { describe, expect, it } from "vitest";

import { encodePayPalCustomId, parsePayPalCustomId } from "@/lib/payments/paypal";

describe("customId de las órdenes de PayPal", () => {
	it("ida y vuelta con la promo explícita", () => {
		const meta = { kind: "onboarding" as const, applicationId: "app-1", chargedMonths: 1, grantedMonths: 4, promoApplied: true };
		expect(encodePayPalCustomId(meta)).toBe("ob|app-1|1|4|1");
		expect(parsePayPalCustomId("ob|app-1|1|4|1")).toEqual(meta);
	});

	it("meses de regalo de un cupón sin promo: no se marca la promo como usada", () => {
		expect(parsePayPalCustomId("ob|app-1|1|3|0")).toEqual({ kind: "onboarding", applicationId: "app-1", chargedMonths: 1, grantedMonths: 3, promoApplied: false });
	});

	it("las órdenes viejas sin la marca deducen la promo de los meses", () => {
		expect(parsePayPalCustomId("ob|app-1|3|4")).toMatchObject({ grantedMonths: 4, promoApplied: true });
		expect(parsePayPalCustomId("ob|app-1|3|3")).toMatchObject({ grantedMonths: 3, promoApplied: false });
		expect(parsePayPalCustomId("app-1|2")).toEqual({ kind: "onboarding", applicationId: "app-1", chargedMonths: 2, grantedMonths: 2 });
	});

	it("acota los meses otorgados a pagados + promo + regalo (25)", () => {
		expect(parsePayPalCustomId("ob|app-1|12|40|1")).toMatchObject({ chargedMonths: 12, grantedMonths: 25 });
	});

	it("portal", () => {
		expect(parsePayPalCustomId(encodePayPalCustomId({ kind: "portal", paymentId: "pay-9" }))).toEqual({ kind: "portal", paymentId: "pay-9" });
		expect(parsePayPalCustomId("")).toBeNull();
	});
});
