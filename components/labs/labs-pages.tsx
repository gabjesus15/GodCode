import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, ChevronDown, TriangleAlert } from "lucide-react";

import { LANDING_COMPANY_NAME, LANDING_PRODUCT_NAME } from "@/lib/landing/brand";
import type { LandingSocialLink } from "@/lib/landing/contact";
import { LABS_HOME, LABS_PROCESS, POS_PATH, type LabsProject, type LabsService } from "@/lib/labs/content";
import {
	LABS_COST_GUIDE,
	LABS_COST_GUIDE_PATH,
	LABS_PATH,
	LABS_PROJECT_PAGES,
	LABS_SERVICE_PAGES,
	labsProjectPath,
	labsServicePath,
	type LabsProjectPage,
	type LabsServicePage,
} from "@/lib/labs/pages";

import { LabsFooter, LabsQuoteSection } from "./labs-chrome";
import { BrowserFrame, LaptopFrame, PhoneFrame } from "./labs-frames";
import { LabsMotion } from "./labs-motion";
import { LabsNavbar, type LabsNavLink } from "./labs-navbar";
import "./labs.css";

/**
 * Páginas del estudio debajo de /labs (servicios, proyectos, guía de costos). Misma barra,
 * cotización y pie que la home; el contenido sale de `lib/labs/pages.ts`.
 */

const NAV_LINKS: LabsNavLink[] = [
	{ label: "Servicios", href: `${LABS_PATH}#servicios` },
	{ label: "Cómo trabajamos", href: `${LABS_PATH}#proceso` },
	{ label: "Proyectos", href: `${LABS_PATH}#proyectos` },
	{ label: "Cuánto cuesta", href: LABS_COST_GUIDE_PATH },
];

const H1 = "mt-5 text-[clamp(2.2rem,4.6vw,3.75rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-balance";
const H2 = "text-[clamp(1.8rem,3.4vw,2.75rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-balance";
const PRIMARY_BUTTON =
	"group inline-flex items-center gap-2 rounded-full bg-[#4f5bff] px-7 py-3.5 text-[15px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(79,91,255,0.75)] transition-[background-color,box-shadow,scale] duration-200 hover:bg-[#15151a] active:scale-[0.97]";
const CHIP =
	"inline-flex items-center gap-1.5 rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-[#15151a] transition-colors hover:border-[#15151a] hover:bg-[#15151a] hover:text-white";

function Eyebrow({ children }: { children: ReactNode }) {
	return (
		<p className="inline-flex items-center rounded-full border border-black/[0.08] bg-white px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4f5bff]">
			{children}
		</p>
	);
}

function Breadcrumb({ items }: { items: { href?: string; label: string }[] }) {
	return (
		<nav aria-label="Ruta" className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8e8e93]">
			{items.map((item, index) => (
				<span key={item.label}>
					{index > 0 ? <span aria-hidden className="mx-2 text-black/20">/</span> : null}
					{item.href ? (
						<Link href={item.href} className="transition-colors hover:text-[#4f5bff]">
							{item.label}
						</Link>
					) : (
						<span className="text-[#4f5bff]">{item.label}</span>
					)}
				</span>
			))}
		</nav>
	);
}

export function LabsSubpageShell({ jsonLd, socialLinks, children }: { jsonLd: string; socialLinks: LandingSocialLink[]; children: ReactNode }) {
	return (
		<div className="labs-root bg-white text-[#15151a] antialiased">
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: structured data JSON-LD must be inline for Googlebot
				dangerouslySetInnerHTML={{ __html: jsonLd }}
			/>
			<LabsMotion />
			<LabsNavbar
				links={NAV_LINKS}
				homeHref={LABS_PATH}
				ctaHref="#cotizar"
				ctaLabel={LABS_HOME.primaryCta}
				companyName={LANDING_COMPANY_NAME}
				product={{ label: LANDING_PRODUCT_NAME, href: POS_PATH }}
			/>
			<main>
				{children}
				<LabsQuoteSection socialLinks={socialLinks} />
			</main>
			<LabsFooter socialLinks={socialLinks} posPath={POS_PATH} homeHref={LABS_PATH} />
		</div>
	);
}

