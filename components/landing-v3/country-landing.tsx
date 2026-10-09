import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { LANDING_PRODUCT_NAME } from "@/lib/landing/brand";
import type { LandingSocialLink } from "@/lib/landing/contact";
import { LANDING_COUNTRY_SHARED_FEATURES, type LandingCountry } from "@/lib/landing/countries";
import { formatLandingPrice } from "@/lib/landing/price";

import { FloatingSocialDock } from "./floating-social-dock";
import { Footer } from "./footer";
import { LandingConversionTracker } from "./landing-conversion-tracker";
import { Navbar } from "./navbar";
import { SectionGlow } from "./section-light";
import { Ticker } from "./ticker";

type CountryLandingProps = {
	country: LandingCountry;
	fromPrice: { price: number; currency: string } | null;
	socialLinks: LandingSocialLink[];
	/** JSON-LD ya serializado (la página lo arma con la URL base). */
	jsonLd: string;
};

/**
 * Página de país del landing. Misma estética que la home (landing-v3) y las
 * mismas piezas compartidas; el contenido sale de `lib/landing/countries.ts`
 * para que el texto visible y el FAQPage del JSON-LD sean el mismo.
 */
export function CountryLanding({ country, fromPrice, socialLinks, jsonLd }: CountryLandingProps) {
	const floatingSocialLinks = socialLinks.filter(
		(link) => link.kind === "instagram" || link.kind === "whatsapp",
	);
	const [heroPlain, heroAccent] = country.heroTitle;
	const appsList = formatList(country.deliveryApps);

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
					<div className="v3-container relative flex flex-col items-center pt-32 pb-16 text-center lg:items-start lg:pt-36 lg:pb-24 lg:text-left">
						<p className="v3-label">
							{LANDING_PRODUCT_NAME} en {country.name}
						</p>
						<h1 className="mt-5 max-w-4xl font-display text-[clamp(2.9rem,10vw,5.25rem)] leading-[0.92] text-white text-balance">
							{heroPlain} <span className="text-[#4f5bff]">{heroAccent}</span>
						</h1>
						<p className="mt-6 max-w-xl text-lg leading-relaxed text-[#a1a1aa] text-pretty">{country.heroSubtitle}</p>

						<div className="mt-9 flex flex-col items-center gap-5 sm:flex-row sm:gap-7">
							<Link
								href={`/onboarding?pais=${country.code}`}
								className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#4f5bff] px-7 py-3.5 text-[15px] font-semibold text-white transition-[background-color,transform] duration-200 hover:bg-[#3d47e6] active:scale-[0.98]"
							>
								Crear mi tienda
								<ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
							</Link>
							<Link
								href="/#como-funciona"
								className="text-[15px] font-medium text-[#d4d4d8] underline decoration-white/20 underline-offset-[6px] transition-colors duration-200 hover:text-white hover:decoration-white/60"
							>
								Ver cómo funciona
							</Link>
						</div>

						<p className="mt-8 text-sm text-[#71717a]">
							{fromPrice ? (
								<>
									Desde {formatLandingPrice(fromPrice.price, fromPrice.currency)} {fromPrice.currency}/mes
									<span aria-hidden className="mx-2">
										·
									</span>
								</>
							) : null}
							Sin comisión por venta · 2 meses al precio de 1 en tu primer pago
						</p>
					</div>
				</section>

				<section className="v3-section-dark pt-24 pb-20 md:pt-28 md:pb-24">
					<SectionGlow className="left-[10%] top-1/2 h-[520px] w-[520px] -translate-y-1/2" intensity={0.1} />
					<div className="v3-container">
						<div data-reveal className="max-w-2xl">
							<h2 className="font-display text-5xl leading-[0.95] text-[#f4f4f5] text-balance md:text-6xl">
								Pensado para restaurantes {country.demonym}
							</h2>
							<p className="mt-6 text-lg leading-relaxed text-[#a1a1aa] text-pretty">
								Las apps como {appsList} se quedan con una parte de cada pedido. Con tu propio menú y tu propia
								caja, el cliente y la venta son tuyos, y cobras como ya cobras en {country.name}.
							</p>
						</div>
						<dl data-reveal className="mt-14 grid gap-x-12 gap-y-10 md:grid-cols-2">
							{country.localFeatures.map((item) => (
								<div key={item.title} className="border-t border-white/[0.1] pt-6">
									<dt className="text-xl font-semibold text-[#f4f4f5]">{item.title}</dt>
									<dd className="mt-3 leading-relaxed text-[#a1a1aa] text-pretty">{item.text}</dd>
								</div>
							))}
						</dl>
					</div>
				</section>

				<section className="v3-section-dark py-20 md:py-28">
					<div className="v3-container grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
						<div data-reveal className="lg:sticky lg:top-28 lg:self-start">
							<h2 className="font-display text-5xl leading-[0.95] text-[#f4f4f5] text-balance md:text-6xl">
								Todo lo que incluye
							</h2>
							<p className="mt-6 max-w-md text-lg leading-relaxed text-[#a1a1aa] text-pretty">
								Menú, pedidos, caja, delivery e inventario en un solo panel. Lo mismo que usan los locales que ya
								venden con {LANDING_PRODUCT_NAME}.
							</p>
							<p className="mt-6 text-sm text-[#71717a]">
								Medios de pago en {country.name}: {formatList(country.paymentMethods)}.
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
									Cuánto cuesta en {country.name}
								</h2>
								<p className="mt-5 text-lg leading-relaxed text-[#a1a1aa] text-pretty">{country.billingNote}</p>
								<p className="mt-3 text-sm text-[#71717a]">
									Sin permanencia: cancelas cuando quieras y sin penalidad.
								</p>
							</div>
							<div className="flex flex-col items-start gap-4 md:items-end">
								{fromPrice ? (
									<p className="font-display text-5xl leading-none text-white md:text-6xl">
										{formatLandingPrice(fromPrice.price, fromPrice.currency)}
										<span className="ml-2 font-sans text-base font-medium text-[#a1a1aa]">{fromPrice.currency}/mes</span>
									</p>
								) : null}
								<Link
									href="/#precios"
									className="inline-flex items-center gap-2 text-[15px] font-medium text-[#d4d4d8] underline decoration-white/25 underline-offset-[6px] transition-colors hover:text-white hover:decoration-white/60"
								>
									Ver todos los planes
									<ArrowRight className="h-4 w-4" aria-hidden />
								</Link>
								<Link
									href="/calculadora-comisiones"
									className="text-sm text-[#71717a] underline decoration-white/15 underline-offset-[6px] transition-colors hover:text-[#d4d4d8]"
								>
									Calcular cuánto pagas hoy en comisiones
								</Link>
							</div>
						</div>
					</div>
				</section>

				<section id="faq" className="v3-section-dark pt-24 pb-28 md:pt-32 md:pb-36">
					<div className="v3-container grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
						<h2
							data-reveal
							className="font-display text-5xl leading-[0.95] text-[#f4f4f5] text-balance md:text-6xl lg:sticky lg:top-28 lg:self-start"
						>
							Preguntas frecuentes en {country.name}
						</h2>
						<dl data-reveal className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
							{country.faq.map((item) => (
								<div key={item.question} className="py-7">
									<dt className="text-lg font-medium text-[#f4f4f5]">{item.question}</dt>
									<dd className="mt-3 max-w-2xl leading-relaxed text-[#a1a1aa] text-pretty">{item.answer}</dd>
								</div>
							))}
						</dl>
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

/** «A, B y C» en español. */
function formatList(items: string[]): string {
	if (items.length <= 1) return items.join("");
	return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}
