import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";

import { LANDING_COMPANY_NAME, LANDING_PRODUCT_NAME } from "@/lib/landing/brand";
import {
	LANDING_ENGLISH_HOME,
	LANDING_ENGLISH_PAGES,
	type LandingEnglishPage,
} from "@/lib/landing/english-pages";
import { getEnglishPagePath as englishPagePath } from "@/lib/landing/english-page-seo";
import { formatLandingPrice } from "@/lib/landing/price";
import { LANDING_ENGLISH_PATH } from "@/lib/landing/marketing-paths";

import { LandingBrandMark } from "./landing-brand-mark";
import { LandingConversionTracker } from "./landing-conversion-tracker";
import { SectionGlow } from "./section-light";

/**
 * English pages (/en, /en/*). Same look as the Spanish landing, with their own header and
 * footer in English: the Spanish navbar and footer point to Spanish sections. The phone
 * mockups of the Spanish hero are left out on purpose: they show Spanish menus.
 */

export const ENGLISH_SIGNUP_HREF = "/onboarding?pais=US";

const H2 = "font-display text-5xl leading-[0.95] text-[#f4f4f5] text-balance md:text-6xl";
const CHIP =
	"inline-flex rounded-full border border-white/[0.12] px-5 py-2.5 text-sm font-medium text-[#d4d4d8] transition-colors hover:border-[#4f5bff]/60 hover:text-white";


type FromPrice = { price: number; currency: string } | null;

export function EnglishShell({ jsonLd, spanishHref, children }: { jsonLd: string; spanishHref: string; children: ReactNode }) {
	const pages = Object.values(LANDING_ENGLISH_PAGES);
	return (
		<div lang="en" className="landing-v3 min-h-screen">
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: structured data JSON-LD must be inline for Googlebot
				dangerouslySetInnerHTML={{ __html: jsonLd }}
			/>
			<header className="absolute inset-x-0 top-0 z-30">
				<nav aria-label="Main" className="v3-container flex items-center justify-between gap-6 py-5">
					<Link href={LANDING_ENGLISH_PATH} aria-label={`${LANDING_PRODUCT_NAME} home`} className="shrink-0">
						<LandingBrandMark className="h-9" priority />
					</Link>
					<ul className="hidden items-center gap-7 text-sm text-[#d4d4d8] md:flex">
						{pages.map((page) => (
							<li key={page.slug}>
								<Link href={englishPagePath(page)} className="transition-colors hover:text-white">
									{page.label}
								</Link>
							</li>
						))}
					</ul>
					<div className="flex items-center gap-4">
						<Link href={spanishHref} hrefLang="es" className="text-sm text-[#a1a1aa] transition-colors hover:text-white">
							Español
						</Link>
						<Link
							href={ENGLISH_SIGNUP_HREF}
							className="rounded-full bg-[#4f5bff] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#3d47e6]"
						>
							Get started
						</Link>
					</div>
				</nav>
			</header>
			<main>{children}</main>
			<footer className="v3-section-beige py-14">
				<div className="v3-container grid gap-10 text-[#0d0d0d] md:grid-cols-3">
					<div>
						<LandingBrandMark variant="onLight" className="h-9" />
						<p className="mt-4 max-w-xs text-sm leading-relaxed text-[#52525b]">
							{LANDING_PRODUCT_NAME} is built and run by {LANDING_COMPANY_NAME}, a software studio in Santiago, Chile.
						</p>
					</div>
					<ul className="space-y-2 text-sm">
						<li>
							<Link href={LANDING_ENGLISH_PATH} className="hover:text-[#4f5bff]">
								Overview
							</Link>
						</li>
						{pages.map((page) => (
							<li key={page.slug}>
								<Link href={englishPagePath(page)} className="hover:text-[#4f5bff]">
									{page.label}
								</Link>
							</li>
						))}
					</ul>
					<ul className="space-y-2 text-sm">
						<li>
							<Link href="/estados-unidos" hrefLang="es" className="hover:text-[#4f5bff]">
								En español: Estados Unidos
							</Link>
						</li>
						<li>
							<Link href="/onboarding/terminos" className="hover:text-[#4f5bff]">
								Terms (Spanish)
							</Link>
						</li>
						<li>
							<Link href="/onboarding/privacidad" className="hover:text-[#4f5bff]">
								Privacy (Spanish)
							</Link>
						</li>
					</ul>
				</div>
			</footer>
			<LandingConversionTracker />
		</div>
	);
}

