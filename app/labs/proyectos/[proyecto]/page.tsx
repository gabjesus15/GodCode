import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { landingSocialLinksWithGreeting } from "@/lib/landing/contact";
import { getLandingSocialLinks } from "@/lib/landing/contact-server";
import { LABS_WHATSAPP_GREETING } from "@/lib/labs/content";
import { serializeJsonLd } from "@/lib/seo/serialize-json-ld";
import { getAppUrl } from "@/lib/tenant/app-url";
import { isMainDomain } from "@/lib/tenant/main-domain-host";
import { LabsProjectPageView } from "@/components/labs/labs-pages";
import { findLabsProject, LABS_PROJECT_PAGES } from "@/lib/labs/pages";
import { buildLabsProjectJsonLd, buildLabsProjectMetadata } from "@/lib/labs/pages-seo";

type Props = { params: Promise<{ proyecto: string }> };

function resolve(slug: string) {
	const page = LABS_PROJECT_PAGES.find((candidate) => candidate.slug === slug);
	const project = page ? findLabsProject(page.name) : undefined;
	return page && project ? { page, project } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { proyecto } = await params;
	const host = (await headers()).get("host") || "";
	const found = resolve(proyecto);
	if (!isMainDomain(host) || !found) return {};
	return buildLabsProjectMetadata(getAppUrl(), found.page);
}

/** Un proyecto del estudio (/labs/proyectos/{slug}); cualquier otro slug es 404. */
export default async function LabsProjectPage({ params }: Props) {
	const { proyecto } = await params;
	const hdrs = await headers();
	const found = resolve(proyecto);
	if (!isMainDomain(hdrs.get("host") || "") || !found) notFound();
	const socialLinks = landingSocialLinksWithGreeting(await getLandingSocialLinks(), LABS_WHATSAPP_GREETING);
	return (
		<LabsProjectPageView
			page={found.page}
			project={found.project}
			socialLinks={socialLinks}
			jsonLd={serializeJsonLd(buildLabsProjectJsonLd(getAppUrl(), found.page, found.project))}
		/>
	);
}
