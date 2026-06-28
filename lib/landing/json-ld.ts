import type { PublicPlanForLanding } from "@/lib/plans/public-plans";
import { resolveRegionalPlanPrice } from "@/lib/plans/plan-regional-pricing";

import { LANDING_BRAND_ALTERNATE, LANDING_BRAND_NAME, LANDING_SUPPORT_EMAIL } from "./brand";
import type { LandingFaqItem } from "./faq";

type BuildLandingJsonLdInput = {
	base: string;
	faq: LandingFaqItem[];
	plans: PublicPlanForLanding[];
	country: string;
};

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

	const softwareApplication: Record<string, unknown> = {
		"@context": "https://schema.org",
		"@type": "SoftwareApplication",
		name: LANDING_BRAND_NAME,
		alternateName: LANDING_BRAND_ALTERNATE,
		url: base,
		applicationCategory: "BusinessApplication",
		operatingSystem: "Web",
		description:
			"Plataforma SaaS para crear tu tienda online con menú digital, carrito, delivery, caja, comandas e inventario. Sin comisiones por venta.",
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
			name: LANDING_BRAND_NAME,
			alternateName: LANDING_BRAND_ALTERNATE,
			url: base,
			description: `${LANDING_BRAND_NAME} - Crea tu tienda online en minutos`,
		},
		{
			"@context": "https://schema.org",
			"@type": "Organization",
			name: LANDING_BRAND_NAME,
			alternateName: LANDING_BRAND_ALTERNATE,
			url: base,
			contactPoint: {
				"@type": "ContactPoint",
				email: LANDING_SUPPORT_EMAIL,
				contactType: "customer support",
				availableLanguage: ["es", "en"],
			},
		},
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
	];
}
