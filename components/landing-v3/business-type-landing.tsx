import { LANDING_PRODUCT_NAME } from "@/lib/landing/brand";
import { getBusinessTypeSampleMenu, getLandingBusinessTypePath } from "@/lib/landing/business-type-page";
import { type LandingBusinessType, LANDING_BUSINESS_TYPES } from "@/lib/landing/business-types";
import type { LandingSocialLink } from "@/lib/landing/contact";
import { getLandingFeaturePath } from "@/lib/landing/feature-page";
import { LANDING_FEATURES } from "@/lib/landing/features";
import type { HeroFromPrice } from "@/lib/landing/hero-assurances";
import { LANDING_BUSINESS_TYPES_PATH } from "@/lib/landing/marketing-paths";
import type { LandingV3PhoneSlide } from "@/lib/landing/v3-config";

import { TopicCommissionBlock, TopicFaq, TopicGuide, TopicHero, TopicIncludes, TopicLinks, TopicPageShell } from "./topic-sections";

type BusinessTypeLandingProps = {
	type: LandingBusinessType;
	fromPrice: HeroFromPrice;
	socialLinks: LandingSocialLink[];
	/** JSON-LD ya serializado (la página lo arma con la URL base). */
	jsonLd: string;
	heroPhones: LandingV3PhoneSlide[];
};

/**
 * Página de un tipo de negocio. El orden sigue cómo decide quien llega desde Google: primero
 * ve que es para su rubro (hero), luego qué debería exigirle a un sistema (guía), la prueba
 * de que es para él (su menú de ejemplo), lo que incluye, lo que pierde hoy en comisiones y
 * sus dudas. Las secciones son las de `topic-sections.tsx`; el texto, el de la ficha.
 */
export function BusinessTypeLanding({ type, fromPrice, socialLinks, jsonLd, heroPhones }: BusinessTypeLandingProps) {
	const sampleMenu = getBusinessTypeSampleMenu(type);
	const otherTypes = Object.values(LANDING_BUSINESS_TYPES).filter((other) => other.slug !== type.slug);

	return (
		<TopicPageShell jsonLd={jsonLd} socialLinks={socialLinks}>
			<TopicHero
				parent={{ href: LANDING_BUSINESS_TYPES_PATH, label: "Menú digital" }}
				current={type.label}
				title={type.heroTitle}
				subtitle={type.heroSubtitle}
				secondary={{ href: "#menu-de-ejemplo", label: "Ver con qué menú parte" }}
				fromPrice={fromPrice}
				heroPhones={heroPhones}
			/>

			<TopicGuide
				title={`Qué debe tener el sistema de tu ${type.singular}`}
				intro="Antes de elegir cualquier sistema, revisa que resuelva esto. Cuando falta, se nota en pedidos perdidos y en tiempo de cocina."
				items={type.guide}
			/>

			<section id="menu-de-ejemplo" className="v3-section-dark scroll-mt-24 py-20 md:py-28">
				<div className="v3-container">
					<div data-reveal className="max-w-2xl">
						<h2 className="font-display text-5xl leading-[0.95] text-[#f4f4f5] text-balance md:text-6xl">
							Tu tienda no parte en blanco
						</h2>
						<p className="mt-6 text-lg leading-relaxed text-[#a1a1aa] text-pretty">
							Al crearla eliges «{type.sector}» y {LANDING_PRODUCT_NAME} arma este menú de ejemplo. Cambias nombres, fotos
							y precios por los tuyos, y con un botón borras lo que no uses.
						</p>
					</div>
					<div data-reveal className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
						{sampleMenu.map((category) => (
							<div key={category.name} className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.03] p-6 md:p-7">
								<h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#8b93ff]">{category.name}</h3>
								<ul className="mt-4 space-y-4">
									{category.products.map((product) => (
										<li key={product.name}>
											<p className="font-medium text-[#f4f4f5]">{product.name}</p>
											<p className="mt-0.5 text-sm leading-relaxed text-[#a1a1aa] text-pretty">{product.description}</p>
										</li>
									))}
								</ul>
							</div>
						))}
					</div>
				</div>
			</section>

			<TopicIncludes intro="Menú, pedidos, caja, delivery e inventario en un solo panel, con un plan fijo al mes." />

			<TopicCommissionBlock
				title="Lo que se queda la app en cada pedido"
				text="En Chile, Uber Eats publica comisiones de 25 a 29 % por pedido con delivery, y sobre la comisión se paga IVA. Cada cliente que repite y te pide por tu propio link es un pedido sin esa comisión."
			/>

			<TopicFaq title={`Preguntas de ${type.plural}`} items={type.faq} />

			<TopicLinks
				groups={[
					{
						title: `${LANDING_PRODUCT_NAME} para otros negocios`,
						links: otherTypes.map((other) => ({ href: getLandingBusinessTypePath(other), label: other.label })),
					},
					{
						title: "Funciones",
						links: Object.values(LANDING_FEATURES).map((feature) => ({ href: getLandingFeaturePath(feature), label: feature.label })),
					},
				]}
			/>
		</TopicPageShell>
	);
}