export function EnglishHero({
	eyebrow,
	title,
	subtitle,
	fromPrice,
	secondary,
}: {
	eyebrow: ReactNode;
	title: [string, string];
	subtitle: string;
	fromPrice: FromPrice;
	secondary?: { href: string; label: string };
}) {
	const assurances = [
		"Free until you publish",
		...(fromPrice ? [`From ${formatLandingPrice(fromPrice.price, fromPrice.currency)} ${fromPrice.currency}/month`] : []),
		"No contract",
		"No commission per order",
	];
	return (
		<section
			data-landing-hero
			className="relative z-10 overflow-hidden rounded-b-[2rem] border-b border-[#4f5bff]/25 bg-[#080808] shadow-[0_24px_60px_-24px_rgba(79,91,255,0.45)] md:rounded-b-[3rem]"
		>
			<div
				aria-hidden
				className="pointer-events-none absolute -right-[15%] top-[5%] h-[70vh] w-[70vw] max-w-[900px] rounded-full opacity-60 blur-[90px]"
				style={{ background: "radial-gradient(ellipse at center, rgba(79,91,255,0.4) 0%, transparent 70%)" }}
			/>
			<div className="v3-container relative pt-32 pb-16 text-center lg:pt-40 lg:pb-24 lg:text-left">
				<div className="v3-label">{eyebrow}</div>
				<h1 className="mx-auto mt-5 max-w-4xl font-display text-[clamp(2.9rem,10vw,5.25rem)] leading-[0.92] text-white text-balance lg:mx-0">
					{title[0]} <span className="text-[#4f5bff]">{title[1]}</span>
				</h1>
				<p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#a1a1aa] text-pretty lg:mx-0">{subtitle}</p>
				<div className="mt-9 flex flex-col items-center gap-5 sm:flex-row sm:gap-7 lg:items-start">
					<Link
						href={ENGLISH_SIGNUP_HREF}
						className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#4f5bff] px-7 py-3.5 text-[15px] font-semibold text-white transition-[background-color,transform] duration-200 hover:bg-[#3d47e6] active:scale-[0.98]"
					>
						Create your store
						<ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
					</Link>
					{secondary ? (
						<a
							href={secondary.href}
							className="text-[15px] font-medium text-[#d4d4d8] underline decoration-white/20 underline-offset-[6px] transition-colors hover:text-white"
						>
							{secondary.label}
						</a>
					) : null}
				</div>
				<ul className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-[#a1a1aa] lg:justify-start">
					{assurances.map((item) => (
						<li key={item} className="inline-flex items-center gap-1.5 whitespace-nowrap">
							<Check aria-hidden className="h-3.5 w-3.5 shrink-0 text-[#4f5bff]" strokeWidth={2.5} />
							{item}
						</li>
					))}
				</ul>
			</div>
		</section>
	);
}

function EnglishFaq({ items }: { items: readonly { question: string; answer: string }[] }) {
	return (
		<section id="faq" className="v3-section-dark pt-24 pb-20 md:pt-28">
			<div className="v3-container grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
				<h2 data-reveal className={`${H2} lg:sticky lg:top-28 lg:self-start`}>
					Questions
				</h2>
				<dl data-reveal className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
					{items.map((item) => (
						<div key={item.question} className="py-7">
							<dt className="text-lg font-medium text-[#f4f4f5]">{item.question}</dt>
							<dd className="mt-3 max-w-2xl leading-relaxed text-[#a1a1aa] text-pretty">{item.answer}</dd>
						</div>
					))}
				</dl>
			</div>
		</section>
	);
}

function EnglishLinks({ title, exclude }: { title: string; exclude?: string }) {
	const pages = Object.values(LANDING_ENGLISH_PAGES).filter((page) => page.slug !== exclude);
	return (
		<section className="v3-section-dark pb-28 md:pb-36">
			<div className="v3-container">
				<h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#71717a]">{title}</h2>
				<ul className="mt-6 flex flex-wrap gap-3">
					{pages.map((page) => (
						<li key={page.slug}>
							<Link href={englishPagePath(page)} className={CHIP}>
								{page.label}
							</Link>
						</li>
					))}
				</ul>
			</div>
		</section>
	);
}

/** One English topic page: guide, how it works, an honest «works today» block and its questions. */
export function EnglishTopicLanding({ page, fromPrice, jsonLd }: { page: LandingEnglishPage; fromPrice: FromPrice; jsonLd: string }) {
	return (
		<EnglishShell jsonLd={jsonLd} spanishHref={page.spanishPath}>
			<EnglishHero
				eyebrow={
					<>
						<Link href={LANDING_ENGLISH_PATH} className="transition-colors hover:text-white">
							{LANDING_PRODUCT_NAME}
						</Link>
						<span aria-hidden className="mx-2 text-white/30">
							/
						</span>
						<span>{page.label}</span>
					</>
				}
				title={page.heroTitle}
				subtitle={page.heroSubtitle}
				fromPrice={fromPrice}
				secondary={{ href: "#how-it-works", label: "See how it works" }}
			/>

			<section className="v3-section-dark pt-24 pb-20 md:pt-28">
				<SectionGlow className="left-[10%] top-1/2 h-[520px] w-[520px] -translate-y-1/2" intensity={0.1} />
				<div className="v3-container">
					<h2 data-reveal className={`${H2} max-w-3xl`}>
						{page.guideTitle}
					</h2>
					<dl data-reveal className="mt-14 grid gap-x-12 gap-y-10 md:grid-cols-2">
						{page.guide.map((item) => (
							<div key={item.title} className="border-t border-white/[0.1] pt-6">
								<dt className="text-xl font-semibold text-[#f4f4f5]">{item.title}</dt>
								<dd className="mt-3 leading-relaxed text-[#a1a1aa] text-pretty">{item.text}</dd>
							</div>
						))}
					</dl>
				</div>
			</section>

			<section id="how-it-works" className="v3-section-dark scroll-mt-24 py-20 md:py-28">
				<div className="v3-container">
					<h2 data-reveal className={H2}>
						How it works
					</h2>
					<ol data-reveal className="mt-12 grid gap-5 md:grid-cols-3">
						{page.steps.map((step, index) => (
							<li key={step.title} className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.03] p-6 md:p-7">
								<span className="font-display text-5xl leading-none text-[#4f5bff]">{index + 1}</span>
								<h3 className="mt-4 text-lg font-semibold text-[#f4f4f5]">{step.title}</h3>
								<p className="mt-2 text-sm leading-relaxed text-[#a1a1aa] text-pretty">{step.text}</p>
							</li>
						))}
					</ol>
				</div>
			</section>

			<EnglishWorksToday />
			<EnglishFaq items={page.faq} />
			<EnglishLinks title={`More from ${LANDING_PRODUCT_NAME}`} exclude={page.slug} />
		</EnglishShell>
	);
}

