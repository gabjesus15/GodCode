import { createElement, type ComponentProps, type ComponentType, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import AppError from "@/app/error";
import TenantPageError from "@/app/[subdomain]/error";
import { getMessagesForLocale } from "@/lib/i18n/messages";
import { SUPPORTED_LOCALES, type AppLocale } from "@/lib/i18n/config";

type ErrorPageProps = { error: Error & { digest?: string }; unstable_retry: () => void };

// Los hijos van como tercer argumento de createElement (react/no-children-prop); el tipo del
// proveedor los pide en las props, así que aquí se declaran opcionales.
const IntlProvider = NextIntlClientProvider as ComponentType<
	Omit<ComponentProps<typeof NextIntlClientProvider>, "children"> & { children?: ReactNode }
>;

function render(Page: ComponentType<ErrorPageProps>, locale: AppLocale) {
	const props: ErrorPageProps = { error: Object.assign(new Error("boom"), { digest: "123" }), unstable_retry: () => {} };
	return renderToStaticMarkup(
		createElement(IntlProvider, { locale, messages: getMessagesForLocale(locale) }, createElement(Page, props)),
	);
}

describe("páginas de error (app/error.tsx y la de las tiendas)", () => {
	it("la de la tienda usa sus colores y ofrece reintentar, en el idioma de la tienda", () => {
		const html = render(TenantPageError, "es");
		expect(html).toContain('class="tenant-error"');
		expect(html).toContain("No pudimos cargar esta página");
		expect(html).toContain(">Intentar de nuevo</button>");
		// Nada técnico a la vista del cliente: ni el mensaje del error ni su código.
		expect(html).not.toContain("boom");
		expect(html).not.toContain("123");

		expect(render(TenantPageError, "pt")).toContain(">Tentar de novo</button>");
	});

	it("la general tampoco muestra el error y ofrece reintentar", () => {
		const html = render(AppError, "de");
		expect(html).toContain("Diese Seite konnte nicht geladen werden");
		expect(html).toContain(">Erneut versuchen</button>");
		expect(html).not.toContain("boom");
	});

	it("los seis idiomas traen los tres textos", () => {
		for (const locale of SUPPORTED_LOCALES) {
			const page = getMessagesForLocale(locale).common.errorPage;
			for (const key of ["title", "body", "retry"] as const) {
				expect(page[key], `${locale}.${key}`).toMatch(/\S/);
			}
		}
	});
});
