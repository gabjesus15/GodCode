import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { FloatingSocialDock } from "@/components/landing-v3/floating-social-dock";
import { Footer } from "@/components/landing-v3/footer";
import { LandingConversionTracker } from "@/components/landing-v3/landing-conversion-tracker";
import { Navbar } from "@/components/landing-v3/navbar";
import { SectionGlow } from "@/components/landing-v3/section-light";
import { Ticker } from "@/components/landing-v3/ticker";
import { getLandingBusinessTypePath } from "@/lib/landing/business-type-page";
import { LANDING_BUSINESS_TYPES } from "@/lib/landing/business-types";
import { buildLandingFeaturesIndexJsonLd, buildLandingFeaturesIndexMetadata, getLandingFeaturePath } from "@/lib/landing/feature-page";
import { LANDING_FEATURES } from "@/lib/landing/features";
import { landingSocialLinksWithGreeting } from "@/lib/landing/contact";
import { getLandingSocialLinks } from "@/lib/landing/contact-server";
import { LANDING_COMMISSIONS_GUIDE_PATH } from "@/lib/landing/marketing-paths";
import { serializeJsonLd } from "@/lib/seo/serialize-json-ld";
import { getAppUrl } from "@/lib/tenant/app-url";
import { isMainDomain } from "@/lib/tenant/main-domain-host";

export async function generateMetadata(): Promise<Metadata> {
	const host = (await headers()).get("host") || "";
	if (!isMainDomain(host)) return {};
	return buildLandingFeaturesIndexMetadata(getAppUrl());
}

/** Índice de las funciones: reparte enlaces internos hacia cada página de función. */
export default async function FuncionesIndexPage() {
	const hdrs = await headers();
	if (!isMainDomain(hdrs.get("host") || "")) notFound();

	const socialLinks = landingSocialLinksWithGreeting(await getLandingSocialLinks());
	const floatingSocialLinks = socialLinks.filter((link) => link.kind === "instagram" || link.kind === "whatsapp");
	const features = Object.values(LANDING_FEATURES);
	const types = Object.values(LANDING_BUSINESS_TYPES);

	return (
		<div className="landing-v3 min-h-screen">
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: structured data JSON-LD must be inline for Googlebot
				dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildLandingFeaturesIndexJsonLd(getAppUrl())) }}
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
					<div className="v3-container relative pt-32 pb-16 text-center lg:pt-36 lg:pb-24 lg:text-left">
						<h1 className="max-w-4xl font-display text-[clamp(2.9rem,10vw,5.25rem)] leading-[0.92] text-white text-balance">
							Todo para vender en <span className="text-[#4f5bff]">tu restaurante</span>
						</h1>
						<p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[#a1a1aa] text-pretty lg:mx-0">
							Caja, menú QR, pedidos online, delivery e inventario en un solo panel. Elige una función para ver qué
							debería tener y cómo se usa.
						</p>
					</div>
				</section>

				<section className="v3-section-dark py-20 md:py-28">
					<SectionGlow className="left-1/2 top-1/3 h-[520px] w-[min(1000px,150vw)] -translate-x-1/2" intensity={0.1} />
					<div className="v3-container">
						<ul data-reveal className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
							{features.map((feature) => (
								<li key={feature.slug}>
									<Link
										href={getLandingFeaturePath(feature)}
										className="group flex h-full flex-col rounded-[1.5rem] border border-white/[0.08] bg-white/[0.03] p-7 transition-colors hover:border-[#4f5bff]/50 hover:bg-white/[0.05]"
									>
										<h2 className="font-display text-4xl leading-none text-[#f4f4f5]">{feature.label}</h2>
										<p className="mt-4 flex-1 leading-relaxed text-[#a1a1aa] text-pretty">{feature.teaser}</p>
										<span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[#8b93ff]">
											Ver cómo funciona
											<ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
										</span>
									</Link>
								</li>
							))}
						</ul>
						<div data-reveal className="mt-14">
							<h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#71717a]">Para tu tipo de negocio</h2>
							<ul className="mt-6 flex flex-wrap gap-3">
								{types.map((type) => (
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
							<p className="mt-10 max-w-2xl text-[#a1a1aa]">
								¿Vendes por apps de delivery? Mira{" "}
								<Link
									href={LANDING_COMMISSIONS_GUIDE_PATH}
									className="text-[#d4d4d8] underline decoration-white/25 underline-offset-[6px] hover:text-white"
								>
									cuánto cobra cada una en Chile
								</Link>
								.
							</p>
						</div>
					</div>
				</section>

				<Ticker socialLinks={socialLinks} />
			</main>
			<Footer socialLinks={socialLinks} />
			<FloatingSocialDock links={floatingSocialLinks} />
			<LandingConversionTracker />
		</div>
	);
}
