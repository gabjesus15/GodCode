import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { CommissionCalculator } from "@/components/landing-v3/commission-calculator";
import { FloatingSocialDock } from "@/components/landing-v3/floating-social-dock";
import { Footer } from "@/components/landing-v3/footer";
import { LandingConversionTracker } from "@/components/landing-v3/landing-conversion-tracker";
import { Navbar } from "@/components/landing-v3/navbar";
import { SectionGlow } from "@/components/landing-v3/section-light";
import { Ticker } from "@/components/landing-v3/ticker";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { LANDING_COMPANY_NAME, LANDING_PRODUCT_NAME } from "@/lib/landing/brand";
import { getLandingBusinessTypePath } from "@/lib/landing/business-type-page";
import { LANDING_BUSINESS_TYPES } from "@/lib/landing/business-types";
import {
	CHILE_VAT_PERCENT,
	commissionOn100k,
	COMMISSIONS_BY_APP,
	COMMISSIONS_GUIDE_DESCRIPTION,
	COMMISSIONS_GUIDE_FAQ,
	COMMISSIONS_GUIDE_PUBLISHED_AT,
	COMMISSIONS_GUIDE_REVIEWED_AT,
	COMMISSIONS_GUIDE_SOURCES,
	COMMISSIONS_GUIDE_TITLE,
	formatClp,
	formatGuideDate,
} from "@/lib/landing/commissions-guide";
import { landingSocialLinksWithGreeting } from "@/lib/landing/contact";
import { getLandingSocialLinks } from "@/lib/landing/contact-server";
import { buildOrganizationJsonLd, getOrganizationId } from "@/lib/landing/json-ld";
import { LANDING_COMMISSIONS_GUIDE_PATH } from "@/lib/landing/marketing-paths";
import { resolveLowestPlanPrice } from "@/lib/landing/price";
import { getPublicPlansForLanding } from "@/lib/plans/public-plans";
import { serializeJsonLd } from "@/lib/seo/serialize-json-ld";
import { getAppUrl } from "@/lib/tenant/app-url";
import { isMainDomain } from "@/lib/tenant/main-domain-host";

const PATH = LANDING_COMMISSIONS_GUIDE_PATH;
const EXAMPLE_PERCENTS = [25, 27, 29] as const;

export async function generateMetadata(): Promise<Metadata> {
	const host = (await headers()).get("host") || "";
	if (!isMainDomain(host)) return {};

	const base = getAppUrl();
	const url = `${base}${PATH}`;
	const ogImage = { url: `${base}/api/system/og`, width: 1200, height: 630, type: "image/png", alt: COMMISSIONS_GUIDE_TITLE };

	return {
		metadataBase: new URL(base),
		// La plantilla raíz añade "· Gcode Labs".
		title: COMMISSIONS_GUIDE_TITLE,
		description: COMMISSIONS_GUIDE_DESCRIPTION,
		keywords: [
			"comisión PedidosYa Chile",
			"cuánto cobra PedidosYa",
			"comisión Uber Eats Chile",
			"cuánto cobra Uber Eats a restaurantes",
			"comisión Rappi Chile",
			"comisiones apps de delivery Chile",
			"delivery sin comisión",
		],
		alternates: { canonical: url },
		openGraph: {
			title: COMMISSIONS_GUIDE_TITLE,
			description: COMMISSIONS_GUIDE_DESCRIPTION,
			url,
			siteName: LANDING_COMPANY_NAME,
			locale: "es_CL",
			type: "article",
			publishedTime: COMMISSIONS_GUIDE_PUBLISHED_AT,
			modifiedTime: COMMISSIONS_GUIDE_REVIEWED_AT,
			images: [ogImage],
		},
		twitter: { card: "summary_large_image", title: COMMISSIONS_GUIDE_TITLE, description: COMMISSIONS_GUIDE_DESCRIPTION, images: [ogImage.url] },
		robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
	};
}

