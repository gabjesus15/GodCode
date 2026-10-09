import type { Metadata } from "next";

import { LANDING_COMPANY_NAME, LANDING_PRODUCT_NAME } from "./brand";
import { type LandingCountry, type LandingCountrySlug, LANDING_COUNTRIES } from "./countries";
import { buildOrganizationJsonLd, getOrganizationId } from "./json-ld";

export function getLandingCountryPath(slug: LandingCountrySlug): string {
	return `/${slug}`;
}

/** Metadatos de una página de país: canónica propia, sin hreflang (es una sola lengua). */
export function buildLandingCountryMetadata(base: string, country: LandingCountry): Metadata {
	const url = `${base}${getLandingCountryPath(country.slug)}`;
	const ogImage = {
		url: `${base}/api/system/og`,
		width: 1200,
		height: 630,
		type: "image/png",
		alt: country.metaTitle,
	};

	return {
		metadataBase: new URL(base),
		// La plantilla raíz añade "· Gcode Labs".
		title: country.metaTitle,
		description: country.metaDescription,
		keywords: country.keywords,
		alternates: { canonical: url },
		openGraph: {
			title: country.metaTitle,
			description: country.metaDescription,
			url,
			siteName: LANDING_COMPANY_NAME,
			locale: `es_${country.code}`,
			type: "website",
			images: [ogImage],
		},
		twitter: {
			card: "summary_large_image",
			title: country.metaTitle,
			description: country.metaDescription,
			images: [ogImage.url],
		},
		robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
	};
}

/**
 * JSON-LD de una página de país: el servicio con su zona de cobertura, la miga
 * de pan, las preguntas frecuentes (mismo texto que el visible) y la organización
 * a la que apuntan `publisher` y `provider` (mismo `@id` que la home).
 */
export function buildLandingCountryJsonLd(base: string, country: LandingCountry): Record<string, unknown>[] {
	const url = `${base}${getLandingCountryPath(country.slug)}`;
	const organizationRef = { "@id": getOrganizationId(base) };

	return [
		{
			"@context": "https://schema.org",
			"@type": "WebPage",
			"@id": `${url}#webpage`,
			url,
			name: country.metaTitle,
			description: country.metaDescription,
			inLanguage: "es",
			isPartOf: { "@type": "WebSite", url: base, name: LANDING_COMPANY_NAME },
			about: { "@type": "Country", name: country.name },
			publisher: organizationRef,
		},
		{
			"@context": "https://schema.org",
			"@type": "Service",
			name: `${LANDING_PRODUCT_NAME} en ${country.name}`,
			serviceType: "Menú digital, pedidos online y punto de venta para restaurantes",
			description: country.metaDescription,
			url,
			provider: organizationRef,
			areaServed: [
				{ "@type": "Country", name: country.name, identifier: country.code },
				...country.cities.map((city) => ({ "@type": "City", name: city })),
			],
			audience: { "@type": "BusinessAudience", name: `Restaurantes en ${country.name}` },
			availableChannel: {
				"@type": "ServiceChannel",
				serviceUrl: `${base}/onboarding`,
				availableLanguage: ["es"],
			},
		},
		{
			"@context": "https://schema.org",
			"@type": "BreadcrumbList",
			itemListElement: [
				{ "@type": "ListItem", position: 1, name: LANDING_PRODUCT_NAME, item: `${base}/` },
				{ "@type": "ListItem", position: 2, name: country.name, item: url },
			],
		},
		{
			"@context": "https://schema.org",
			"@type": "FAQPage",
			mainEntity: country.faq.map((item) => ({
				"@type": "Question",
				name: item.question,
				acceptedAnswer: { "@type": "Answer", text: item.answer },
			})),
		},
		// Sin este nodo, las referencias a #organization de arriba quedan colgando.
		buildOrganizationJsonLd(base),
	];
}

export { LANDING_COUNTRIES };
