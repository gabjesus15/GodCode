import { createElement, type ComponentProps, type ComponentType, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import { shouldAskAffiliation } from "@/components/tenant/cart/utils/affiliation";
import { CartAffiliationBody, CartAffiliationFoot } from "@/components/tenant/cart/views/cart-affiliation-step";
import type { AppLocale } from "@/lib/i18n/config";
import { getMessagesForLocale } from "@/lib/i18n/messages";

const COMPANY = "8530d8ba-4058-41ca-9544-266cfd43bd52";
const neverChose = () => false;
const noop = () => {};

const guestOnPanel = {
	offerAccount: true,
	isGuest: true,
	companyId: COMPANY,
	orderChannel: "both" as const,
	chosenGuestThisVisit: neverChose,
};

describe("¿Estás afiliado? — a quién se le pregunta", () => {
	it("a quien la API confirmó sin sesión, con pedido que llega al panel", () => {
		expect(shouldAskAffiliation(guestOnPanel)).toBe(true);
		expect(shouldAskAffiliation({ ...guestOnPanel, orderChannel: "panel_only" })).toBe(true);
	});

	it("nunca a quien tiene sesión, ni mientras el perfil carga o si la petición falló", () => {
		expect(shouldAskAffiliation({ ...guestOnPanel, isGuest: false })).toBe(false);
	});

	it("no si Mi Cuenta está apagada o el país no pide documento", () => {
		expect(shouldAskAffiliation({ ...guestOnPanel, offerAccount: false })).toBe(false);
	});

	it("no en pedidos solo por WhatsApp o demo: no suman puntos", () => {
		expect(shouldAskAffiliation({ ...guestOnPanel, orderChannel: "whatsapp_only" })).toBe(false);
		expect(shouldAskAffiliation({ ...guestOnPanel, orderChannel: "demo" })).toBe(false);
	});

	it("no sin negocio ni a quien ya dijo \"No\" en esta visita", () => {
		expect(shouldAskAffiliation({ ...guestOnPanel, companyId: null })).toBe(false);
		expect(shouldAskAffiliation({ ...guestOnPanel, chosenGuestThisVisit: (id) => id === COMPANY })).toBe(false);
	});
});

const IntlProvider = NextIntlClientProvider as ComponentType<
	Omit<ComponentProps<typeof NextIntlClientProvider>, "children"> & { children?: ReactNode }
>;

function render(node: ReactNode, locale: AppLocale = "es"): string {
	return renderToStaticMarkup(createElement(IntlProvider, { locale, messages: getMessagesForLocale(locale) }, node));
}

describe("¿Estás afiliado? — pantalla", () => {
	it("pregunta con el nombre del negocio y ofrece entrar, seguir como invitado o crear cuenta", () => {
		const body = render(createElement(CartAffiliationBody, { businessName: "Oishi Sushi" }));
		expect(body).toContain("¿Estás afiliado?");
		expect(body).toContain("Si tienes cuenta en Oishi Sushi, entra y este pedido suma puntos.");

		const foot = render(
			createElement(CartAffiliationFoot, { onSignIn: noop, onContinueAsGuest: noop, onRegister: noop }),
		);
		expect(foot).toContain("Sí, iniciar sesión");
		expect(foot).toContain("No, seguir como invitado");
		expect(foot).toContain("¿No tienes cuenta? Créala y suma puntos");
	});

	it("sin nombre de negocio usa el texto genérico", () => {
		expect(render(createElement(CartAffiliationBody, { businessName: "  " }))).toContain(
			"Si tienes cuenta, entra y este pedido suma puntos.",
		);
	});

	it.each<AppLocale>(["en", "pt", "it", "fr", "de"])("tiene textos en %s", (locale) => {
		const html = render(
			createElement(CartAffiliationFoot, { onSignIn: noop, onContinueAsGuest: noop, onRegister: noop }),
			locale,
		);
		expect(html).not.toContain("tenant.cart.modal");
		expect(html).not.toContain("affiliation.");
	});
});
