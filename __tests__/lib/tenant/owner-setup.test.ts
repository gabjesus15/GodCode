import { describe, expect, it } from "vitest";

import { contrastRatio } from "@/lib/store-theme/store-theme-utils";
import { brandButtonColors, pickBrandColors, pickButtonColor, shadeHex } from "@/lib/tenant/logo-colors";
import { readOwnerSetup, shouldAutoOpenOwnerSetup, withOwnerSetupMark } from "@/lib/tenant/owner-setup";
import { phoneFromWhatsappUrl, whatsappUrlFromPhone } from "@/lib/tenant/whatsapp-url";

function pixels(blocks: Array<{ rgba: [number, number, number, number]; count: number }>): Uint8ClampedArray {
	const out: number[] = [];
	for (const { rgba, count } of blocks) for (let i = 0; i < count; i++) out.push(...rgba);
	return new Uint8ClampedArray(out);
}

describe("pickBrandColors", () => {
	it("propone los colores del logo del más presente al menos, sin fondo ni grises", () => {
		const logo = pixels([
			{ rgba: [255, 255, 255, 255], count: 5000 }, // fondo blanco
			{ rgba: [0, 0, 0, 0], count: 3000 }, // transparente
			{ rgba: [128, 128, 128, 255], count: 1000 }, // gris
			{ rgba: [220, 40, 30, 255], count: 2000 }, // rojo
			{ rgba: [240, 180, 20, 255], count: 800 }, // amarillo
			{ rgba: [221, 41, 31, 255], count: 300 }, // casi el mismo rojo
		]);
		expect(pickBrandColors(logo)).toEqual(["#dc281e", "#f0b414"]);
	});

	it("un logo negro sobre blanco no propone nada", () => {
		expect(pickBrandColors(pixels([{ rgba: [255, 255, 255, 255], count: 500 }, { rgba: [10, 10, 10, 255], count: 500 }]))).toEqual([]);
	});

	it("oscurece y aclara un color", () => {
		expect(shadeHex("#dc281e", -0.5)).toBe("#6e140f");
		expect(shadeHex("#000000", 0.5)).toBe("#808080");
		expect(shadeHex("rojo", 0.2)).toBe("rojo");
	});
});

describe("ownerSetup", () => {
	const now = new Date("2026-10-10T12:00:00Z");

	it("abre el asistente solo a negocios nuevos que no lo cerraron", () => {
		expect(shouldAutoOpenOwnerSetup({ themeConfig: {}, companyCreatedAt: "2026-10-06T12:00:00Z", now })).toBe(true);
		expect(shouldAutoOpenOwnerSetup({ themeConfig: {}, companyCreatedAt: "2026-08-01T12:00:00Z", now })).toBe(false);
		expect(shouldAutoOpenOwnerSetup({ themeConfig: null, companyCreatedAt: null, now })).toBe(false);
		const skipped = withOwnerSetupMark({ logoUrl: "x" }, "skip", now);
		expect(shouldAutoOpenOwnerSetup({ themeConfig: skipped, companyCreatedAt: "2026-10-06T12:00:00Z", now })).toBe(false);
	});

	it("marca terminado o saltado sin tocar el resto del tema", () => {
		const finished = withOwnerSetupMark(withOwnerSetupMark({ logoUrl: "x", panelAccess: { a: 1 } }, "skip", now), "finish", now);
		expect(finished).toMatchObject({ logoUrl: "x", panelAccess: { a: 1 } });
		expect(readOwnerSetup(finished)).toEqual({ finishedAt: now.toISOString(), skippedAt: now.toISOString() });
		expect(readOwnerSetup({ ownerSetup: { finishedAt: "no es fecha" } })).toEqual({ finishedAt: null, skippedAt: null });
	});
});

describe("whatsapp", () => {
	it("vuelve a mostrar el número de un enlace wa.me", () => {
		expect(phoneFromWhatsappUrl(whatsappUrlFromPhone("0412 1234567", "Venezuela"))).toBe("+584121234567");
		expect(phoneFromWhatsappUrl("https://api.whatsapp.com/send?phone=56912345678")).toBe("+56912345678");
		expect(phoneFromWhatsappUrl("no es url")).toBe("");
	});
});

describe("brandButtonColors", () => {
	it("deja un color oscuro como está y oscurece uno claro hasta que el texto blanco se lea", () => {
		expect(brandButtonColors("#7c3f1d")).toEqual({ primaryColor: "#7c3f1d", hoverColor: shadeHex("#7c3f1d", -0.12) });
		const yellow = brandButtonColors("#f0b414");
		expect(yellow?.primaryColor).not.toBe("#f0b414");
		expect(contrastRatio(yellow!.primaryColor, "#ffffff")).toBeGreaterThanOrEqual(4.5);
		expect(brandButtonColors("rojo")).toBeNull();
	});

	it("para los botones propone el color del logo que ya se lee con texto blanco", () => {
		expect(pickButtonColor(["#f6b21a", "#c8102e"])).toBe("#c8102e");
		expect(pickButtonColor(["#f6b21a", "#ffe066"])).toBe("#f6b21a");
		expect(pickButtonColor([])).toBeNull();
	});
});
