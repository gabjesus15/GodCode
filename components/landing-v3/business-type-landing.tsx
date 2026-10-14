import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { LANDING_PRODUCT_NAME } from "@/lib/landing/brand";
import { getBusinessTypeSampleMenu, getLandingBusinessTypePath } from "@/lib/landing/business-type-page";
import { type LandingBusinessType, LANDING_BUSINESS_TYPES } from "@/lib/landing/business-types";
import type { LandingSocialLink } from "@/lib/landing/contact";
import { LANDING_COUNTRY_SHARED_FEATURES } from "@/lib/landing/countries";
import { buildHeroAssurances } from "@/lib/landing/hero-assurances";
import { LANDING_COMMISSIONS_GUIDE_PATH } from "@/lib/landing/marketing-paths";
import type { LandingV3PhoneSlide } from "@/lib/landing/v3-config";

import { FloatingSocialDock } from "./floating-social-dock";
import { Footer } from "./footer";
import { HeroAssurances } from "./hero-assurances";
import { HeroPhoneShowcase } from "./hero-phone-showcase";
import { LandingConversionTracker } from "./landing-conversion-tracker";
import { Navbar } from "./navbar";
import { SectionGlow } from "./section-light";
import { Ticker } from "./ticker";

type BusinessTypeLandingProps = {
	type: LandingBusinessType;
	fromPrice: { price: number; currency: string } | null;
	socialLinks: LandingSocialLink[];
	/** JSON-LD ya serializado (la página lo arma con la URL base). */
	jsonLd: string;
	heroPhones: LandingV3PhoneSlide[];
};

/**
 * Página de un tipo de negocio. Misma estética y piezas que las páginas de país; el orden
 * sigue cómo decide quien llega desde Google: primero ve que es para su rubro (hero), luego
 * qué debería exigirle a un sistema (guía), la prueba de que es para él (su menú de ejemplo),
 * el resumen de lo que incluye, lo que pierde hoy en comisiones y sus dudas.
 */
