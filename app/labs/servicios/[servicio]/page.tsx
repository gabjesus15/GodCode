import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { landingSocialLinksWithGreeting } from "@/lib/landing/contact";
import { getLandingSocialLinks } from "@/lib/landing/contact-server";
import { LABS_WHATSAPP_GREETING } from "@/lib/labs/content";
import { serializeJsonLd } from "@/lib/seo/serialize-json-ld";
import { getAppUrl } from "@/lib/tenant/app-url";
import { isMainDomain } from "@/lib/tenant/main-domain-host";
import { LabsServicePageView } from "@/components/labs/labs-pages";
import { findLabsProject, findLabsService, LABS_PROJECT_PAGES, LABS_SERVICE_PAGES } from "@/lib/labs/pages";
import { buildLabsServiceJsonLd, buildLabsServiceMetadata } from "@/lib/labs/pages-seo";

type Props = { params: Promise<{ servicio: string }> };

function resolve(id: string) {
	const page = LABS_SERVICE_PAGES.find((candidate) => candidate.id === id);
	const service = page ? findLabsService(page.id) : undefined;
	return page && service ? { page, service } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { servicio } = await params;
	const host = (await headers()).get("host") || "";
	const found = resolve(servicio);
	if (!isMainDomain(host) || !found) return {};
	return buildLabsServiceMetadata(getAppUrl(), found.page);
}

/** Un servicio del estudio (/labs/servicios/{id}); cualquier otro id es 404. */
export default async function LabsServicePage({ params }: Props) {
	const { servicio } = await params;
	const hdrs = await headers();
	const found = resolve(servicio);
	if (!isMainDomain(hdrs.get("host") || "") || !found) notFound();

	const projectPage = found.page.projectSlug ? LABS_PROJECT_PAGES.find((page) => page.slug === found.page.projectSlug) : undefined;
	const project = projectPage ? findLabsProject(projectPage.name) : undefined;
	const socialLinks = landingSocialLinksWithGreeting(await getLandingSocialLinks(), LABS_WHATSAPP_GREETING);

	return (
		<LabsServicePageView
			page={found.page}
			service={found.service}
			project={projectPage && project ? { page: projectPage, project } : undefined}
			socialLinks={socialLinks}
			jsonLd={serializeJsonLd(buildLabsServiceJsonLd(getAppUrl(), found.page, found.service))}
		/>
	);
}
