import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { resolveLegalBackHref } from "@/lib/legal/legal-back-href";

describe("resolveLegalBackHref", () => {
	it("vuelve a la pantalla del alta de la que venía, con su query", () => {
		expect(resolveLegalBackHref("https://godcode.me/onboarding")).toBe("/onboarding");
		expect(resolveLegalBackHref("https://godcode.me/onboarding?pais=CL")).toBe("/onboarding?pais=CL");
		expect(resolveLegalBackHref("https://godcode.me/onboarding/tienda?paso=menu")).toBe("/onboarding/tienda?paso=menu");
		expect(resolveLegalBackHref("https://godcode.me/onboarding/pago?token=abc")).toBe("/onboarding/pago?token=abc");
	});

	it("vuelve a la página de marketing de la que venía", () => {
		expect(resolveLegalBackHref("https://www.godcode.me/")).toBe("/");
		expect(resolveLegalBackHref("https://www.godcode.me/labs")).toBe("/labs");
		expect(resolveLegalBackHref("https://www.godcode.me/chile/")).toBe("/chile");
		expect(resolveLegalBackHref("https://www.godcode.me/venezuela?utm_source=ig")).toBe("/venezuela?utm_source=ig");
		expect(resolveLegalBackHref("https://www.godcode.me/sobre-godcode")).toBe("/sobre-godcode");
	});

	it("sin referer, desde otra página legal o desde rutas que no son del sitio público, va a la home", () => {
		expect(resolveLegalBackHref(null)).toBe("/");
		expect(resolveLegalBackHref("")).toBe("/");
		expect(resolveLegalBackHref("https://godcode.me/onboarding/privacidad")).toBe("/");
		expect(resolveLegalBackHref("https://godcode.me/onboarding/terminos/")).toBe("/");
		expect(resolveLegalBackHref("https://godcode.me/onboardingx")).toBe("/");
		expect(resolveLegalBackHref("https://godcode.me/cuenta")).toBe("/");
		expect(resolveLegalBackHref("https://godcode.me/rica-pizza")).toBe("/");
		expect(resolveLegalBackHref("no es una url")).toBe("/");
	});

	it("nunca devuelve un origen externo: solo la ruta", () => {
		expect(resolveLegalBackHref("https://evil.example/onboarding/pago?token=1")).toBe("/onboarding/pago?token=1");
		expect(resolveLegalBackHref("https://evil.example/labs")).toBe("/labs");
		expect(resolveLegalBackHref("https://evil.example/otra")).toBe("/");
		expect(resolveLegalBackHref("//evil.example/onboarding")).toBe("/onboarding");
	});
});

describe("marco de las páginas legales", () => {
	it("no importa código de servidor: lo usan también componentes de cliente", () => {
		const source = readFileSync(join(process.cwd(), "components", "legal", "legal-page.tsx"), "utf8");
		expect(source).not.toMatch(/from ["']next\/headers["']/);
		expect(source).not.toMatch(/import ["']server-only["']/);
		expect(source).not.toMatch(/export async function LegalPage/);
		expect(source).not.toContain("Volver al registro");
		expect(source).not.toContain("←");
	});

	it("las tres páginas calculan su «Volver» con el referer", () => {
		for (const page of ["terminos", "privacidad", "cookies"]) {
			const source = readFileSync(join(process.cwd(), "app", "onboarding", page, "page.tsx"), "utf8");
			expect(source).toContain("backHref={await getLegalBackHref()}");
		}
	});
});