function ProjectScreens({ project }: { project: LabsProject }) {
	if (!project.image) return null;
	return (
		<div className="relative mx-auto aspect-[4/3] w-full max-w-3xl overflow-hidden rounded-[2rem] border border-black/[0.06] bg-[#eef0ff]">
			<LaptopFrame
				screen={project.image}
				className={project.phone ? "absolute left-[3%] top-[10%] w-[82%]" : "absolute left-1/2 top-[8%] w-[88%] -translate-x-1/2"}
				sizes="(min-width: 1024px) 640px, 90vw"
			/>
			{project.phone ? (
				<PhoneFrame screen={project.phone} className="absolute bottom-[5%] right-[4%] w-[26%]" sizes="(min-width: 1024px) 180px, 26vw" />
			) : null}
		</div>
	);
}

function ServiceScreen({ service }: { service: LabsService }) {
	const image = service.image;
	if (!image) return null;
	return (
		<div className="relative mx-auto aspect-[4/3] w-full max-w-xl overflow-hidden rounded-[2rem] bg-[#eef0ff]">
			{image.frame === "phone" ? (
				<PhoneFrame screen={image} cut className="absolute left-1/2 top-8 w-52 -translate-x-1/2" sizes="208px" />
			) : image.frame === "browser" ? (
				<BrowserFrame screen={image} className="absolute inset-x-8 top-8" sizes="(min-width: 640px) 520px, 85vw" />
			) : (
				<LaptopFrame screen={image} cut className="absolute inset-x-8 top-10" sizes="(min-width: 640px) 520px, 85vw" />
			)}
		</div>
	);
}

function Faq({ items }: { items: readonly { question: string; answer: string }[] }) {
	return (
		<section className="px-6 py-20 sm:py-24">
			<div className="mx-auto max-w-3xl">
				<h2 className={`labs-reveal text-center ${H2}`}>Preguntas frecuentes</h2>
				<div className="labs-reveal mt-10 divide-y divide-[#e8e8ef] border-y border-[#e8e8ef]">
					{items.map((item) => (
						<details key={item.question} className="labs-faq group py-5">
							<summary className="flex cursor-pointer list-none items-center justify-between gap-6 rounded-lg text-left text-lg font-semibold tracking-tight transition-colors duration-200 hover:text-[#4f5bff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4f5bff] focus-visible:ring-offset-4 [&::-webkit-details-marker]:hidden">
								{item.question}
								<span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f4f4f8] text-[#6b6b76] transition-colors duration-300 group-open:bg-[#4f5bff] group-open:text-white">
									<ChevronDown className="h-4 w-4 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-open:rotate-180" aria-hidden />
								</span>
							</summary>
							<p className="labs-faq-answer mt-3 max-w-2xl leading-relaxed text-[#6b6b76] text-pretty">{item.answer}</p>
						</details>
					))}
				</div>
			</div>
		</section>
	);
}

function Process() {
	return (
		<section className="px-6 py-20 sm:py-24">
			<div className="mx-auto max-w-6xl">
				<h2 className={`labs-reveal text-center ${H2}`}>Cómo trabajamos</h2>
				<ol className="labs-reveal mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
					{LABS_PROCESS.map((step) => (
						<li key={step.num} className="rounded-[1.75rem] border border-black/[0.06] p-6">
							<span className="text-xs font-semibold text-[#4f5bff] tabular-nums">{step.num}</span>
							<h3 className="mt-3 text-lg font-semibold tracking-tight">{step.title}</h3>
							<p className="mt-2 text-sm leading-relaxed text-[#6b6b76] text-pretty">{step.text}</p>
						</li>
					))}
				</ol>
			</div>
		</section>
	);
}

