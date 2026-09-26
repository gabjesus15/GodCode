import type { PublicPlanForLanding } from "@/lib/plans/public-plans";
import { resolveRegionalPlanPrice } from "@/lib/plans/plan-regional-pricing";

import {
	LANDING_BRAND_ALTERNATE,
	LANDING_BRAND_ALTERNATE_NAMES,
	LANDING_BRAND_NAME,
	LANDING_COMPANY_ADDRESS,
	LANDING_COMPANY_DESCRIPTION,
	LANDING_COMPANY_NAME,
	LANDING_PRODUCT_NAME,
	LANDING_SUPPORT_EMAIL,
} from "./brand";
import { getLandingOrganizationSameAs } from "./contact";
import { buildDemoVideosJsonLd } from "./demo-videos";
import type { LandingFaqItem } from "./faq";

type BuildLandingJsonLdInput = {
	base: string;
	faq: LandingFaqItem[];
	plans: PublicPlanForLanding[];
	country: string;
};

/** Identificador estable de la empresa para enlazar nodos entre páginas. */
export function getOrganizationId(base: string): string {
	return `${base}/#organization`;
}

/**
 * Nodo Organization compartido por home y página "Sobre".
 *
 * Mismo `@id`, mismo nombre y mismas variantes en todas las páginas: Google
 * necesita señales consistentes para aceptar "Gcode Labs" como nombre del
 * sitio en vez de caer al dominio.
 */
export function buildOrganizationJsonLd(base: string): Record<string, unknown> {
	const sameAs = getLandingOrganizationSameAs();

	return {
		"@context": "https://schema.org",
		"@type": "Organization",
		"@id": getOrganizationId(base),
		name: LANDING_COMPANY_NAME,
		alternateName: [...LANDING_BRAND_ALTERNATE_NAMES],
		legalName: LANDING_COMPANY_NAME,
		url: base,
		description: LANDING_COMPANY_DESCRIPTION,
		logo: {
			"@type": "ImageObject",
			url: `${base}/logo.png`,
		},
		address: {
			"@type": "PostalAddress",
			...LANDING_COMPANY_ADDRESS,
		},
		knowsAbout: [
			"desarrollo web",
			"sistemas a medida",
			"menú digital para restaurantes",
			"pedidos online",
			"punto de venta",
		],
		...(sameAs.length > 0 ? { sameAs } : {}),
		contactPoint: {
			"@type": "ContactPoint",
			email: LANDING_SUPPORT_EMAIL,
			contactType: "customer support",
			availableLanguage: ["es", "en"],
		},
	};
}

function getLowestPlanOffer(
	plans: PublicPlanForLanding[],
	country: string,
): { lowPrice: number; priceCurrency: string } | null {
	let lowest: { lowPrice: number; priceCurrency: string } | null = null;

	for (const plan of plans) {
		const { price, currency } = resolveRegionalPlanPrice(plan, country);
		if (!Number.isFinite(price) || price <= 0) continue;
		if (!lowest || price < lowest.lowPrice) {
			lowest = { lowPrice: price, priceCurrency: currency };
		}
	}

	return lowest;
}

export function buildLandingJsonLd({ base, faq, plans, country }: BuildLandingJsonLdInput) {
	const offer = getLowestPlanOffer(plans, country);

	const logoUrl = `${base}/logo.png`;
	const organizationRef = { "@id": getOrganizationId(base) };

	const softwareApplication: Record<string, unknown> = {
		"@context": "https://schema.org",
		"@type": "SoftwareApplication",
		name: LANDING_PRODUCT_NAME,
		alternateName: [LANDING_BRAND_NAME, LANDING_BRAND_ALTERNATE],
		url: base,
		image: logoUrl,
		applicationCategory: "BusinessApplication",
		operatingSystem: "Web",
		description:
			`${LANDING_PRODUCT_NAME} es la plataforma SaaS de ${LANDING_COMPANY_NAME} para crear tu tienda online con menú digital, carrito, delivery, caja, comandas e inventario. Sin comisiones por venta.`,
		author: organizationRef,
		publisher: organizationRef,
	};

	if (offer) {
		softwareApplication.offers = {
			"@type": "AggregateOffer",
			lowPrice: String(offer.lowPrice),
			priceCurrency: offer.priceCurrency,
			offerCount: plans.length,
			description: "Planes de suscripción mensual sin comisiones por venta",
		};
	}

	return [
		softwareApplication,
		{
			"@context": "https://schema.org",
			"@type": "WebSite",
			name: LANDING_COMPANY_NAME,
			alternateName: [...LANDING_BRAND_ALTERNATE_NAMES],
			url: base,
			description: `${LANDING_PRODUCT_NAME} por ${LANDING_COMPANY_NAME}: crea tu tienda online en minutos`,
			publisher: organizationRef,
		},
		buildOrganizationJsonLd(base),
		{
			"@context": "https://schema.org",
			"@type": "FAQPage",
			mainEntity: faq.map((item) => ({
				"@type": "Question",
				name: item.question,
				acceptedAnswer: {
					"@type": "Answer",
					text: item.answer,
				},
			})),
		},
		// Los videos de «Míralo funcionando»: pueden aparecer en resultados y en la pestaña Videos.
		...buildDemoVideosJsonLd(base, getOrganizationId(base)),
	];
}
