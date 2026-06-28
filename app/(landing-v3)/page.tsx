import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { LandingV3Shell } from "@/components/landing-v3/landing-v3-shell";
import { LANDING_FAQ } from "@/lib/landing/faq";
import { buildLandingJsonLd } from "@/lib/landing/json-ld";
import { buildLandingMetadata } from "@/lib/landing/metadata";
import { getCountryFromHeaders } from "@/lib/geo/landing-geo-plans";
import { getPublicPlansForLanding } from "@/lib/plans/public-plans";
import { getAppUrl } from "@/lib/tenant/app-url";
import { getSubdomainFromHost, isMainDomain } from "@/lib/tenant/main-domain-host";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
	const hdrs = await headers();
	const host = hdrs.get("host") || "";
	if (!isMainDomain(host)) {
		return {};
	}
	return buildLandingMetadata(getAppUrl());
}

function JsonLd({
	plans,
	country,
}: {
	plans: Awaited<ReturnType<typeof getPublicPlansForLanding>>;
	country: string;
}) {
	const base = getAppUrl();
	const ld = buildLandingJsonLd({
		base,
		faq: LANDING_FAQ,
		plans,
		country,
	});

	return (
		<script
			id="gcode-jsonld-landing"
			type="application/ld+json"
			// biome-ignore lint/security/noDangerouslySetInnerHtml: structured data JSON-LD must be inline for Googlebot
			dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
		/>
	);
}

export default async function Home() {
	const hdrs = await headers();
	const host = hdrs.get("host") || "";

	if (!isMainDomain(host)) {
		const subdomain = getSubdomainFromHost(host);
		if (subdomain) {
			redirect(`/${subdomain}`);
		}
		redirect("/login");
	}

	const country = getCountryFromHeaders(hdrs);
	const plans = await getPublicPlansForLanding(DEFAULT_LOCALE);

	return (
		<>
			<JsonLd plans={plans} country={country} />
			<LandingV3Shell plans={plans} country={country} />
		</>
	);
}
