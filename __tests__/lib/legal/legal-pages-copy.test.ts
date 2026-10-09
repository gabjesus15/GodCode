import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { LANDING_COMPANY_NAME } from "@/lib/landing/brand";
import { LEGAL_PROVIDER_DESCRIPTION, LEGAL_PROVIDER_NAME } from "@/lib/legal/legal-documents";

/** El texto de un archivo con los espacios y saltos de línea aplanados. */
function text(...path: string[]): string {
	return readFileSync(join(process.cwd(), ...path), "utf8").replace(/\s+/g, " ");
}

describe("páginas legales: lo que dicen coincide con lo que hace el código", () => {
	it("cookies y privacidad: en los menús de los negocios Google Analytics nunca usa cookies", () => {
		// app/layout.tsx deja la analítica denegada en las rutas de tenant, haya o no consentimiento previo.
		for (const page of ["cookies", "privacidad"]) {
			const source = text("app", "onboarding", page, "page.tsx");
			expect(source).toContain("En los menús de los negocios nunca se activan: Google Analytics mide sin cookies.");
			expect(source).not.toContain("salvo que ya las hayas aceptado");
		}
	});

	it("privacidad: las cotizaciones de Gcode Labs y Mercado Pago están declaradas", () => {
		const source = text("app", "onboarding", "privacidad", "page.tsx");
		expect(source).toContain("cuando un negocio se registra, paga o pide una cotización en Gcode Labs");
		expect(source).toContain("Cotizaciones a Gcode Labs:");
		expect(source).toContain("<>Mercado Pago</>");
	});

	it("los tres documentos y el pie del landing nombran al titular igual", () => {
		// La descripción es la que ya traían los Términos; antes Privacidad y la cuenta del menú la acortaban.
		expect(LEGAL_PROVIDER_DESCRIPTION).toBe(
			'una persona natural bajo el nombre comercial Gcode (también "Gcode Labs" o "Gcode POS"), con sede en Santiago, Chile',
		);
		expect(LEGAL_PROVIDER_NAME).toBe(LANDING_COMPANY_NAME);
		const documents = [
			text("app", "onboarding", "terminos", "page.tsx"),
			text("app", "onboarding", "privacidad", "page.tsx"),
			text("components", "tenant", "account", "menu-account-terms-content.tsx"),
		];
		for (const source of documents) {
			expect(source).toContain("operado por {LEGAL_PROVIDER_DESCRIPTION} <ProviderIdentity />");
			expect(source).not.toContain("nombre comercial");
		}
		expect(text("components", "landing-v3", "footer.tsx")).toContain("© {new Date().getFullYear()} {LEGAL_PROVIDER_NAME}");
	});

	it("el pie de /labs enlaza la política de cookies y reabre el aviso", () => {
		const source = text("components", "labs", "labs-home.tsx");
		expect(source).toContain('{ label: "Cookies", href: "/onboarding/cookies" }');
		expect(source).toContain("<CookieSettingsLink");
	});
});