/** Enlaces a los demás servicios y a la guía de costos: reparten visitas dentro del estudio. */
function MoreLinks({ excludeService }: { excludeService?: string }) {
	return (
		<section className="px-6 pb-16">
			<div className="mx-auto max-w-6xl">
				<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8e8e93]">Más del estudio</p>
				<ul className="mt-5 flex flex-wrap gap-3">
					{LABS_SERVICE_PAGES.filter((page) => page.id !== excludeService).map((page) => (
						<li key={page.id}>
							<Link href={labsServicePath(page.id)} className={CHIP}>
								{page.metaTitle}
							</Link>
						</li>
					))}
					<li>
						<Link href={LABS_COST_GUIDE_PATH} className={CHIP}>
							¿Cuánto cuesta un sitio web?
						</Link>
					</li>
				</ul>
			</div>
		</section>
	);
}

export function LabsServicePageView({
	page,
	service,
	project,
	socialLinks,
	jsonLd,
}: {
	page: LabsServicePage;
	service: LabsService;
	project?: { page: LabsProjectPage; project: LabsProject };
	socialLinks: LandingSocialLink[];
	jsonLd: string;
}) {
	return (
		<LabsSubpageShell jsonLd={jsonLd} socialLinks={socialLinks}>
			<section className="px-6 pb-16 pt-28 sm:pt-32">
				<div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
					<div>
						<Breadcrumb items={[{ href: LABS_PATH, label: LANDING_COMPANY_NAME }, { href: `${LABS_PATH}#servicios`, label: "Servicios" }, { label: service.title }]} />
						<h1 className={H1}>{page.h1}</h1>
						<p className="mt-6 max-w-xl text-[17px] leading-relaxed text-[#6b6b76] text-pretty">{page.intro}</p>
						<div className="mt-8 flex flex-wrap items-center gap-4">
							<a href="#cotizar" className={PRIMARY_BUTTON}>
								{LABS_HOME.primaryCta}
								<ArrowRight className="h-4 w-4" aria-hidden />
							</a>
							<Link href={LABS_COST_GUIDE_PATH} className="text-sm font-semibold text-[#15151a] underline decoration-black/20 underline-offset-4 hover:decoration-black">
								¿Cuánto cuesta?
							</Link>
						</div>
						<ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#6b6b76]">
							{LABS_HOME.assurances.map((item) => (
								<li key={item} className="inline-flex items-center gap-1.5">
									<Check className="h-3.5 w-3.5 text-[#4f5bff]" strokeWidth={2.5} aria-hidden />
									{item}
								</li>
							))}
						</ul>
					</div>
					<ServiceScreen service={service} />
				</div>
			</section>

			<section className="px-6 py-20 sm:py-24">
				<div className="mx-auto max-w-6xl">
					<div className="labs-reveal max-w-2xl">
						<Eyebrow>Señales</Eyebrow>
						<h2 className={`mt-5 ${H2}`}>Cuándo tiene sentido</h2>
						<p className="mt-4 text-[17px] leading-relaxed text-[#6b6b76]">{service.fit}</p>
					</div>
					<dl className="labs-reveal mt-12 grid gap-x-10 gap-y-8 md:grid-cols-2">
						{page.signals.map((signal) => (
							<div key={signal.title} className="border-t border-[#e8e8ef] pt-5">
								<dt className="text-lg font-semibold tracking-tight">{signal.title}</dt>
								<dd className="mt-2 leading-relaxed text-[#6b6b76] text-pretty">{signal.text}</dd>
							</div>
						))}
					</dl>
				</div>
			</section>

			<section className="px-6 pb-8">
				<div className="labs-reveal mx-auto max-w-6xl rounded-[2.5rem] bg-[#eef0ff] px-7 py-10 sm:px-12 sm:py-14">
					<h2 className={H2}>Qué incluye</h2>
					<ul className="mt-8 grid gap-4 sm:grid-cols-2">
						{service.deliverables.map((item) => (
							<li key={item} className="flex gap-3 text-[17px]">
								<span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[#4f5bff]">
									<Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
								</span>
								{item}
							</li>
						))}
					</ul>
				</div>
			</section>

			{project ? (
				<section className="px-6 py-20 sm:py-24">
					<div className="mx-auto max-w-6xl">
						<div className="labs-reveal max-w-2xl">
							<Eyebrow>Hecho por nosotros</Eyebrow>
							<h2 className={`mt-5 ${H2}`}>{project.project.name}</h2>
							<p className="mt-4 text-[17px] leading-relaxed text-[#6b6b76] text-pretty">{project.page.result}</p>
							<Link href={labsProjectPath(project.page.slug)} className={`mt-6 ${CHIP}`}>
								Ver el caso completo
								<ArrowRight className="h-4 w-4" aria-hidden />
							</Link>
						</div>
						<div className="labs-reveal mt-10">
							<ProjectScreens project={project.project} />
						</div>
					</div>
				</section>
			) : null}

			<Process />
			<Faq items={page.faq} />
			<MoreLinks excludeService={page.id} />
		</LabsSubpageShell>
	);
}

export function LabsProjectPageView({
	page,
	project,
	socialLinks,
	jsonLd,
}: {
	page: LabsProjectPage;
	project: LabsProject;
	socialLinks: LandingSocialLink[];
	jsonLd: string;
}) {
	const services = LABS_SERVICE_PAGES.filter((service) => page.services.includes(service.id));
	const others = LABS_PROJECT_PAGES.filter((other) => other.slug !== page.slug);
	return (
		<LabsSubpageShell jsonLd={jsonLd} socialLinks={socialLinks}>
			<section className="px-6 pb-12 pt-28 sm:pt-32">
				<div className="mx-auto max-w-4xl text-center">
					<Breadcrumb items={[{ href: LABS_PATH, label: LANDING_COMPANY_NAME }, { href: `${LABS_PATH}#proyectos`, label: "Proyectos" }, { label: project.name }]} />
					<h1 className={H1}>{project.name}</h1>
					<p className="mt-3 text-[#6b6b76]">{project.kind}</p>
					{project.href && project.linkLabel ? (
						<a href={project.href} target="_blank" rel="noopener noreferrer" className={`mt-6 ${CHIP}`}>
							{project.linkLabel}
							<ArrowUpRight className="h-4 w-4" aria-hidden />
						</a>
					) : null}
				</div>
				<div className="labs-reveal mt-12">
					<ProjectScreens project={project} />
				</div>
			</section>

			<section className="px-6 py-16 sm:py-20">
				<div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-3">
					{[
						{ label: "El desafío", text: page.challenge },
						{ label: "Lo que construimos", text: page.solution },
						{ label: "El resultado", text: page.result },
					].map((block) => (
						<div key={block.label} className="labs-reveal">
							<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#4f5bff]">{block.label}</p>
							<p className="mt-4 text-[17px] leading-relaxed text-[#3a3a44] text-pretty">{block.text}</p>
						</div>
					))}
				</div>
			</section>

			<section className="px-6 pb-16">
				<div className="labs-reveal mx-auto max-w-6xl rounded-[2.5rem] bg-[#f6f6f8] px-7 py-10 sm:px-12">
					<h2 className={H2}>Qué incluye</h2>
					<ul className="mt-8 grid gap-4 sm:grid-cols-2">
						{project.scope.map((item) => (
							<li key={item} className="flex gap-3 text-[17px]">
								<Check className="mt-1 h-4 w-4 shrink-0 text-[#4f5bff]" strokeWidth={3} aria-hidden />
								{item}
							</li>
						))}
					</ul>
					{services.length > 0 ? (
						<div className="mt-10">
							<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8e8e93]">Servicios del proyecto</p>
							<ul className="mt-4 flex flex-wrap gap-3">
								{services.map((service) => (
									<li key={service.id}>
										<Link href={labsServicePath(service.id)} className={CHIP}>
											{service.metaTitle}
										</Link>
									</li>
								))}
							</ul>
						</div>
					) : null}
				</div>
			</section>

			<section className="px-6 pb-16">
				<div className="mx-auto max-w-6xl">
					<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8e8e93]">Otros proyectos</p>
					<ul className="mt-5 flex flex-wrap gap-3">
						{others.map((other) => (
							<li key={other.slug}>
								<Link href={labsProjectPath(other.slug)} className={CHIP}>
									{other.name}
								</Link>
							</li>
						))}
						<li>
							<Link href={POS_PATH} className={CHIP}>
								{LANDING_PRODUCT_NAME}
							</Link>
						</li>
					</ul>
				</div>
			</section>
		</LabsSubpageShell>
	);
}

