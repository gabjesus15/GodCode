import type { Metadata } from "next";

import { LANDING_COMPANY_NAME } from "@/lib/landing/brand";
import { buildOrganizationJsonLd, getOrganizationId } from "@/lib/landing/json-ld";

import type { LabsProject, LabsService } from "./content";
import { LABS_COST_GUIDE, LABS_COST_GUIDE_PATH, LABS_PATH, labsProjectPath, labsServicePath, type LabsProjectPage, type LabsServicePage } from "./pages";

/** Metadatos de una página del estudio: canónica propia y la tarjeta de Labs al compartir. */
function labsPageMetadata(base: string, path: string, title: string, description: string, keywords?: string[], type: "website" | "article" = "website"): Metadata {
	const url = `${base}${path}`;
	const image = { url: `${base}/api/system/og?v=labs`, width: 1200, height: 630, type: "image/png", alt: title };
	return {
		metadataBase: new URL(base),
		// La plantilla raíz añade «· Gcode Labs».
		title,
		description,
		...(keywords ? { keywords } : {}),
		alternates: { canonical: url },
		openGraph: { title, description, url, siteName: LANDING_COMPANY_NAME, locale: "es_CL", type, images: [image] },
		twitter: { card: "summary_large_image", title, description, images: [image.url] },
		robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
	};
}

export function buildLabsServiceMetadata(base: string, page: LabsServicePage): Metadata {
	return labsPageMetadata(base, labsServicePath(page.id), page.metaTitle, page.metaDescription, page.keywords);
}

export function buildLabsProjectMetadata(base: string, page: LabsProjectPage): Metadata {
	return labsPageMetadata(base, labsProjectPath(page.slug), page.metaTitle, page.metaDescription, undefined, "article");
}

export function buildLabsCostGuideMetadata(base: string): Metadata {
	return labsPageMetadata(base, LABS_COST_GUIDE_PATH, LABS_COST_GUIDE.metaTitle, LABS_COST_GUIDE.metaDescription, undefined, "article");
}

function breadcrumb(base: string, items: { name: string; path: string }[]) {
	return {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: [{ name: LANDING_COMPANY_NAME, path: LABS_PATH }, ...items].map((item, index) => ({
			"@type": "ListItem",
			position: index + 1,
			name: item.name,
			item: `${base}${item.path}`,
		})),
	};
}

function faq(items: readonly { question: string; answer: string }[]) {
	return {
		"@context": "https://schema.org",
		"@type": "FAQPage",
		mainEntity: items.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })),
	};
}

export function buildLabsServiceJsonLd(base: string, page: LabsServicePage, service: LabsService): Record<string, unknown>[] {
	const url = `${base}${labsServicePath(page.id)}`;
	const organizationRef = { "@id": getOrganizationId(base) };
	return [
		{
			"@context": "https://schema.org",
			"@type": "Service",
			"@id": `${url}#service`,
			name: service.title,
			serviceType: page.metaTitle,
			description: page.metaDescription,
			url,
			provider: organizationRef,
			areaServed: [
				{ "@type": "Country", name: "Chile" },
				{ "@type": "Country", name: "Venezuela" },
				{ "@type": "Country", name: "Estados Unidos" },
			],
			hasOfferCatalog: {
				"@type": "OfferCatalog",
				name: `Qué incluye: ${service.title}`,
				itemListElement: service.deliverables.map((item) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: item } })),
			},
		},
		breadcrumb(base, [{ name: service.title, path: labsServicePath(page.id) }]),
		faq(page.faq),
		buildOrganizationJsonLd(base),
	];
}

export function buildLabsProjectJsonLd(base: string, page: LabsProjectPage, project: LabsProject): Record<string, unknown>[] {
	const url = `${base}${labsProjectPath(page.slug)}`;
	const organizationRef = { "@id": getOrganizationId(base) };
	return [
		{
			"@context": "https://schema.org",
			"@type": "Article",
			"@id": `${url}#article`,
			headline: page.metaTitle,
			description: page.metaDescription,
			url,
			inLanguage: "es",
			author: organizationRef,
			publisher: organizationRef,
			...(project.image ? { image: `${base}${project.image.src}` } : {}),
			about: {
				"@type": "CreativeWork",
				name: project.name,
				...(project.href?.startsWith("http") ? { url: project.href } : {}),
				creator: organizationRef,
			},
		},
		breadcrumb(base, [{ name: project.name, path: labsProjectPath(page.slug) }]),
		buildOrganizationJsonLd(base),
	];
}

export function buildLabsCostGuideJsonLd(base: string): Record<string, unknown>[] {
	const url = `${base}${LABS_COST_GUIDE_PATH}`;
	const organizationRef = { "@id": getOrganizationId(base) };
	return [
		{
			"@context": "https://schema.org",
			"@type": "Article",
			"@id": `${url}#article`,
			headline: LABS_COST_GUIDE.h1,
			description: LABS_COST_GUIDE.metaDescription,
			url,
			inLanguage: "es",
			author: organizationRef,
			publisher: organizationRef,
		},
		breadcrumb(base, [{ name: "¿Cuánto cuesta una página web?", path: LABS_COST_GUIDE_PATH }]),
		faq(LABS_COST_GUIDE.faq),
		buildOrganizationJsonLd(base),
	];
}
