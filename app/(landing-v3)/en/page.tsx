import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { EnglishHome } from "@/components/landing-v3/english-landing";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { buildEnglishHomeJsonLd, buildEnglishHomeMetadata } from "@/lib/landing/english-page-seo";
import { resolveLowestPlanPrice } from "@/lib/landing/price";
import { getPublicPlansForLanding } from "@/lib/plans/public-plans";
import { serializeJsonLd } from "@/lib/seo/serialize-json-ld";
import { getAppUrl } from "@/lib/tenant/app-url";
import { isMainDomain } from "@/lib/tenant/main-domain-host";

export async function generateMetadata(): Promise<Metadata> {
	const host = (await headers()).get("host") || "";
	if (!isMainDomain(host)) return {};
	return buildEnglishHomeMetadata(getAppUrl());
}

/** English home for US restaurants. Prices are always the US plan, whoever is reading. */
export default async function EnglishHomePage() {
	const hdrs = await headers();
	if (!isMainDomain(hdrs.get("host") || "")) notFound();
	const plans = await getPublicPlansForLanding(DEFAULT_LOCALE);
	return (
		<EnglishHome
			fromPrice={resolveLowestPlanPrice(plans, "US")}
			jsonLd={serializeJsonLd(buildEnglishHomeJsonLd(getAppUrl()))}
		/>
	);
}
