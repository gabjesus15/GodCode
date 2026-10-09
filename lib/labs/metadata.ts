import type { Metadata } from "next";

import {
	LANDING_BRAND_ALTERNATE,
	LANDING_BRAND_NAME,
	LANDING_COMPANY_NAME,
	LANDING_PRODUCT_NAME,
} from "@/lib/landing/brand";
import { buildOrganizationJsonLd, getOrganizationId } from "@/lib/landing/json-ld";

import { LABS_FAQ, LABS_HOME, LABS_SERVICES, POS_PATH } from "./content";

/**
 * SEO de la home corporativa. Compite por la marca («Gcode Labs») y por
 * búsquedas de servicio con ciudad: desarrollo web Santiago, sistemas a medida
 * Chile. El título termina en el nombre de la empresa, que es el nombre del sitio.
 */
export const LABS_TITLE = `${LANDING_COMPANY_NAME}: desarrollo web y software a medida en Chile`;
// Los países son los mismos que nombran el intro, las preguntas frecuentes y los hechos de `content.ts`.
export const LABS_DESCRIPTION =
	`Estudio de desarrollo en Santiago. Sitios web, sistemas a medida, tiendas e integraciones para empresas de Chile, Venezuela y Estados Unidos. Creadores de ${LANDING_PRODUCT_NAME}.`;

export function buildLabsMetadata(base: string, path: string, options: { index: boolean }): Metadata {
	const url = `${base}${path}`;
	// La tarjeta del estudio, no la del producto (`app/api/system/og`, variante `labs`).
	const ogImage = { url: `${base}/api/system/og?v=labs`, width: 1200, height: 630, type: "image/png", alt: LABS_TITLE };

	return {
		metadataBase: new URL(base),
		title: { absolute: LABS_TITLE },
		description: LABS_DESCRIPTION,
		keywords: [
			"desarrollo web Santiago",
			"desarrollo web Chile",
			"agencia de desarrollo web Chile",
			"software a medida Chile",
			"sistemas a medida Santiago",
			"desarrollo de software Chile",
			"páginas web para empresas",
			"tienda online a medida",
			"estudio de desarrollo Chile",
			"desarrollo web Venezuela",
			LANDING_COMPANY_NAME,
			LANDING_BRAND_NAME,
			LANDING_BRAND_ALTERNATE,
		],
		alternates: { canonical: url, languages: { es: url, "x-default": url } },
		openGraph: {
			title: LABS_TITLE,
			description: LABS_DESCRIPTION,
			url,
			siteName: LANDING_COMPANY_NAME,
			locale: "es_CL",
			type: "website",
			images: [ogImage],
		},
		twitter: { card: "summary_large_image", title: LABS_TITLE, description: LABS_DESCRIPTION, images: [ogImage.url] },
		robots: options.index
			? { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 }
			: { index: false, follow: true },
	};
}

/**
 * Organization (mismo @id que el resto del sitio), la página, los servicios
 * ofrecidos y las preguntas frecuentes, con el mismo texto que el visible.
 */
export function buildLabsJsonLd(base: string, path: string): Record<string, unknown>[] {
	const url = `${base}${path}`;
	const organizationRef = { "@id": getOrganizationId(base) };
	const organization = {
		...buildOrganizationJsonLd(base),
		// Señales de empresa de servicios: qué hace y dónde.
		"@type": ["Organization", "ProfessionalService"],
		areaServed: [
			{ "@type": "Country", name: "Chile", identifier: "CL" },
			{ "@type": "Country", name: "Venezuela", identifier: "VE" },
			{ "@type": "Country", name: "Estados Unidos", identifier: "US" },
		],
		hasOfferCatalog: {
			"@type": "OfferCatalog",
			name: `Servicios de ${LANDING_COMPANY_NAME}`,
			itemListElement: LABS_SERVICES.map((service) => ({
				"@type": "Offer",
				itemOffered: {
					"@type": "Service",
					name: service.title,
					description: service.summary,
					url: `${url}#${service.id}`,
					provider: organizationRef,
				},
			})),
		},
		owns: {
			"@type": "SoftwareApplication",
			name: LANDING_PRODUCT_NAME,
			url: `${base}${POS_PATH}`,
			applicationCategory: "BusinessApplication",
			operatingSystem: "Web",
		},
	};

	return [
		organization,
		{
			"@context": "https://schema.org",
			"@type": "WebPage",
			"@id": `${url}#webpage`,
			url,
			name: LABS_TITLE,
			description: LABS_DESCRIPTION,
			inLanguage: "es",
			about: organizationRef,
			publisher: organizationRef,
		},
		{
			"@context": "https://schema.org",
			"@type": "FAQPage",
			mainEntity: LABS_FAQ.map((item) => ({
				"@type": "Question",
				name: item.question,
				acceptedAnswer: { "@type": "Answer", text: item.answer },
			})),
		},
	];
}

export { LABS_HOME };