export default async function ComisionesDeliveryChilePage() {
	const hdrs = await headers();
	if (!isMainDomain(hdrs.get("host") || "")) notFound();

	const [plans, rawSocialLinks] = await Promise.all([getPublicPlansForLanding(DEFAULT_LOCALE), getLandingSocialLinks()]);
	const socialLinks = landingSocialLinksWithGreeting(rawSocialLinks);
	const floatingSocialLinks = socialLinks.filter((link) => link.kind === "instagram" || link.kind === "whatsapp");
	// La guía es de Chile: la calculadora usa el plan de Chile, como /chile, no el país del visitante.
	const plan = resolveLowestPlanPrice(plans, "CL");

	const base = getAppUrl();
	const url = `${base}${PATH}`;
	const reviewedAt = formatGuideDate(COMMISSIONS_GUIDE_REVIEWED_AT);
	const examples = EXAMPLE_PERCENTS.map((percent) => ({ percent, ...commissionOn100k(percent) }));
	const organizationRef = { "@id": getOrganizationId(base) };

	const ld = [
		{
			"@context": "https://schema.org",
			"@type": "Article",
			"@id": `${url}#article`,
			headline: COMMISSIONS_GUIDE_TITLE,
			description: COMMISSIONS_GUIDE_DESCRIPTION,
			url,
			mainEntityOfPage: url,
			inLanguage: "es-CL",
			datePublished: COMMISSIONS_GUIDE_PUBLISHED_AT,
			dateModified: COMMISSIONS_GUIDE_REVIEWED_AT,
			author: organizationRef,
			publisher: organizationRef,
			image: `${base}/api/system/og`,
			about: [
				{ "@type": "Organization", name: "Uber Eats" },
				{ "@type": "Organization", name: "PedidosYa" },
				{ "@type": "Organization", name: "Rappi" },
			],
			citation: Object.values(COMMISSIONS_GUIDE_SOURCES).map((source) => source.url),
		},
		{
			"@context": "https://schema.org",
			"@type": "BreadcrumbList",
			itemListElement: [
				{ "@type": "ListItem", position: 1, name: LANDING_PRODUCT_NAME, item: `${base}/` },
				{ "@type": "ListItem", position: 2, name: "Comisiones de delivery en Chile", item: url },
			],
		},
		{
			"@context": "https://schema.org",
			"@type": "FAQPage",
			mainEntity: COMMISSIONS_GUIDE_FAQ.map((item) => ({
				"@type": "Question",
				name: item.question,
				acceptedAnswer: { "@type": "Answer", text: item.answer },
			})),
		},
		buildOrganizationJsonLd(base),
	];

	const sourceLink = (key: keyof typeof COMMISSIONS_GUIDE_SOURCES, label = "Fuente") => (
		<a
			href={COMMISSIONS_GUIDE_SOURCES[key].url}
			target="_blank"
			rel="noopener"
			className="text-[#8b93ff] underline decoration-[#8b93ff]/30 underline-offset-4 hover:decoration-[#8b93ff]"
		>
			{label}
		</a>
	);

	return (
		<div className="landing-v3 min-h-screen">
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: structured data JSON-LD must be inline for Googlebot
				dangerouslySetInnerHTML={{ __html: serializeJsonLd(ld) }}
			/>
			<Navbar />
			<main>
				<section
					data-landing-hero
					className="relative z-10 overflow-hidden rounded-b-[2rem] border-b border-[#4f5bff]/25 bg-[#080808] shadow-[0_24px_60px_-24px_rgba(79,91,255,0.45)] md:rounded-b-[3rem]"
				>
					<div
						aria-hidden
						className="pointer-events-none absolute -right-[15%] top-[5%] h-[70vh] w-[70vw] max-w-[900px] rounded-full opacity-60 blur-[90px]"
						style={{ background: "radial-gradient(ellipse at center, rgba(79,91,255,0.4) 0%, transparent 70%)" }}
					/>
					<div className="v3-container relative pt-32 pb-16 lg:pt-36 lg:pb-24">
						<p className="v3-label">Guía · Actualizada el {reviewedAt}</p>
						<h1 className="mt-5 max-w-4xl font-display text-[clamp(2.6rem,9vw,4.75rem)] leading-[0.92] text-white text-balance">
							¿Cuánto cobran PedidosYa, Uber Eats y Rappi <span className="text-[#4f5bff]">en Chile</span>?
						</h1>
						{/* La respuesta corta va primero: es lo que vino a buscar y lo que Google puede citar. */}
						<p className="mt-7 max-w-2xl text-lg leading-relaxed text-[#d4d4d8] text-pretty">
							Uber Eats publica sus comisiones para Chile: <strong className="text-white">25 %, 27 % o 29 %</strong> por
							pedido con delivery según el plan, y 20 % por pedido para retirar. PedidosYa y Rappi no publican una tarifa
							general: la fijan en el contrato de cada local. A la comisión se le suma el IVA ({CHILE_VAT_PERCENT} %).
						</p>
					</div>
				</section>

				<section className="v3-section-dark pt-24 pb-16 md:pt-28">
					<SectionGlow className="left-[10%] top-1/2 h-[520px] w-[520px] -translate-y-1/2" intensity={0.1} />
					<div className="v3-container">
						<h2 data-reveal className="font-display text-5xl leading-[0.95] text-[#f4f4f5] text-balance md:text-6xl">
							Lo que publica cada app
						</h2>
						<div data-reveal className="mt-10 overflow-x-auto rounded-[1.5rem] border border-white/[0.08]">
							<table className="w-full min-w-[560px] text-left">
								<thead className="bg-white/[0.04] text-sm text-[#a1a1aa]">
									<tr>
										<th scope="col" className="px-6 py-4 font-medium">App</th>
										<th scope="col" className="px-6 py-4 font-medium">Comisión</th>
										<th scope="col" className="px-6 py-4 font-medium">Detalle</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-white/[0.08]">
									{COMMISSIONS_BY_APP.map((row) => (
										<tr key={row.app} className="align-top">
											<th scope="row" className="px-6 py-5 font-semibold text-[#f4f4f5]">{row.app}</th>
											<td className="px-6 py-5 text-[#f4f4f5]">{row.published}</td>
											<td className="px-6 py-5 text-sm leading-relaxed text-[#a1a1aa]">
												{row.detail} {sourceLink(row.source)}.
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						<p className="mt-4 text-sm text-[#71717a]">
							Fuentes oficiales revisadas el {reviewedAt}. Tu porcentaje exacto es el de tu contrato o tu liquidación.
						</p>
					</div>
				</section>

				<section className="v3-section-dark py-16 md:py-20">
					<div className="v3-container grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
						<div data-reveal>
							<h2 className="font-display text-5xl leading-[0.95] text-[#f4f4f5] text-balance md:text-6xl">
								De cada {formatClp(100_000)}, ¿cuánto te queda?
							</h2>
							<p className="mt-6 text-lg leading-relaxed text-[#a1a1aa] text-pretty">
								Con las tarifas de Uber Eats y el IVA sobre la comisión. Antes, además, de lo que cobre tu medio de pago.
							</p>
						</div>
						<ul data-reveal className="grid gap-4 sm:grid-cols-3">
							{examples.map((example) => (
								<li key={example.percent} className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.03] p-6">
									<p className="text-sm text-[#a1a1aa]">Comisión {example.percent} %</p>
									<p className="mt-3 font-display text-4xl leading-none text-[#ff8a8a]">−{formatClp(example.total)}</p>
									<p className="mt-2 text-xs leading-relaxed text-[#71717a]">
										{formatClp(example.commission)} + {formatClp(example.vat)} de IVA
									</p>
									<p className="mt-4 border-t border-white/[0.08] pt-4 text-sm text-[#d4d4d8]">
										Te quedan <strong className="text-white">{formatClp(example.remaining)}</strong>
									</p>
								</li>
							))}
						</ul>
					</div>
				</section>

				<section className="v3-section-dark py-16 md:py-20">
					<div className="v3-container max-w-3xl">
						<h2 data-reveal className="font-display text-5xl leading-[0.95] text-[#f4f4f5] text-balance md:text-6xl">
							Puedes vender más barato en tu propio canal
						</h2>
						<div data-reveal className="mt-8 space-y-5 text-lg leading-relaxed text-[#a1a1aa] text-pretty">
							<p>
								El 28 de diciembre de 2023, el Tribunal de Defensa de la Libre Competencia aprobó acuerdos entre la
								Fiscalía Nacional Económica y Uber Eats, PedidosYa y Rappi. Las apps eliminaron las cláusulas que
								impedían a los restaurantes ofrecer precios más bajos en su local, en otra app o en su propio delivery, y
								se comprometieron a informar que cada local fija sus precios con libertad. {sourceLink("fneAgreements2023")}.
							</p>
							<p>
								El 11 de marzo de 2026, la FNE pidió al tribunal multar a PedidosYa por la etiqueta «Mismo precio que en
								local», que según la Fiscalía volvía a impedir precios más bajos en los canales propios. Es una solicitud
								de la FNE, no una sentencia. {sourceLink("fnePedidosYa2026")}.
							</p>
							<p className="text-[#d4d4d8]">
								En la práctica: puedes cobrar menos en tu propio link que en la app, porque ahí no pagas la comisión.
							</p>
						</div>
					</div>
				</section>

				<section className="v3-section-dark py-16 md:py-24">
					<div className="v3-container grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-16">
						<div data-reveal>
							<h2 className="font-display text-5xl leading-[0.95] text-[#f4f4f5] text-balance md:text-6xl">
								Calcúlalo con tu venta
							</h2>
							<p className="mt-6 text-lg leading-relaxed text-[#a1a1aa] text-pretty">
								Pon lo que vendes al mes por apps y tu porcentaje. Verás cuánto se va en comisiones y cuánto quedaría si
								esos pedidos llegaran por tu propia tienda en {LANDING_PRODUCT_NAME}, con un plan fijo al mes.
							</p>
							<Link
								href="/onboarding?pais=CL"
								className="group mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-[#4f5bff] px-7 py-3.5 text-[15px] font-semibold text-white transition-[background-color,transform] duration-200 hover:bg-[#3d47e6] active:scale-[0.98]"
							>
								Crear mi tienda sin comisión
								<ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
							</Link>
						</div>
						<CommissionCalculator plan={plan} />
					</div>
				</section>

				<section id="faq" className="v3-section-dark pt-16 pb-20 md:pt-24">
					<div className="v3-container grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
						<h2 data-reveal className="font-display text-5xl leading-[0.95] text-[#f4f4f5] md:text-6xl lg:sticky lg:top-28 lg:self-start">
							Preguntas frecuentes
						</h2>
						<dl data-reveal className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
							{COMMISSIONS_GUIDE_FAQ.map((item) => (
								<div key={item.question} className="py-7">
									<dt className="text-lg font-medium text-[#f4f4f5]">{item.question}</dt>
									<dd className="mt-3 max-w-2xl leading-relaxed text-[#a1a1aa] text-pretty">{item.answer}</dd>
								</div>
							))}
						</dl>
					</div>
				</section>

				<section className="v3-section-dark pb-28 md:pb-36">
					<div className="v3-container grid gap-12 md:grid-cols-2">
						<div>
							<h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#71717a]">Fuentes</h2>
							<ol className="mt-5 space-y-3 text-sm leading-relaxed">
								{Object.values(COMMISSIONS_GUIDE_SOURCES).map((source) => (
									<li key={source.url}>
										<a
											href={source.url}
											target="_blank"
											rel="noopener"
											className="text-[#a1a1aa] underline decoration-white/15 underline-offset-4 hover:text-white"
										>
											{source.label}
										</a>
									</li>
								))}
							</ol>
						</div>
						<div>
							<h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#71717a]">
								Menú digital para tu negocio
							</h2>
							<ul className="mt-5 flex flex-wrap gap-3">
								{Object.values(LANDING_BUSINESS_TYPES).map((type) => (
									<li key={type.slug}>
										<Link
											href={getLandingBusinessTypePath(type)}
											className="inline-flex rounded-full border border-white/[0.12] px-5 py-2.5 text-sm font-medium text-[#d4d4d8] transition-colors hover:border-[#4f5bff]/60 hover:text-white"
										>
											{type.label}
										</Link>
									</li>
								))}
							</ul>
						</div>
					</div>
				</section>

				<Ticker socialLinks={socialLinks} onboardingHref="/onboarding?pais=CL" />
			</main>
			<Footer socialLinks={socialLinks} />
			<FloatingSocialDock links={floatingSocialLinks} />
			<LandingConversionTracker />
		</div>
	);
}
