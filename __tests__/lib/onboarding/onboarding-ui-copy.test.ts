import { describe, expect, it } from "vitest";

import { getOnboardingUiCopy } from "@/lib/onboarding/onboarding-ui-copy";

const LOCALES = ["es", "en", "pt", "fr", "de", "it"] as const;

describe("textos del alta", () => {
	it("con «solo panel CEO» no prometen armar la tienda gratis", () => {
		const copy = getOnboardingUiCopy("es", { panelOnly: true });
		expect(copy.start.title).toBe("Crea tu cuenta y elige tu plan");
		expect(copy.form.submit).toBe("Crear mi cuenta");
		const promise = [copy.start.title, copy.start.subtitle, ...copy.start.includes, ...copy.steps.items.map((item) => `${item.title} ${item.hint}`), copy.form.sentBody, copy.verify.okBody];
		for (const text of promise) expect(text).not.toMatch(/ármala|arma tu tienda|gratis|crea tu tienda|menú digital/i);
	});

	it("sin la variante sigue la promesa de «Arma y paga»", () => {
		const copy = getOnboardingUiCopy("es");
		expect(copy.steps.items[1]).toEqual({ title: "Tu tienda", hint: "Ármala gratis" });
		expect(copy.form.submit).toBe("Crear mi tienda");
	});

	it("la variante existe en los seis idiomas y cambia lo mismo en todos", () => {
		for (const locale of LOCALES) {
			const base = getOnboardingUiCopy(locale);
			const panel = getOnboardingUiCopy(locale, { panelOnly: true });
			expect(panel.form.submit, locale).not.toBe(base.form.submit);
			expect(panel.start.title, locale).not.toBe(base.start.title);
			expect(panel.steps.items, locale).toHaveLength(3);
			// Lo que no depende del plan queda igual.
			expect(panel.form.email, locale).toBe(base.form.email);
			expect(panel.footer, locale).toEqual(base.footer);
			expect(panel.form.sentBody, locale).toContain("{email}");
		}
	});

	it("al confirmar el correo con «solo panel CEO» lleva a elegir el plan", () => {
		const verify = getOnboardingUiCopy("es", { panelOnly: true }).verify;
		expect(verify.okBody).toBe("Ahora elige tu plan. Te llevamos en un momento.");
		expect(verify.continue).toBe("Elegir mi plan");
	});

	it("la confirmación del correo tiene texto para una falla del servidor en los seis idiomas", () => {
		for (const locale of LOCALES) {
			const verify = getOnboardingUiCopy(locale).verify;
			expect(verify.serverError.trim(), locale).not.toBe("");
			expect(verify.retry.trim(), locale).not.toBe("");
			expect(verify.serverError, locale).not.toBe(verify.genericError);
		}
	});

	it("el aviso de analítica dice que Google Analytics depende del aviso de cookies", () => {
		expect(getOnboardingUiCopy("es").form.analyticsNotice).toBe(
			"Gcode mide el uso de la plataforma (tu panel CEO y tu menú público) con analítica propia y, si lo aceptas en el aviso de cookies, Google Analytics.",
		);
		for (const locale of LOCALES) expect(getOnboardingUiCopy(locale).form.analyticsNotice, locale).toMatch(/cookie/i);
	});
});
