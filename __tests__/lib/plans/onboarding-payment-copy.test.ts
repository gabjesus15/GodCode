import { describe, expect, it } from "vitest";

import { HERO_ASSURANCE_FIRST_PAYMENT_PROMO } from "@/lib/landing/hero-assurances";
import { getOnboardingPaymentCopy, type OnboardingPaymentLocale } from "@/lib/plans/onboarding-payment-copy";

const LOCALES: OnboardingPaymentLocale[] = ["es", "en", "pt", "fr", "de", "it"];

describe("pago del alta: la promo del primer pago", () => {
	it("tiene un solo nombre, el mismo del landing", () => {
		const es = getOnboardingPaymentCopy("es");
		expect(es.promoTitle).toBe(HERO_ASSURANCE_FIRST_PAYMENT_PROMO);
		expect(es.promoDescription).toBe("Pagas {paid} y recibes {granted}.");
		expect(es.ui.promoMonths).toBe("Recibes {months}");
	});

	it.each(LOCALES)("%s: mismos marcadores y ningún resto de «+1 mes gratis»", (locale) => {
		const copy = getOnboardingPaymentCopy(locale);
		expect(copy.promoTitle).toMatch(/^2 /);
		expect(copy.promoDescription).toContain("{paid}");
		expect(copy.promoDescription).toContain("{granted}");
		expect(copy.ui.promoMonths).toContain("{months}");
		// El cupón que la reemplaza la nombra igual que el título.
		expect(copy.coupon.replacesPromo).toContain(copy.promoTitle);
		expect([copy.promoTitle, copy.promoDescription, copy.ui.promoMonths, copy.coupon.replacesPromo].join(" ")).not.toContain("+1");
	});
});

describe("pago del alta: tienda ya armada («Arma y paga»)", () => {
	it("los pasos en español son los acordados", () => {
		expect(getOnboardingPaymentCopy("es").draft.nextSteps).toEqual([
			"Validamos el pago",
			"Tu tienda se publica sola, con todo lo que armaste",
			"Compartes tu link",
		]);
	});

	it.each(LOCALES)("%s: habla de publicar la tienda, no de contraseñas", (locale) => {
		const { draft } = getOnboardingPaymentCopy(locale);
		expect(draft.nextSteps).toHaveLength(3);
		const text = [
			draft.title,
			...draft.nextSteps,
			draft.instantActivation,
			draft.manualActivation,
			draft.mercadoPagoHint,
			draft.freeCheckout,
			draft.freeButton,
		]
			.join(" ")
			.toLowerCase();
		expect(text).not.toMatch(/contraseña|password|senha|mot de passe|passwort/);
		for (const value of Object.values(draft).flat()) expect(String(value).trim()).not.toBe("");
	});

	it("en español no promete activar una cuenta: la cuenta ya existe", () => {
		const { draft } = getOnboardingPaymentCopy("es");
		const text = [draft.title, ...draft.nextSteps, draft.instantActivation, draft.manualActivation, draft.mercadoPagoHint, draft.freeCheckout, draft.freeButton].join(" ");
		expect(text).not.toMatch(/activ|cuenta/i);
	});
});

describe("pago del alta: «solo panel CEO»", () => {
	it("en español el último paso es entrar al panel", () => {
		expect(getOnboardingPaymentCopy("es").ui.panelOnlyNextSteps).toEqual([
			"Confirmamos tu pago",
			"Te llega un correo para crear tu contraseña",
			"Entras a tu panel CEO",
		]);
	});

	it.each(LOCALES)("%s: tres pasos que no hablan del menú ni de una tienda", (locale) => {
		const { ui } = getOnboardingPaymentCopy(locale);
		expect(ui.panelOnlyNextSteps).toHaveLength(3);
		const text = ui.panelOnlyNextSteps.join(" ").toLowerCase();
		expect(text).not.toMatch(/menú|menu|cardápio|speisekarte|tienda|store|loja|boutique|shop|negozio/);
		expect(text).toContain("ceo");
		// Pagar y crear la contraseña son iguales con o sin tienda.
		expect(ui.panelOnlyNextSteps.slice(0, 2)).toEqual(ui.nextSteps.slice(0, 2));
	});
});
