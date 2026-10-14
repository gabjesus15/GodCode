import type { Metadata } from "next";

import { LANDING_COMPANY_NAME, LANDING_PRODUCT_NAME } from "./brand";
import { LANDING_ENGLISH_HOME, LANDING_ENGLISH_PAGES, type LandingEnglishPage } from "./english-pages";
import { buildOrganizationJsonLd, getOrganizationId } from "./json-ld";
import { LANDING_ENGLISH_PATH } from "./marketing-paths";

/** La página en español de /en: la de Estados Unidos. */
export const ENGLISH_HOME_SPANISH_PATH = "/estados-unidos";

export function getEnglishPagePath(page: Pick<LandingEnglishPage, "slug">): string {
	return `${LANDING_ENGLISH_PATH}/${page.slug}`;
}

/**
 * hreflang entre una página en español y su par en inglés. Google pide que el enlace sea
 * recíproco: la española también tiene que apuntar a la inglesa (`englishAlternateFor`).
 */
function languages(base: string, englishPath: string, spanishPath: string) {
	return { en: `${base}${englishPath}`, es: `${base}${spanishPath}`, "x-default": `${base}${spanishPath}` };
}

/** Si una página en español tiene su versión en inglés, la ruta de esa versión. */
export function englishAlternateFor(spanishPath: string): string | null {
	if (spanishPath === ENGLISH_HOME_SPANISH_PATH) return LANDING_ENGLISH_PATH;
	const page = Object.values(LANDING_ENGLISH_PAGES).find((candidate) => candidate.spanishPath === spanishPath);
	return page ? getEnglishPagePath(page) : null;
}

/** `alternates.languages` para una página en español que tiene par en inglés (o nada). */
export function spanishPageLanguages(base: string, spanishPath: string): Record<string, string> | undefined {
	const english = englishAlternateFor(spanishPath);
	return english ? languages(base, english, spanishPath) : undefined;
}

function englishMetadata(base: string, path: string, spanishPath: string, title: string, description: string, keywords?: string[]): Metadata {
	const url = `${base}${path}`;
	const image = { url: `${base}/api/system/og`, width: 1200, height: 630, type: "image/png", alt: title };
	return {
		metadataBase: new URL(base),
		title,
		description,
		...(keywords ? { keywords } : {}),
		alternates: { canonical: url, languages: languages(base, path, spanishPath) },
		openGraph: { title, description, url, siteName: LANDING_COMPANY_NAME, locale: "en_US", type: "website", images: [image] },
		twitter: { card: "summary_large_image", title, description, images: [image.url] },
		robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
	};
}

export function buildEnglishPageMetadata(base: string, page: LandingEnglishPage): Metadata {
	return englishMetadata(base, getEnglishPagePath(page), page.spanishPath, page.metaTitle, page.metaDescription, page.keywords);
}

export function buildEnglishHomeMetadata(base: string): Metadata {
	const home = LANDING_ENGLISH_HOME;
	return englishMetadata(base, LANDING_ENGLISH_PATH, ENGLISH_HOME_SPANISH_PATH, home.metaTitle, home.metaDescription);
}

function faqNode(items: readonly { question: string; answer: string }[]) {
	return {
		"@context": "https://schema.org",
		"@type": "FAQPage",
		inLanguage: "en",
		mainEntity: items.map((item) => ({
			"@type": "Question",
			name: item.question,
			acceptedAnswer: { "@type": "Answer", text: item.answer },
		})),
	};
}

export function buildEnglishPageJsonLd(base: string, page: LandingEnglishPage): Record<string, unknown>[] {
	const url = `${base}${getEnglishPagePath(page)}`;
	const organizationRef = { "@id": getOrganizationId(base) };
	return [
		{
			"@context": "https://schema.org",
			"@type": "WebPage",
			"@id": `${url}#webpage`,
			url,
			name: page.metaTitle,
			description: page.metaDescription,
			inLanguage: "en",
			publisher: organizationRef,
			about: {
				"@type": "SoftwareApplication",
				name: LANDING_PRODUCT_NAME,
				applicationCategory: "BusinessApplication",
				operatingSystem: "Web",
				featureList: page.guide.map((item) => item.title),
			},
		},
		{
			"@context": "https://schema.org",
			"@type": "HowTo",
			name: `How it works: ${page.label}`,
			inLanguage: "en",
			step: page.steps.map((step, index) => ({ "@type": "HowToStep", position: index + 1, name: step.title, text: step.text })),
		},
		{
			"@context": "https://schema.org",
			"@type": "BreadcrumbList",
			itemListElement: [
				{ "@type": "ListItem", position: 1, name: LANDING_PRODUCT_NAME, item: `${base}${LANDING_ENGLISH_PATH}` },
				{ "@type": "ListItem", position: 2, name: page.label, item: url },
			],
		},
		faqNode(page.faq),
		buildOrganizationJsonLd(base),
	];
}

export function buildEnglishHomeJsonLd(base: string): Record<string, unknown>[] {
	const url = `${base}${LANDING_ENGLISH_PATH}`;
	return [
		{
			"@context": "https://schema.org",
			"@type": "WebPage",
			"@id": `${url}#webpage`,
			url,
			name: LANDING_ENGLISH_HOME.metaTitle,
			description: LANDING_ENGLISH_HOME.metaDescription,
			inLanguage: "en",
			publisher: { "@id": getOrganizationId(base) },
		},
		faqNode(LANDING_ENGLISH_HOME.faq),
		buildOrganizationJsonLd(base),
	];
}
