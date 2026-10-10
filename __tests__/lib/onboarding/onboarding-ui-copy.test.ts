import { describe, expect, it } from "vitest";

import {
	APPLY_ERROR_CODES,
	getOnboardingUiCopy,
	RESEND_ERROR_CODES,
	resolveApplyErrorCode,
	resolveResendErrorCode,
} from "@/lib/onboarding/onboarding-ui-copy";

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

describe("errores del paso 1", () => {
	it("cada código del alta y del reenvío tiene texto propio en los seis idiomas", () => {
		const es = getOnboardingUiCopy("es").form;
		for (const locale of LOCALES) {
			const form = getOnboardingUiCopy(locale).form;
			expect(Object.keys(form.errors).sort(), locale).toEqual([...APPLY_ERROR_CODES].sort());
			expect(Object.keys(form.resendErrors).sort(), locale).toEqual([...RESEND_ERROR_CODES].sort());
			const texts = [...Object.values(form.errors), ...Object.values(form.resendErrors), form.errorConnection];
			for (const text of texts) expect(text.trim(), locale).not.toBe("");
			if (locale !== "es") expect(form.errors.recaptcha_failed, locale).not.toBe(es.errors.recaptcha_failed);
		}
	});

	it("si reCAPTCHA rechaza, el texto ayuda a seguir en vez de culpar a la persona", () => {
		expect(getOnboardingUiCopy("es").form.errors.recaptcha_failed).toBe(
			"No pudimos comprobar que eres una persona. Recarga la página e inténtalo de nuevo.",
		);
		// Ya no se muestra el texto fijo del servicio.
		for (const locale of LOCALES) expect(getOnboardingUiCopy(locale).form.errors.recaptcha_failed, locale).not.toMatch(/fallida/i);
	});

	it("en español no hay exclamaciones, rayas ni la marca vieja", () => {
		const form = getOnboardingUiCopy("es").form;
		for (const text of [...Object.values(form.errors), ...Object.values(form.resendErrors), form.errorConnection]) {
			expect(text).not.toMatch(/¡|—|–|godcode/i);
		}
	});

	it("con «solo panel CEO» los errores no cambian", () => {
		for (const locale of LOCALES) {
			expect(getOnboardingUiCopy(locale, { panelOnly: true }).form.errors, locale).toEqual(getOnboardingUiCopy(locale).form.errors);
		}
	});

	it("usa el código de la respuesta y, si falta o es desconocido, el del status", () => {
		expect(resolveApplyErrorCode("recaptcha_failed", 400)).toBe("recaptcha_failed");
		expect(resolveApplyErrorCode("terms_required", 500)).toBe("terms_required");
		// El límite de la app y el servicio caído no traen código.
		expect(resolveApplyErrorCode(undefined, 429)).toBe("rate_limited");
		expect(resolveApplyErrorCode(undefined, 503)).toBe("server_error");
		expect(resolveApplyErrorCode("otro", 400)).toBe("server_error");
		expect(resolveApplyErrorCode(null, 502)).toBe("server_error");
		// Un código de la otra ruta no se cuela.
		expect(resolveApplyErrorCode("email_not_sent", 502)).toBe("server_error");

		expect(resolveResendErrorCode("email_not_sent", 502)).toBe("email_not_sent");
		expect(resolveResendErrorCode(undefined, 429)).toBe("rate_limited");
		expect(resolveResendErrorCode("recaptcha_failed", 400)).toBe("server_error");
		expect(resolveResendErrorCode(42, 500)).toBe("server_error");
	});
});

describe("lo que incluye la tienda en el paso 1", () => {
	// Los planes «solo menú digital» no traen caja: la lista del alta con tienda no puede
	// prometerla. Con «solo panel CEO» se muestra otra lista, la del panel.
	it("no promete caja en ningún idioma y nombra el panel CEO", () => {
		for (const locale of LOCALES) {
			const { start } = getOnboardingUiCopy(locale);
			const text = [start.includesTitle, ...start.includes].join(" ").toLowerCase();
			expect(text, locale).not.toMatch(/\bcaja\b|\bpos\b|\bcaixa\b|\bcaisse\b|\bkasse\b|\bcassa\b|todos los planes|every plan/);
			expect(text, locale).toContain("ceo");
		}
	});
});
