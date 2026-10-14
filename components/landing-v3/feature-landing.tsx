import { LANDING_PRODUCT_NAME } from "@/lib/landing/brand";
import { getLandingBusinessTypePath } from "@/lib/landing/business-type-page";
import { LANDING_BUSINESS_TYPES } from "@/lib/landing/business-types";
import type { LandingSocialLink } from "@/lib/landing/contact";
import { getLandingFeaturePath } from "@/lib/landing/feature-page";
import { type LandingFeature, LANDING_FEATURES } from "@/lib/landing/features";
import type { HeroFromPrice } from "@/lib/landing/hero-assurances";
import { LANDING_FEATURES_PATH } from "@/lib/landing/marketing-paths";
import type { LandingV3PhoneSlide } from "@/lib/landing/v3-config";

import { TopicCommissionBlock, TopicFaq, TopicGuide, TopicHero, TopicIncludes, TopicLinks, TopicPageShell } from "./topic-sections";

type FeatureLandingProps = {
	feature: LandingFeature;
	fromPrice: HeroFromPrice;
	socialLinks: LandingSocialLink[];
	jsonLd: string;
	heroPhones: LandingV3PhoneSlide[];
};

/**
 * Página de una función (punto de venta, carta QR…). Mismas secciones que los rubros, pero
 * en vez del menú de ejemplo lleva «Cómo funciona» en tres pasos: quien busca una función
 * quiere ver cómo se usa antes que para qué rubro sirve.
 */
export function FeatureLanding({ feature, fromPrice, socialLinks, jsonLd, heroPhones }: FeatureLandingProps) {
	const path = getLandingFeaturePath(feature);
	const otherFeatures = Object.values(LANDING_FEATURES).filter((other) => other.slug !== feature.slug);

	return (
		<TopicPageShell jsonLd={jsonLd} socialLinks={socialLinks}>
			<TopicHero
				parent={{ href: LANDING_FEATURES_PATH, label: "Funciones" }}
				current={feature.label}
				title={feature.heroTitle}
				subtitle={feature.heroSubtitle}
				secondary={{ href: "#como-funciona", label: "Ver cómo funciona" }}
				fromPrice={fromPrice}
				heroPhones={heroPhones}
			/>

			<TopicGuide
				title={feature.guideTitle}
				intro="Antes de elegir un sistema, revisa que cumpla con esto. Es lo que separa una herramienta que ayuda de una que hay que rodear."
				items={feature.guide}
			/>

			<section id="como-funciona" className="v3-section-dark scroll-mt-24 py-20 md:py-28">
				<div className="v3-container">
					<h2 data-reveal className="font-display text-5xl leading-[0.95] text-[#f4f4f5] text-balance md:text-6xl">
						Cómo funciona
					</h2>
					<ol data-reveal className="mt-12 grid gap-5 md:grid-cols-3">
						{feature.steps.map((step, index) => (
							<li key={step.title} className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.03] p-6 md:p-7">
								<span className="font-display text-5xl leading-none text-[#4f5bff]">{index + 1}</span>
								<h3 className="mt-4 text-lg font-semibold text-[#f4f4f5]">{step.title}</h3>
								<p className="mt-2 text-sm leading-relaxed text-[#a1a1aa] text-pretty">{step.text}</p>
							</li>
						))}
					</ol>
				</div>
			</section>

			<TopicIncludes
				intro={`${feature.label} es una parte de ${LANDING_PRODUCT_NAME}. Con el mismo plan tienes todo esto:`}
				excludeHref={path}
			/>

			<TopicCommissionBlock
				title="Sin comisión por pedido"
				text={`${LANDING_PRODUCT_NAME} cobra un plan fijo al mes. Las apps de delivery cobran un porcentaje de cada pedido: en Chile, Uber Eats publica de 25 a 29 % más IVA.`}
			/>

			<TopicFaq title="Preguntas frecuentes" items={feature.faq} />

			<TopicLinks
				groups={[
					{
						title: "Otras funciones",
						links: otherFeatures.map((other) => ({ href: getLandingFeaturePath(other), label: other.label })),
					},
					{
						title: "Para tu tipo de negocio",
						links: Object.values(LANDING_BUSINESS_TYPES).map((type) => ({ href: getLandingBusinessTypePath(type), label: type.label })),
					},
				]}
			/>
		</TopicPageShell>
	);
}
