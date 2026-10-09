import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { LabsHome } from "@/components/labs/labs-home";
import { landingSocialLinksWithGreeting } from "@/lib/landing/contact";
import { getLandingSocialLinks } from "@/lib/landing/contact-server";
import { LABS_WHATSAPP_GREETING, POS_PATH } from "@/lib/labs/content";
import { buildLabsJsonLd, buildLabsMetadata } from "@/lib/labs/metadata";
import { serializeJsonLd } from "@/lib/seo/serialize-json-ld";
import { getAppUrl } from "@/lib/tenant/app-url";
import { isMainDomain } from "@/lib/tenant/main-domain-host";

/**
 * Vista previa de la home corporativa de Gcode Labs.
 *
 * Mientras el landing de Gcode POS siga en la raíz, esta página vive en /labs
 * sin indexar. El paso final (en un PR aparte, tras unificar los abiertos) la
 * mueve a «/» y lleva el landing del producto a «/pos» (`POS_PATH` en
 * `lib/labs/content.ts`).
 */
const PATH = "/labs";
const INDEX = false;

export async function generateMetadata(): Promise<Metadata> {
	const host = (await headers()).get("host") || "";
	if (!isMainDomain(host)) return {};
	return buildLabsMetadata(getAppUrl(), PATH, { index: INDEX });
}

export default async function LabsHomePage() {
	const hdrs = await headers();
	if (!isMainDomain(hdrs.get("host") || "")) notFound();

	// El mismo número que el landing, pero el chat abre con el saludo del estudio, no con el de ventas de Gcode POS.
	const socialLinks = landingSocialLinksWithGreeting(await getLandingSocialLinks(), LABS_WHATSAPP_GREETING);
	const jsonLd = serializeJsonLd(buildLabsJsonLd(getAppUrl(), PATH));

	return <LabsHome path={PATH} posPath={POS_PATH} socialLinks={socialLinks} jsonLd={jsonLd} />;
}
