import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { landingSocialLinksWithGreeting } from "@/lib/landing/contact";
import { getLandingSocialLinks } from "@/lib/landing/contact-server";
import { LABS_WHATSAPP_GREETING } from "@/lib/labs/content";
import { serializeJsonLd } from "@/lib/seo/serialize-json-ld";
import { getAppUrl } from "@/lib/tenant/app-url";
import { isMainDomain } from "@/lib/tenant/main-domain-host";
import { LabsCostGuideView } from "@/components/labs/labs-pages";
import { buildLabsCostGuideJsonLd, buildLabsCostGuideMetadata } from "@/lib/labs/pages-seo";

export async function generateMetadata(): Promise<Metadata> {
	const host = (await headers()).get("host") || "";
	if (!isMainDomain(host)) return {};
	return buildLabsCostGuideMetadata(getAppUrl());
}

/** Guía «¿Cuánto cuesta una página web o un sistema a medida?»: de qué depende, sin precios de lista. */
export default async function LabsCostGuidePage() {
	const hdrs = await headers();
	if (!isMainDomain(hdrs.get("host") || "")) notFound();
	const socialLinks = landingSocialLinksWithGreeting(await getLandingSocialLinks(), LABS_WHATSAPP_GREETING);
	return <LabsCostGuideView socialLinks={socialLinks} jsonLd={serializeJsonLd(buildLabsCostGuideJsonLd(getAppUrl()))} />;
}