export function BusinessTypeLanding({ type, fromPrice, socialLinks, jsonLd, heroPhones }: BusinessTypeLandingProps) {
	const floatingSocialLinks = socialLinks.filter((link) => link.kind === "instagram" || link.kind === "whatsapp");
	const [heroPlain, heroAccent] = type.heroTitle;
	const sampleMenu = getBusinessTypeSampleMenu(type);
	const otherTypes = Object.values(LANDING_BUSINESS_TYPES).filter((other) => other.slug !== type.slug);

	return (
		<div className="landing-v3 min-h-screen">
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: structured data JSON-LD must be inline for Googlebot
				dangerouslySetInnerHTML={{ __html: jsonLd }}
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
					<div className="v3-container relative flex flex-col gap-14 pt-32 pb-16 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-center lg:gap-x-12 lg:pt-36 lg:pb-24 xl:gap-x-20">
						<div className="flex flex-col items-center text-center lg:items-start lg:text-left">
							<nav aria-label="Ruta" className="v3-label">
								<Link href="/menu-digital" className="transition-colors hover:text-white">
									Menú digital
								</Link>
								<span aria-hidden className="mx-2 text-white/30">
									/
								</span>
								<span>{type.label}</span>
							</nav>
							<h1 className="mt-5 max-w-4xl font-display text-[clamp(2.9rem,10vw,5.25rem)] leading-[0.92] text-white text-balance">
								{heroPlain} <span className="text-[#4f5bff]">{heroAccent}</span>
							</h1>
							<p className="mt-6 max-w-xl text-lg leading-relaxed text-[#a1a1aa] text-pretty">{type.heroSubtitle}</p>

							<div className="mt-9 flex flex-col items-center gap-5 sm:flex-row sm:gap-7">
								<Link
									href="/onboarding"
									className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#4f5bff] px-7 py-3.5 text-[15px] font-semibold text-white transition-[background-color,transform] duration-200 hover:bg-[#3d47e6] active:scale-[0.98]"
								>
									Crear mi tienda
									<ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
								</Link>
								<a
									href="#menu-de-ejemplo"
									className="text-[15px] font-medium text-[#d4d4d8] underline decoration-white/20 underline-offset-[6px] transition-colors duration-200 hover:text-white hover:decoration-white/60"
								>
									Ver con qué menú parte
								</a>
							</div>

							<HeroAssurances items={buildHeroAssurances(fromPrice)} className="mt-8 text-sm leading-relaxed text-[#a1a1aa]" />
						</div>
						<div className="v3-hero-phones relative z-10 flex w-full items-center justify-center">
							<HeroPhoneShowcase phones={heroPhones} />
						</div>
					</div>
				</section>

				<section className="v3-section-dark pt-24 pb-20 md:pt-28 md:pb-24">
					<SectionGlow className="left-[10%] top-1/2 h-[520px] w-[520px] -translate-y-1/2" intensity={0.1} />
					<div className="v3-container">
						<div data-reveal className="max-w-2xl">
							<h2 className="font-display text-5xl leading-[0.95] text-[#f4f4f5] text-balance md:text-6xl">
								Qué debe tener el sistema de tu {type.singular}
							</h2>
							<p className="mt-6 text-lg leading-relaxed text-[#a1a1aa] text-pretty">
								Antes de elegir cualquier sistema, revisa que resuelva esto. Cuando falta, se nota en pedidos
								perdidos y en tiempo de cocina.
							</p>
						</div>
						<dl data-reveal className="mt-14 grid gap-x-12 gap-y-10 md:grid-cols-2">
							{type.guide.map((item) => (
								<div key={item.title} className="border-t border-white/[0.1] pt-6">
									<dt className="text-xl font-semibold text-[#f4f4f5]">{item.title}</dt>
									<dd className="mt-3 leading-relaxed text-[#a1a1aa] text-pretty">{item.text}</dd>
								</div>
							))}
						</dl>
					</div>
				</section>

				<section id="menu-de-ejemplo" className="v3-section-dark scroll-mt-24 py-20 md:py-28">
					<div className="v3-container">
						<div data-reveal className="max-w-2xl">
							<h2 className="font-display text-5xl leading-[0.95] text-[#f4f4f5] text-balance md:text-6xl">
								Tu tienda no parte en blanco
							</h2>
							<p className="mt-6 text-lg leading-relaxed text-[#a1a1aa] text-pretty">
								Al crearla eliges «{type.sector}» y {LANDING_PRODUCT_NAME} arma este menú de ejemplo. Cambias nombres,
								fotos y precios por los tuyos, y con un botón borras lo que no uses.
							</p>
						</div>
						<div data-reveal className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
							{sampleMenu.map((category) => (
								<div
									key={category.name}
									className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.03] p-6 md:p-7"
								>
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

				<section className="v3-section-dark py-20 md:py-28">
					<div className="v3-container grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
						<div data-reveal className="lg:sticky lg:top-28 lg:self-start">
							<h2 className="font-display text-5xl leading-[0.95] text-[#f4f4f5] text-balance md:text-6xl">
								Todo lo que incluye
							</h2>
							<p className="mt-6 max-w-md text-lg leading-relaxed text-[#a1a1aa] text-pretty">
								Menú, pedidos, caja, delivery e inventario en un solo panel, con un plan fijo al mes.
							</p>
						</div>
						<ul data-reveal className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
							{LANDING_COUNTRY_SHARED_FEATURES.map((item) => (
								<li key={item.title} className="flex gap-4">
									<span
										aria-hidden
										className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#4f5bff]/15 text-[#8b93ff]"
									>
										<Check className="h-3.5 w-3.5" strokeWidth={3} />
									</span>
									<div>
										<h3 className="text-base font-semibold text-[#f4f4f5]">{item.title}</h3>
										<p className="mt-1.5 text-sm leading-relaxed text-[#a1a1aa] text-pretty">{item.text}</p>
									</div>
								</li>
							))}
						</ul>
					</div>
				</section>

				<section className="v3-section-dark py-20 md:py-28">
					<SectionGlow className="right-[5%] top-1/2 h-[520px] w-[520px] -translate-y-1/2" intensity={0.1} drift={60} />
					<div className="v3-container">
						<div
							data-reveal
							className="flex flex-col gap-8 rounded-[2rem] border border-white/[0.08] bg-white/[0.03] p-8 md:flex-row md:items-center md:justify-between md:p-12"
						>
							<div className="max-w-xl">
								<h2 className="font-display text-4xl leading-[0.95] text-[#f4f4f5] text-balance md:text-5xl">
									Lo que se queda la app en cada pedido
								</h2>
								<p className="mt-5 text-lg leading-relaxed text-[#a1a1aa] text-pretty">
									En Chile, Uber Eats publica comisiones de 25 a 29 % por pedido con delivery, y sobre la comisión se
									paga IVA. Cada cliente que repite y te pide por tu propio link es un pedido sin esa comisión.
								</p>
							</div>
							<div className="flex flex-col items-start gap-4 md:items-end">
								<Link
									href={LANDING_COMMISSIONS_GUIDE_PATH}
									className="inline-flex items-center gap-2 text-[15px] font-medium text-[#d4d4d8] underline decoration-white/25 underline-offset-[6px] transition-colors hover:text-white hover:decoration-white/60"
								>
									Cuánto cobra cada app en Chile
									<ArrowRight className="h-4 w-4" aria-hidden />
								</Link>
								<Link
									href="/calculadora-comisiones"
									className="text-sm text-[#71717a] underline decoration-white/15 underline-offset-[6px] transition-colors hover:text-[#d4d4d8]"
								>
									Calcularlo con tu venta
								</Link>
							</div>
						</div>
					</div>
				</section>

				<section id="faq" className="v3-section-dark pt-24 pb-20 md:pt-32 md:pb-24">
					<div className="v3-container grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
						<h2
							data-reveal
							className="font-display text-5xl leading-[0.95] text-[#f4f4f5] text-balance md:text-6xl lg:sticky lg:top-28 lg:self-start"
						>
							Preguntas de {type.plural}
						</h2>
						<dl data-reveal className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
							{type.faq.map((item) => (
								<div key={item.question} className="py-7">
									<dt className="text-lg font-medium text-[#f4f4f5]">{item.question}</dt>
									<dd className="mt-3 max-w-2xl leading-relaxed text-[#a1a1aa] text-pretty">{item.answer}</dd>
								</div>
							))}
						</dl>
					</div>
				</section>

				<section className="v3-section-dark pb-28 md:pb-36">
					<div className="v3-container">
						<h2 data-reveal className="text-sm font-semibold uppercase tracking-[0.12em] text-[#71717a]">
							{LANDING_PRODUCT_NAME} para otros negocios
						</h2>
						<ul data-reveal className="mt-6 flex flex-wrap gap-3">
							{otherTypes.map((other) => (
								<li key={other.slug}>
									<Link
										href={getLandingBusinessTypePath(other)}
										className="inline-flex rounded-full border border-white/[0.12] px-5 py-2.5 text-sm font-medium text-[#d4d4d8] transition-colors hover:border-[#4f5bff]/60 hover:text-white"
									>
										{other.label}
									</Link>
								</li>
							))}
						</ul>
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

