import type { Metadata } from "next";

import { LANDING_COMPANY_NAME, LANDING_PRODUCT_NAME } from "./brand";
import { marketingMetadata } from "./business-type-page";
import { type LandingFeature, LANDING_FEATURES } from "./features";
import { buildOrganizationJsonLd, getOrganizationId } from "./json-ld";
import { LANDING_FEATURES_PATH } from "./marketing-paths";

export const LANDING_FEATURES_INDEX_TITLE = `Funciones de ${LANDING_PRODUCT_NAME} para restaurantes`;
export const LANDING_FEATURES_INDEX_DESCRIPTION =
	"Sistema POS y caja, menú QR, pedidos online y por WhatsApp, delivery propio e inventario para restaurantes, en un solo panel y sin comisión por venta.";

export function getLandingFeaturePath(feature: Pick<LandingFeature, "slug">): string {
	return `${LANDING_FEATURES_PATH}/${feature.slug}`;
}

export function buildLandingFeatureMetadata(base: string, feature: LandingFeature): Metadata {
	return marketingMetadata(base, getLandingFeaturePath(feature), feature.metaTitle, feature.metaDescription, feature.keywords);
}

export function buildLandingFeaturesIndexMetadata(base: string): Metadata {
	return marketingMetadata(base, LANDING_FEATURES_PATH, LANDING_FEATURES_INDEX_TITLE, LANDING_FEATURES_INDEX_DESCRIPTION);
}

/** JSON-LD de una función: página, la función como parte del software, pasos, miga de pan y preguntas. */
export function buildLandingFeatureJsonLd(base: string, feature: LandingFeature): Record<string, unknown>[] {
	const url = `${base}${getLandingFeaturePath(feature)}`;
	const organizationRef = { "@id": getOrganizationId(base) };

	return [
		{
			"@context": "https://schema.org",
			"@type": "WebPage",
			"@id": `${url}#webpage`,
			url,
			name: feature.metaTitle,
			description: feature.metaDescription,
			inLanguage: "es",
			isPartOf: { "@type": "WebSite", url: base, name: LANDING_COMPANY_NAME },
			publisher: organizationRef,
			about: {
				"@type": "SoftwareApplication",
				name: LANDING_PRODUCT_NAME,
				applicationCategory: "BusinessApplication",
				operatingSystem: "Web",
				featureList: feature.guide.map((item) => item.title),
				url: `${base}/`,
				publisher: organizationRef,
			},
		},
		{
			"@context": "https://schema.org",
			"@type": "HowTo",
			name: `Cómo funciona: ${feature.label}`,
			step: feature.steps.map((step, index) => ({
				"@type": "HowToStep",
				position: index + 1,
				name: step.title,
				text: step.text,
			})),
		},
		{
			"@context": "https://schema.org",
			"@type": "BreadcrumbList",
			itemListElement: [
				{ "@type": "ListItem", position: 1, name: LANDING_PRODUCT_NAME, item: `${base}/` },
				{ "@type": "ListItem", position: 2, name: "Funciones", item: `${base}${LANDING_FEATURES_PATH}` },
				{ "@type": "ListItem", position: 3, name: feature.label, item: url },
			],
		},
		{
			"@context": "https://schema.org",
			"@type": "FAQPage",
			mainEntity: feature.faq.map((item) => ({
				"@type": "Question",
				name: item.question,
				acceptedAnswer: { "@type": "Answer", text: item.answer },
			})),
		},
		buildOrganizationJsonLd(base),
	];
}

export function buildLandingFeaturesIndexJsonLd(base: string): Record<string, unknown>[] {
	const url = `${base}${LANDING_FEATURES_PATH}`;
	return [
		{
			"@context": "https://schema.org",
			"@type": "CollectionPage",
			"@id": `${url}#webpage`,
			url,
			name: LANDING_FEATURES_INDEX_TITLE,
			description: LANDING_FEATURES_INDEX_DESCRIPTION,
			inLanguage: "es",
			publisher: { "@id": getOrganizationId(base) },
			mainEntity: {
				"@type": "ItemList",
				itemListElement: Object.values(LANDING_FEATURES).map((feature, index) => ({
					"@type": "ListItem",
					position: index + 1,
					name: feature.metaTitle,
					url: `${base}${getLandingFeaturePath(feature)}`,
				})),
			},
		},
		{
			"@context": "https://schema.org",
			"@type": "BreadcrumbList",
			itemListElement: [
				{ "@type": "ListItem", position: 1, name: LANDING_PRODUCT_NAME, item: `${base}/` },
				{ "@type": "ListItem", position: 2, name: "Funciones", item: url },
			],
		},
		buildOrganizationJsonLd(base),
	];
}
