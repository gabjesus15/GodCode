import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { CountryLanding } from "@/components/landing-v3/country-landing";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { getLandingSocialLinks } from "@/lib/landing/contact-server";
import { LANDING_COUNTRIES, type LandingCountrySlug } from "@/lib/landing/countries";
import { buildLandingCountryJsonLd, buildLandingCountryMetadata } from "@/lib/landing/country-page";
import { resolveLowestPlanPrice } from "@/lib/landing/price";
import { getPublicPlansForLanding } from "@/lib/plans/public-plans";
import { serializeJsonLd } from "@/lib/seo/serialize-json-ld";
import { getAppUrl } from "@/lib/tenant/app-url";
import { isMainDomain } from "@/lib/tenant/main-domain-host";

/**
 * Una ruta estática por país (app/(landing-v3)/chile, /venezuela): un segmento
 * dinámico chocaría con app/[subdomain], que ya ocupa la raíz del dominio.
 */
export async function generateLandingCountryMetadata(slug: LandingCountrySlug): Promise<Metadata> {
	const host = (await headers()).get("host") || "";
	if (!isMainDomain(host)) return {};
	return buildLandingCountryMetadata(getAppUrl(), LANDING_COUNTRIES[slug]);
}

export async function LandingCountryPage({ slug }: { slug: LandingCountrySlug }) {
	const hdrs = await headers();
	if (!isMainDomain(hdrs.get("host") || "")) notFound();

	const country = LANDING_COUNTRIES[slug];
	const [plans, socialLinks] = await Promise.all([getPublicPlansForLanding(DEFAULT_LOCALE), getLandingSocialLinks()]);
	// El precio se resuelve para el país de la página, no para el del visitante:
	// la página habla de Chile aunque la lea alguien desde otro sitio.
	const fromPrice = resolveLowestPlanPrice(plans, country.code);
	const jsonLd = serializeJsonLd(buildLandingCountryJsonLd(getAppUrl(), country));

	return <CountryLanding country={country} fromPrice={fromPrice} socialLinks={socialLinks} jsonLd={jsonLd} />;
}
