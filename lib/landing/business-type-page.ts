import type { Metadata } from "next";

import { buildSampleMenu } from "@/lib/menu/sample-menus";

import { LANDING_COMPANY_NAME, LANDING_PRODUCT_NAME } from "./brand";
import { type LandingBusinessType, LANDING_BUSINESS_TYPES } from "./business-types";
import { buildOrganizationJsonLd, getOrganizationId } from "./json-ld";
import { LANDING_BUSINESS_TYPES_PATH } from "./marketing-paths";

export const LANDING_BUSINESS_TYPES_INDEX_TITLE = "Menú digital por tipo de negocio";
export const LANDING_BUSINESS_TYPES_INDEX_DESCRIPTION =
	"Menú digital, pedidos online y caja para pizzerías, sushi, hamburgueserías, comida rápida, restaurantes, cafeterías y panaderías, con un menú de ejemplo de cada rubro.";

export function getLandingBusinessTypePath(type: Pick<LandingBusinessType, "slug">): string {
	return `${LANDING_BUSINESS_TYPES_PATH}/${type.slug}`;
}

function ogImage(base: string, alt: string) {
	return { url: `${base}/api/system/og`, width: 1200, height: 630, type: "image/png", alt };
}

export function marketingMetadata(base: string, path: string, title: string, description: string, keywords?: string[]): Metadata {
	const url = `${base}${path}`;
	const image = ogImage(base, title);
	return {
		metadataBase: new URL(base),
		// La plantilla raíz añade "· Gcode Labs".
		title,
		description,
		...(keywords ? { keywords } : {}),
		alternates: { canonical: url },
		openGraph: { title, description, url, siteName: LANDING_COMPANY_NAME, locale: "es_LA", type: "website", images: [image] },
		twitter: { card: "summary_large_image", title, description, images: [image.url] },
		robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
	};
}

export function buildLandingBusinessTypeMetadata(base: string, type: LandingBusinessType): Metadata {
	return marketingMetadata(base, getLandingBusinessTypePath(type), type.metaTitle, type.metaDescription, type.keywords);
}

export function buildLandingBusinessTypesIndexMetadata(base: string): Metadata {
	return marketingMetadata(base, LANDING_BUSINESS_TYPES_PATH, LANDING_BUSINESS_TYPES_INDEX_TITLE, LANDING_BUSINESS_TYPES_INDEX_DESCRIPTION);
}

/**
 * Lo que trae la tienda al nacer para este rubro: las categorías y productos de ejemplo
 * del alta, sin precios (se convierten a la moneda del negocio y el dueño los cambia).
 * Es la prueba de que la página no es genérica: el menú de ejemplo es distinto por rubro.
 */
export function getBusinessTypeSampleMenu(type: LandingBusinessType): { name: string; products: { name: string; description: string }[] }[] {
	return buildSampleMenu(type.sector, "USD").categories.map((category) => ({
		name: category.name,
		products: category.products.map((product) => ({
			name: product.name,
			description: capitalize(product.description.replace(/^Ejemplo:\s*/i, "")),
		})),
	}));
}

function capitalize(text: string): string {
	return text.charAt(0).toLocaleUpperCase("es") + text.slice(1);
}

/** JSON-LD de un tipo de negocio: página, servicio, miga de pan, preguntas y organización. */
export function buildLandingBusinessTypeJsonLd(base: string, type: LandingBusinessType): Record<string, unknown>[] {
	const url = `${base}${getLandingBusinessTypePath(type)}`;
	const organizationRef = { "@id": getOrganizationId(base) };

	return [
		{
			"@context": "https://schema.org",
			"@type": "WebPage",
			"@id": `${url}#webpage`,
			url,
			name: type.metaTitle,
			description: type.metaDescription,
			inLanguage: "es",
			isPartOf: { "@type": "WebSite", url: base, name: LANDING_COMPANY_NAME },
			publisher: organizationRef,
		},
		{
			"@context": "https://schema.org",
			"@type": "Service",
			name: `${LANDING_PRODUCT_NAME} para ${type.plural}`,
			serviceType: "Menú digital, pedidos online y punto de venta",
			description: type.metaDescription,
			url,
			provider: organizationRef,
			audience: { "@type": "BusinessAudience", name: type.label },
			availableChannel: { "@type": "ServiceChannel", serviceUrl: `${base}/onboarding`, availableLanguage: ["es"] },
		},
		{
			"@context": "https://schema.org",
			"@type": "BreadcrumbList",
			itemListElement: [
				{ "@type": "ListItem", position: 1, name: LANDING_PRODUCT_NAME, item: `${base}/` },
				{ "@type": "ListItem", position: 2, name: LANDING_BUSINESS_TYPES_INDEX_TITLE, item: `${base}${LANDING_BUSINESS_TYPES_PATH}` },
				{ "@type": "ListItem", position: 3, name: type.label, item: url },
			],
		},
		{
			"@context": "https://schema.org",
			"@type": "FAQPage",
			mainEntity: type.faq.map((item) => ({
				"@type": "Question",
				name: item.question,
				acceptedAnswer: { "@type": "Answer", text: item.answer },
			})),
		},
		// Sin este nodo, las referencias a #organization de arriba quedan colgando.
		buildOrganizationJsonLd(base),
	];
}

/** JSON-LD del índice: la lista de tipos de negocio (enlaza cada página) y la miga de pan. */
export function buildLandingBusinessTypesIndexJsonLd(base: string): Record<string, unknown>[] {
	const url = `${base}${LANDING_BUSINESS_TYPES_PATH}`;
	return [
		{
			"@context": "https://schema.org",
			"@type": "CollectionPage",
			"@id": `${url}#webpage`,
			url,
			name: LANDING_BUSINESS_TYPES_INDEX_TITLE,
			description: LANDING_BUSINESS_TYPES_INDEX_DESCRIPTION,
			inLanguage: "es",
			publisher: { "@id": getOrganizationId(base) },
			mainEntity: {
				"@type": "ItemList",
				itemListElement: Object.values(LANDING_BUSINESS_TYPES).map((type, index) => ({
					"@type": "ListItem",
					position: index + 1,
					name: type.metaTitle,
					url: `${base}${getLandingBusinessTypePath(type)}`,
				})),
			},
		},
		{
			"@context": "https://schema.org",
			"@type": "BreadcrumbList",
			itemListElement: [
				{ "@type": "ListItem", position: 1, name: LANDING_PRODUCT_NAME, item: `${base}/` },
				{ "@type": "ListItem", position: 2, name: LANDING_BUSINESS_TYPES_INDEX_TITLE, item: url },
			],
		},
		buildOrganizationJsonLd(base),
	];
}
