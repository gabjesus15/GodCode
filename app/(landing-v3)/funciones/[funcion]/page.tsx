import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { FeatureLanding } from "@/components/landing-v3/feature-landing";
import { getCountryFromHeaders } from "@/lib/geo/landing-geo-plans";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { buildLandingFeatureJsonLd, buildLandingFeatureMetadata } from "@/lib/landing/feature-page";
import { isLandingFeatureSlug, LANDING_FEATURES } from "@/lib/landing/features";
import { landingSocialLinksWithGreeting } from "@/lib/landing/contact";
import { getLandingSocialLinks } from "@/lib/landing/contact-server";
import { resolveLowestPlanPrice } from "@/lib/landing/price";
import { loadLandingV3Config } from "@/lib/landing/v3-config";
import { getPublicPlansForLanding } from "@/lib/plans/public-plans";
import { serializeJsonLd } from "@/lib/seo/serialize-json-ld";
import { getAppUrl } from "@/lib/tenant/app-url";
import { isMainDomain } from "@/lib/tenant/main-domain-host";

type Props = { params: Promise<{ funcion: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { funcion } = await params;
	const host = (await headers()).get("host") || "";
	if (!isMainDomain(host) || !isLandingFeatureSlug(funcion)) return {};
	return buildLandingFeatureMetadata(getAppUrl(), LANDING_FEATURES[funcion]);
}

export default async function FeaturePage({ params }: Props) {
	const { funcion } = await params;
	const hdrs = await headers();
	// Solo las funciones de `features.ts`: cualquier otro /funciones/x es 404.
	if (!isMainDomain(hdrs.get("host") || "") || !isLandingFeatureSlug(funcion)) notFound();

	const feature = LANDING_FEATURES[funcion];
	const [plans, rawSocialLinks, v3Config] = await Promise.all([
		getPublicPlansForLanding(DEFAULT_LOCALE),
		getLandingSocialLinks(),
		loadLandingV3Config(),
	]);
	// La función no tiene país: el precio se muestra en la moneda del visitante, como en la calculadora.
	const fromPrice = resolveLowestPlanPrice(plans, getCountryFromHeaders(hdrs));

	return (
		<FeatureLanding
			feature={feature}
			fromPrice={fromPrice}
			socialLinks={landingSocialLinksWithGreeting(rawSocialLinks)}
			jsonLd={serializeJsonLd(buildLandingFeatureJsonLd(getAppUrl(), feature))}
			heroPhones={v3Config.heroPhones}
		/>
	);
}
