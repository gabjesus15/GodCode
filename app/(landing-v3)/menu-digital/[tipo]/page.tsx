import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { BusinessTypeLanding } from "@/components/landing-v3/business-type-landing";
import { getCountryFromHeaders } from "@/lib/geo/landing-geo-plans";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { buildLandingBusinessTypeJsonLd, buildLandingBusinessTypeMetadata } from "@/lib/landing/business-type-page";
import { isLandingBusinessTypeSlug, LANDING_BUSINESS_TYPES } from "@/lib/landing/business-types";
import { landingSocialLinksWithGreeting } from "@/lib/landing/contact";
import { getLandingSocialLinks } from "@/lib/landing/contact-server";
import { resolveLowestPlanPrice } from "@/lib/landing/price";
import { loadLandingV3Config } from "@/lib/landing/v3-config";
import { getPublicPlansForLanding } from "@/lib/plans/public-plans";
import { serializeJsonLd } from "@/lib/seo/serialize-json-ld";
import { getAppUrl } from "@/lib/tenant/app-url";
import { isMainDomain } from "@/lib/tenant/main-domain-host";

type Props = { params: Promise<{ tipo: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { tipo } = await params;
	const host = (await headers()).get("host") || "";
	if (!isMainDomain(host) || !isLandingBusinessTypeSlug(tipo)) return {};
	return buildLandingBusinessTypeMetadata(getAppUrl(), LANDING_BUSINESS_TYPES[tipo]);
}

export default async function BusinessTypePage({ params }: Props) {
	const { tipo } = await params;
	const hdrs = await headers();
	// Solo los rubros de `business-types.ts`: cualquier otro /menu-digital/x es 404.
	if (!isMainDomain(hdrs.get("host") || "") || !isLandingBusinessTypeSlug(tipo)) notFound();

	const type = LANDING_BUSINESS_TYPES[tipo];
	const [plans, rawSocialLinks, v3Config] = await Promise.all([
		getPublicPlansForLanding(DEFAULT_LOCALE),
		getLandingSocialLinks(),
		loadLandingV3Config(),
	]);
	// El rubro no tiene país: el precio se muestra en la moneda del visitante, como en la calculadora.
	const fromPrice = resolveLowestPlanPrice(plans, getCountryFromHeaders(hdrs));

	return (
		<BusinessTypeLanding
			type={type}
			fromPrice={fromPrice}
			socialLinks={landingSocialLinksWithGreeting(rawSocialLinks)}
			jsonLd={serializeJsonLd(buildLandingBusinessTypeJsonLd(getAppUrl(), type))}
			heroPhones={v3Config.heroPhones}
		/>
	);
}
