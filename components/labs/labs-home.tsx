import { Fragment, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";

import { LANDING_COMPANY_NAME, LANDING_PRODUCT_NAME } from "@/lib/landing/brand";
import type { LandingSocialLink } from "@/lib/landing/contact";
import {
	LABS_FAQ,
	LABS_HOME,
	LABS_PROCESS,
	LABS_PROJECTS,
	LABS_SERVICES,
	LABS_STACK,
	LABS_TEAM,
	LABS_WHATSAPP_GREETING,
} from "@/lib/labs/content";

import { LabsHeroVisual } from "./labs-hero-visual";
import { LabsNavbar, type LabsNavLink } from "./labs-navbar";
import { LabsSourceBanner } from "./labs-source-banner";
import { QuoteForm } from "./quote-form";
import "./labs.css";

type LabsHomeProps = {
	/** Ruta donde vive esta página («/» cuando sea la raíz; «/labs» en la vista previa). */
	path: string;
	/** Ruta del landing de Gcode POS. */
	posPath: string;
	socialLinks: LandingSocialLink[];
	jsonLd: string;
};

/** El producto propio no va entre las secciones: tiene su propio enlace, discreto, a la derecha, para quien llega buscándolo. */
const NAV_LINKS: LabsNavLink[] = [
	{ label: "Servicios", href: "#servicios" },
	{ label: "Cómo trabajamos", href: "#proceso" },
	{ label: "Proyectos", href: "#proyectos" },
	{ label: "Equipo", href: "#equipo" },
];

/** Orden de entrada de cada bloque del hero (`--labs-i` en labs.css). */
const rise = (order: number) => ({ "--labs-i": order }) as CSSProperties;

/**
 * Home corporativa de Gcode Labs. Fondo claro y tipografía sobria, a diferencia
 * del landing del producto: aquí habla la empresa, no la campaña.
 */
export function LabsHome({ path, posPath, socialLinks, jsonLd }: LabsHomeProps) {
	const whatsapp = socialLinks.find((link) => link.kind === "whatsapp") ?? null;
	const whatsappHref = whatsapp ? withWhatsAppText(whatsapp.href, LABS_WHATSAPP_GREETING) : null;
	const email = socialLinks.find((link) => link.kind === "email") ?? null;
	const linkedin = socialLinks.find((link) => link.kind === "linkedin") ?? null;
	const instagram = socialLinks.find((link) => link.kind === "instagram") ?? null;
	const year = new Date().getFullYear();

	return (
		<div className="bg-white text-[#1d1d1f] antialiased">
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: structured data JSON-LD must be inline for Googlebot
				dangerouslySetInnerHTML={{ __html: jsonLd }}
			/>
			<LabsNavbar
				links={NAV_LINKS}
				homeHref={path}
				ctaHref="#cotizar"
				ctaLabel={LABS_HOME.primaryCta}
				companyName={LANDING_COMPANY_NAME}
				product={{ label: LANDING_PRODUCT_NAME, href: posPath }}
			/>

			<main>
				{/* Hero: la promesa a la izquierda y, a la derecha, cuatro pantallas de muestra de lo que construimos. */}
				<section className="relative overflow-hidden bg-[#080808] px-6 pb-20 pt-32 text-[#f4f4f5] sm:pb-28 sm:pt-40 lg:pb-32 lg:pt-44">
					<div className="mx-auto grid max-w-6xl gap-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-center lg:gap-12">
						<div>
							<LabsSourceBanner href={posPath} productName={LANDING_PRODUCT_NAME} />
							<p className="labs-rise text-xs font-medium uppercase tracking-[0.2em] text-[#a1a1aa]" style={rise(0)}>
								{LABS_HOME.eyebrow}
							</p>
							<h1
								className="labs-rise mt-6 text-[clamp(2.5rem,4.8vw,4.25rem)] font-semibold leading-[1.04] tracking-[-0.035em] text-balance"
								style={rise(1)}
							>
								{LABS_HOME.title}
							</h1>
							<p className="labs-rise mt-7 max-w-xl text-base leading-relaxed text-[#a1a1aa] text-pretty sm:text-lg" style={rise(2)}>
								{LABS_HOME.intro}
							</p>
							<div className="labs-rise mt-9 flex flex-wrap items-center gap-x-7 gap-y-4" style={rise(3)}>
								<Link
									href="#cotizar"
									className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-[15px] font-semibold text-[#0d0d0d] transition-colors hover:bg-[#4f5bff] hover:text-white"
								>
									{LABS_HOME.primaryCta}
									<ArrowRight className="h-4 w-4" aria-hidden />
								</Link>
								<Link
									href="#proyectos"
									className="inline-flex items-center gap-1.5 text-[15px] font-medium text-[#d4d4d8] underline decoration-white/20 underline-offset-[6px] transition-colors hover:text-white hover:decoration-white/60"
								>
									{LABS_HOME.secondaryCta}
									<ArrowRight className="h-4 w-4" aria-hidden />
								</Link>
							</div>
							{/* Las tres garantías en una línea con punto medio, como en el landing del producto. En el teléfono van una debajo de otra, sin puntos. */}
							<p className="labs-rise mt-8 text-sm leading-relaxed text-[#a1a1aa]" style={rise(4)}>
								{LABS_HOME.assurances.map((item, index) => (
									<Fragment key={item}>
										{index > 0 ? " " : null}
										<span className="block whitespace-nowrap sm:inline">
											{index > 0 ? (
												<span aria-hidden className="ml-1 mr-2 hidden sm:inline">
													·
												</span>
											) : null}
											{item}
										</span>
									</Fragment>
								))}
							</p>
						</div>
						<LabsHeroVisual />
					</div>
				</section>

				{/* Hechos */}
				<section className="border-b border-[#e5e5ea] bg-[#fbfbfd]">
					<div className="mx-auto max-w-6xl px-6">
						<dl className="labs-reveal grid divide-y divide-[#e5e5ea] sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
							{LABS_HOME.facts.map((fact) => (
								<div key={fact.label} className="py-9 sm:px-8 sm:first:pl-0 lg:last:pr-0">
									<dt className="border-t-2 border-[#4f5bff] pt-4 text-base font-semibold tracking-tight">{fact.label}</dt>
									<dd className="mt-1.5 text-sm leading-relaxed text-[#6e6e73]">{fact.detail}</dd>
								</div>
							))}
						</dl>
					</div>
				</section>

				{/* Servicios */}
				<section id="servicios" className="scroll-mt-24 bg-white">
					<div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
						<div className="labs-reveal grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
							<div>
								<p className="text-xs font-medium uppercase tracking-[0.2em] text-[#8e8e93]">{LABS_HOME.servicesEyebrow}</p>
								<h2 className="mt-4 text-[clamp(2rem,3.6vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-balance">
									{LABS_HOME.servicesTitle}
								</h2>
							</div>
							<p className="self-end text-lg leading-relaxed text-[#6e6e73] text-pretty">{LABS_HOME.servicesIntro}</p>
						</div>

						<ol className="mt-16 divide-y divide-[#e5e5ea] border-y border-[#e5e5ea]">
							{LABS_SERVICES.map((service, index) => (
								<li
									key={service.id}
									id={service.id}
									className="labs-reveal group scroll-mt-24 grid gap-6 py-10 lg:grid-cols-[6rem_minmax(0,1fr)_minmax(0,1fr)] lg:gap-12"
								>
									<span className="font-mono text-sm text-[#8e8e93] transition-colors duration-300 group-hover:text-[#4f5bff]">
										{String(index + 1).padStart(2, "0")}
									</span>
									<div>
										<h3 className="text-2xl font-semibold tracking-tight">{service.title}</h3>
										<p className="mt-3 max-w-lg leading-relaxed text-[#6e6e73] text-pretty">{service.summary}</p>
									</div>
									{/* Para quién y qué incluye, en dos líneas de prosa: se leen de corrido y no parecen una ficha. */}
									<dl className="space-y-4 self-start text-[15px] leading-relaxed text-[#6e6e73]">
										<div>
											<dt className="text-xs font-medium uppercase tracking-[0.18em] text-[#8e8e93]">Para quién</dt>
											<dd className="mt-1 text-pretty">{service.fit}</dd>
										</div>
										<div>
											<dt className="text-xs font-medium uppercase tracking-[0.18em] text-[#8e8e93]">Incluye</dt>
											<dd className="mt-1 text-pretty">{sentence(service.deliverables)}</dd>
										</div>
									</dl>
								</li>
							))}
						</ol>
					</div>
				</section>

				{/* Proceso */}
				<section id="proceso" className="scroll-mt-24 border-t border-[#e5e5ea] bg-[#fbfbfd]">
					<div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
						<div className="labs-reveal">
							<p className="text-xs font-medium uppercase tracking-[0.2em] text-[#8e8e93]">{LABS_HOME.processEyebrow}</p>
							<h2 className="mt-4 max-w-2xl text-[clamp(2rem,3.6vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-balance">
								{LABS_HOME.processTitle}
							</h2>
						</div>
						<ol className="labs-reveal mt-16 grid gap-px overflow-hidden rounded-2xl border border-[#e5e5ea] bg-[#e5e5ea] sm:grid-cols-2 lg:grid-cols-4">
							{LABS_PROCESS.map((step) => (
								<li key={step.num} className="flex flex-col bg-white p-8">
									<span className="font-mono text-sm text-[#4f5bff]">{step.num}</span>
									<h3 className="mt-6 text-xl font-semibold tracking-tight">{step.title}</h3>
									<p className="mt-3 text-[15px] leading-relaxed text-[#6e6e73] text-pretty">{step.text}</p>
								</li>
							))}
						</ol>
					</div>
				</section>

				{/* Con qué construimos: la amplitud del estudio en herramientas reales, sin logos. */}
				<section id="tecnologia" className="scroll-mt-24 bg-[#080808] text-[#f4f4f5]">
					<div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
						<div className="labs-reveal grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
							<div>
								<p className="text-xs font-medium uppercase tracking-[0.2em] text-[#a1a1aa]">{LABS_HOME.stackEyebrow}</p>
								<h2 className="mt-4 text-[clamp(2rem,3.6vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-balance">
									{LABS_HOME.stackTitle}
								</h2>
							</div>
							<p className="self-end text-lg leading-relaxed text-[#a1a1aa] text-pretty">{LABS_HOME.stackIntro}</p>
						</div>
						<dl className="labs-reveal mt-16 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
							{LABS_STACK.map((group) => (
								<div key={group.label} className="bg-[#0d0d0f] p-7 transition-colors duration-300 hover:bg-[#121216]">
									<dt className="text-xs font-medium uppercase tracking-[0.18em] text-[#8b93ff]">{group.label}</dt>
									<dd className="mt-3 text-[15px] leading-relaxed text-[#d4d4d8]">{dotted(group.items)}</dd>
								</div>
							))}
						</dl>
					</div>
				</section>

				{/* Proyectos */}
				<section id="proyectos" className="scroll-mt-24 bg-white">
					<div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
						<div className="labs-reveal">
							<p className="text-xs font-medium uppercase tracking-[0.2em] text-[#8e8e93]">{LABS_HOME.projectsEyebrow}</p>
							<h2 className="mt-4 text-[clamp(2rem,3.6vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.03em]">
								{LABS_HOME.projectsTitle}
							</h2>
						</div>
						<ul className="labs-reveal mt-14 grid gap-6 lg:grid-cols-2">
							{LABS_PROJECTS.map((project) => {
								const external = project.href?.startsWith("http");
								const body = (
									<>
										<p className="text-xs font-medium uppercase tracking-[0.2em] text-[#8e8e93]">{project.kind}</p>
										<h3 className="mt-4 flex items-center gap-2 text-2xl font-semibold tracking-tight">
											{project.name}
											{project.href ? (
												<ArrowUpRight className="h-5 w-5 text-[#8e8e93] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
											) : null}
										</h3>
										<p className="mt-3 leading-relaxed text-[#6e6e73] text-pretty">{project.summary}</p>
										<p className="mt-6 text-sm leading-relaxed text-[#6e6e73]">{dotted(project.scope)}</p>
										{project.href && project.linkLabel ? (
											<p className="mt-6 text-sm font-medium text-[#1d1d1f] underline decoration-black/20 underline-offset-4 group-hover:decoration-black/60">
												{project.linkLabel}
											</p>
										) : null}
									</>
								);
								const className =
									"group block h-full rounded-2xl border border-[#e5e5ea] bg-[#fbfbfd] p-8 transition-colors hover:border-[#c7c7cc] sm:p-10";
								return (
									<li key={project.name}>
										{project.href ? (
											external ? (
												<a href={project.href} target="_blank" rel="noopener noreferrer" className={className}>
													{body}
												</a>
											) : (
												<Link href={project.href === "/pos" ? posPath : project.href} className={className}>
													{body}
												</Link>
											)
										) : (
											<div className={className}>{body}</div>
										)}
									</li>
								);
							})}
						</ul>
					</div>
				</section>

				{/* Equipo */}
				{LABS_TEAM.length > 0 ? (
					<section id="equipo" className="scroll-mt-24 border-t border-[#e5e5ea] bg-[#fbfbfd]">
						<div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
							<div className="labs-reveal grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
								<div>
									<p className="text-xs font-medium uppercase tracking-[0.2em] text-[#8e8e93]">{LABS_HOME.teamEyebrow}</p>
									<h2 className="mt-4 text-[clamp(2rem,3.6vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.03em]">
										{LABS_HOME.teamTitle}
									</h2>
									<p className="mt-6 max-w-md text-lg leading-relaxed text-[#6e6e73] text-pretty">{LABS_HOME.teamIntro}</p>
									<p className="mt-6 max-w-md border-l-2 border-[#4f5bff] pl-5 text-[15px] leading-relaxed text-[#3a3a3f] text-pretty">
										{LABS_HOME.founderNote}
									</p>
								</div>
								<ul className="grid gap-6 self-start sm:grid-cols-2">
									{LABS_TEAM.map((member) => (
										<li key={member.name} className="rounded-2xl border border-[#e5e5ea] bg-white p-7">
											{/* Con foto real la tarjeta pesa más que con iniciales; basta con poner photoUrl en el contenido. */}
											{member.photoUrl ? (
												<Image
													src={member.photoUrl}
													alt={member.name}
													width={112}
													height={112}
													className="h-14 w-14 rounded-full object-cover"
												/>
											) : (
												<div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1d1d1f] text-lg font-semibold text-white">
													{initials(member.name)}
												</div>
											)}
											<h3 className="mt-5 text-lg font-semibold tracking-tight">{member.name}</h3>
											<p className="mt-1 text-sm text-[#6e6e73]">{member.role}</p>
											{member.linkedinUrl ? (
												<a
													href={member.linkedinUrl}
													target="_blank"
													rel="noopener noreferrer"
													className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#1d1d1f] underline decoration-black/20 underline-offset-4 hover:decoration-black/60"
												>
													LinkedIn
													<ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
												</a>
											) : null}
										</li>
									))}
								</ul>
							</div>
						</div>
					</section>
				) : null}

				{/* Preguntas frecuentes */}
				<section id="preguntas" className="scroll-mt-24 border-t border-[#e5e5ea] bg-white">
					<div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
						<div className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
							<div className="lg:sticky lg:top-28 lg:self-start">
								<p className="text-xs font-medium uppercase tracking-[0.2em] text-[#8e8e93]">{LABS_HOME.faqEyebrow}</p>
								<h2 className="mt-4 text-[clamp(2rem,3.6vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.03em]">
									{LABS_HOME.faqTitle}
								</h2>
							</div>
							<dl className="labs-reveal divide-y divide-[#e5e5ea] border-y border-[#e5e5ea]">
								{LABS_FAQ.map((item) => (
									<div key={item.question} className="py-7">
										<dt className="text-lg font-semibold tracking-tight">{item.question}</dt>
										<dd className="mt-3 max-w-2xl leading-relaxed text-[#6e6e73] text-pretty">{item.answer}</dd>
									</div>
								))}
							</dl>
						</div>
					</div>
				</section>

				{/* Cotizar */}
				<section id="cotizar" className="scroll-mt-24 border-t border-[#e5e5ea] bg-[#fbfbfd]">
					<div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
						<div className="labs-reveal grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
							<div>
								<p className="text-xs font-medium uppercase tracking-[0.2em] text-[#8e8e93]">{LABS_HOME.quoteEyebrow}</p>
								<h2 className="mt-4 text-[clamp(2rem,3.6vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-balance">
									{LABS_HOME.quoteTitle}
								</h2>
								<p className="mt-6 max-w-md text-lg leading-relaxed text-[#6e6e73] text-pretty">{LABS_HOME.quoteText}</p>
								<ul className="mt-10 space-y-4 text-[15px]">
									{whatsapp && whatsappHref ? (
										<li>
											<span className="block text-xs font-medium uppercase tracking-[0.18em] text-[#8e8e93]">WhatsApp</span>
											<a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block font-medium hover:underline">
												{phoneDisplay(whatsapp.display)}
											</a>
										</li>
									) : null}
									{email ? (
										<li>
											<span className="block text-xs font-medium uppercase tracking-[0.18em] text-[#8e8e93]">Correo</span>
											<a href={email.href} className="mt-1 inline-block font-medium hover:underline">
												{email.display}
											</a>
										</li>
									) : null}
									<li>
										<span className="block text-xs font-medium uppercase tracking-[0.18em] text-[#8e8e93]">Dónde</span>
										<span className="mt-1 inline-block font-medium">Santiago de Chile · trabajo a distancia en Chile y Venezuela</span>
									</li>
								</ul>
							</div>
							<QuoteForm whatsappHref={whatsappHref} />
						</div>
					</div>
				</section>
			</main>

			<footer className="border-t border-[#e5e5ea] bg-white">
				<div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12 md:flex-row md:items-start md:justify-between">
					<div className="max-w-sm">
						<p className="text-lg font-semibold tracking-tight">{LANDING_COMPANY_NAME}</p>
						<p className="mt-2 text-sm leading-relaxed text-[#6e6e73]">{LABS_HOME.footerNote}</p>
					</div>
					<nav aria-label="Pie de página" className="grid grid-cols-2 gap-x-12 gap-y-3 text-sm sm:grid-cols-3">
						<Link href="#servicios" className="text-[#3a3a3f] hover:text-[#1d1d1f]">
							Servicios
						</Link>
						<Link href="#proyectos" className="text-[#3a3a3f] hover:text-[#1d1d1f]">
							Proyectos
						</Link>
						<Link href={posPath} className="text-[#3a3a3f] hover:text-[#1d1d1f]">
							{LANDING_PRODUCT_NAME}
						</Link>
						<Link href="/sobre-godcode" className="text-[#3a3a3f] hover:text-[#1d1d1f]">
							Sobre nosotros
						</Link>
						{linkedin ? (
							<a href={linkedin.href} target="_blank" rel="noopener noreferrer" className="text-[#3a3a3f] hover:text-[#1d1d1f]">
								LinkedIn
							</a>
						) : null}
						{instagram ? (
							<a href={instagram.href} target="_blank" rel="noopener noreferrer" className="text-[#3a3a3f] hover:text-[#1d1d1f]">
								Instagram
							</a>
						) : null}
						<Link href="/onboarding/terminos" className="text-[#3a3a3f] hover:text-[#1d1d1f]">
							Términos
						</Link>
						<Link href="/onboarding/privacidad" className="text-[#3a3a3f] hover:text-[#1d1d1f]">
							Privacidad
						</Link>
					</nav>
				</div>
				<div className="mx-auto max-w-6xl px-6 pb-10 text-xs text-[#8e8e93]">
					© {year} {LANDING_COMPANY_NAME}. {LANDING_PRODUCT_NAME} es un producto de {LANDING_COMPANY_NAME}.
				</div>
			</footer>
		</div>
	);
}

/** Añade el saludo al enlace de WhatsApp (wa.me acepta `text`). */
function withWhatsAppText(href: string, text: string): string {
	try {
		const url = new URL(href);
		url.searchParams.set("text", text);
		return url.toString();
	} catch {
		return href;
	}
}

function initials(name: string): string {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? "")
		.join("");
}

/** Une piezas cortas con punto medio, la misma línea gris del landing del producto. */
function dotted(items: readonly string[]): string {
	return items.join(" · ");
}

/** Convierte una lista en una frase: «Diseño y contenido, SEO técnico, analítica y formularios.» Respeta siglas y marcas. */
function sentence(items: readonly string[]): string {
	const parts = items.map((item, index) => {
		if (index === 0 || !item[1] || item[1] !== item[1].toLowerCase()) return item;
		return item[0]!.toLowerCase() + item.slice(1);
	});
	return `${parts.join(", ")}.`;
}

/** Número legible: +56943848080 → +56 9 4384 8080; +584121234567 → +58 412 123 4567. Otros, tal cual. */
function phoneDisplay(display: string): string {
	const chile = display.match(/^\+56(9\d{8})$/);
	if (chile) return `+56 ${chile[1]!.slice(0, 1)} ${chile[1]!.slice(1, 5)} ${chile[1]!.slice(5)}`;
	const venezuela = display.match(/^\+58(\d{3})(\d{3})(\d{4})$/);
	if (venezuela) return `+58 ${venezuela[1]} ${venezuela[2]} ${venezuela[3]}`;
	return display;
}