/** What works in the US today and what does not: said up front, before anyone signs up. */
export function EnglishWorksToday() {
	const home = LANDING_ENGLISH_HOME;
	return (
		<section className="v3-section-dark py-20 md:py-28">
			<div className="v3-container grid gap-10 md:grid-cols-2">
				<div data-reveal className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.03] p-7 md:p-9">
					<h2 className="text-2xl font-semibold text-[#f4f4f5]">{home.worksTitle}</h2>
					<ul className="mt-6 space-y-4">
						{home.works.map((item) => (
							<li key={item} className="flex gap-3 text-[#d4d4d8]">
								<Check aria-hidden className="mt-1 h-4 w-4 shrink-0 text-[#4f5bff]" strokeWidth={2.5} />
								<span className="leading-relaxed">{item}</span>
							</li>
						))}
					</ul>
				</div>
				<div data-reveal className="rounded-[1.5rem] border border-white/[0.08] p-7 md:p-9">
					<h2 className="text-2xl font-semibold text-[#f4f4f5]">{home.notYetTitle}</h2>
					<ul className="mt-6 space-y-4">
						{home.notYet.map((item) => (
							<li key={item} className="flex gap-3 text-[#a1a1aa]">
								<X aria-hidden className="mt-1 h-4 w-4 shrink-0 text-[#71717a]" strokeWidth={2.5} />
								<span className="leading-relaxed">{item}</span>
							</li>
						))}
					</ul>
				</div>
			</div>
		</section>
	);
}

/** /en: overview and entry to the English pages. */
export function EnglishHome({ fromPrice, jsonLd }: { fromPrice: FromPrice; jsonLd: string }) {
	const home = LANDING_ENGLISH_HOME;
	return (
		<EnglishShell jsonLd={jsonLd} spanishHref="/estados-unidos">
			<EnglishHero
				eyebrow={`${LANDING_PRODUCT_NAME} for US restaurants`}
				title={home.heroTitle}
				subtitle={home.heroSubtitle}
				fromPrice={fromPrice}
				secondary={{ href: "#features", label: "See the features" }}
			/>
			<section id="features" className="v3-section-dark scroll-mt-24 py-20 md:py-28">
				<div className="v3-container">
					<ul data-reveal className="grid gap-5 md:grid-cols-3">
						{Object.values(LANDING_ENGLISH_PAGES).map((page) => (
							<li key={page.slug}>
								<Link
									href={englishPagePath(page)}
									className="group flex h-full flex-col rounded-[1.5rem] border border-white/[0.08] bg-white/[0.03] p-7 transition-colors hover:border-[#4f5bff]/50"
								>
									<h2 className="font-display text-4xl leading-none text-[#f4f4f5]">{page.label}</h2>
									<p className="mt-4 flex-1 leading-relaxed text-[#a1a1aa] text-pretty">{page.teaser}</p>
									<span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[#8b93ff]">
										Learn more
										<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
									</span>
								</Link>
							</li>
						))}
					</ul>
				</div>
			</section>
			<EnglishWorksToday />
			<EnglishFaq items={home.faq} />
		</EnglishShell>
	);
}
