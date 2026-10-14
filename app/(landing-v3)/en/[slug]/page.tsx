import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { EnglishTopicLanding } from "@/components/landing-v3/english-landing";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { buildEnglishPageJsonLd, buildEnglishPageMetadata } from "@/lib/landing/english-page-seo";
import { isLandingEnglishSlug, LANDING_ENGLISH_PAGES } from "@/lib/landing/english-pages";
import { resolveLowestPlanPrice } from "@/lib/landing/price";
import { getPublicPlansForLanding } from "@/lib/plans/public-plans";
import { serializeJsonLd } from "@/lib/seo/serialize-json-ld";
import { getAppUrl } from "@/lib/tenant/app-url";
import { isMainDomain } from "@/lib/tenant/main-domain-host";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { slug } = await params;
	const host = (await headers()).get("host") || "";
	if (!isMainDomain(host) || !isLandingEnglishSlug(slug)) return {};
	return buildEnglishPageMetadata(getAppUrl(), LANDING_ENGLISH_PAGES[slug]);
}

export default async function EnglishTopicPage({ params }: Props) {
	const { slug } = await params;
	const hdrs = await headers();
	// Only the pages in `english-pages.ts`: any other /en/x is a 404.
	if (!isMainDomain(hdrs.get("host") || "") || !isLandingEnglishSlug(slug)) notFound();
	const page = LANDING_ENGLISH_PAGES[slug];
	const plans = await getPublicPlansForLanding(DEFAULT_LOCALE);
	return (
		<EnglishTopicLanding
			page={page}
			fromPrice={resolveLowestPlanPrice(plans, "US")}
			jsonLd={serializeJsonLd(buildEnglishPageJsonLd(getAppUrl(), page))}
		/>
	);
}