export function LabsCostGuideView({ socialLinks, jsonLd }: { socialLinks: LandingSocialLink[]; jsonLd: string }) {
	const guide = LABS_COST_GUIDE;
	return (
		<LabsSubpageShell jsonLd={jsonLd} socialLinks={socialLinks}>
			<section className="px-6 pb-12 pt-28 sm:pt-32">
				<div className="mx-auto max-w-3xl">
					<Breadcrumb items={[{ href: LABS_PATH, label: LANDING_COMPANY_NAME }, { label: "Guía" }]} />
					<h1 className={H1}>{guide.h1}</h1>
					{/* La respuesta corta va primero: es lo que vino a buscar. */}
					<p className="mt-6 text-lg leading-relaxed text-[#3a3a44] text-pretty">{guide.shortAnswer}</p>
				</div>
			</section>

			<section className="px-6 py-16">
				<div className="mx-auto max-w-6xl">
					<h2 className={`labs-reveal ${H2}`}>De qué depende el precio</h2>
					<dl className="labs-reveal mt-10 grid gap-x-10 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
						{guide.factors.map((factor) => (
							<div key={factor.title} className="border-t border-[#e8e8ef] pt-5">
								<dt className="text-lg font-semibold tracking-tight">{factor.title}</dt>
								<dd className="mt-2 leading-relaxed text-[#6b6b76] text-pretty">{factor.text}</dd>
							</div>
						))}
					</dl>
				</div>
			</section>

			<section className="px-6 py-8">
				<div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
					<div className="labs-reveal rounded-[2rem] bg-[#eef0ff] p-8 sm:p-10">
						<h2 className="text-2xl font-semibold tracking-tight">Qué debe incluir una cotización seria</h2>
						<ul className="mt-6 space-y-3">
							{guide.include.map((item) => (
								<li key={item} className="flex gap-3">
									<Check className="mt-1 h-4 w-4 shrink-0 text-[#4f5bff]" strokeWidth={3} aria-hidden />
									<span className="leading-relaxed">{item}</span>
								</li>
							))}
						</ul>
					</div>
					<div className="labs-reveal rounded-[2rem] bg-[#fff8db] p-8 sm:p-10">
						<h2 className="text-2xl font-semibold tracking-tight">Señales de alerta</h2>
						<dl className="mt-6 space-y-4">
							{guide.redFlags.map((flag) => (
								<div key={flag.title} className="flex gap-3">
									<TriangleAlert className="mt-1 h-4 w-4 shrink-0 text-[#b45309]" aria-hidden />
									<div>
										<dt className="font-semibold">{flag.title}</dt>
										<dd className="mt-1 leading-relaxed text-[#5b5b66]">{flag.text}</dd>
									</div>
								</div>
							))}
						</dl>
					</div>
				</div>
			</section>

			<section className="px-6 py-16">
				<div className="mx-auto max-w-6xl">
					<h2 className={`labs-reveal ${H2}`}>Cómo bajar el costo sin perder lo importante</h2>
					<dl className="labs-reveal mt-10 grid gap-x-10 gap-y-8 md:grid-cols-2">
						{guide.saveMoney.map((tip) => (
							<div key={tip.title} className="border-t border-[#e8e8ef] pt-5">
								<dt className="text-lg font-semibold tracking-tight">{tip.title}</dt>
								<dd className="mt-2 leading-relaxed text-[#6b6b76] text-pretty">{tip.text}</dd>
							</div>
						))}
					</dl>
				</div>
			</section>

			<Process />
			<Faq items={guide.faq} />
			<MoreLinks />
		</LabsSubpageShell>
	);
}
