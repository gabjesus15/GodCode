import { Fragment, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, ChevronDown, LayoutDashboard, Monitor, ShoppingBag, Workflow, type LucideIcon } from "lucide-react";

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
	type LabsProject,
} from "@/lib/labs/content";
import { cn } from "@/utils/cn";

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

/** Fondos suaves que se van alternando en tarjetas y grupos: violeta, rosa, amarillo y naranja. */
const TINTS = ["bg-[#eef0ff]", "bg-[#fff0f6]", "bg-[#fff8db]", "bg-[#fff1e8]"] as const;

/** Las tarjetas del método, de color pleno como las de la referencia. */
const PROCESS_COLORS = [
	"bg-[#ff7a3d] text-white",
	"bg-[#ff5fa8] text-white",
	"bg-[#4f5bff] text-white",
	"bg-[#ffd33d] text-[#15151a]",
] as const;

/** Iconos de la frase grande: cada palabra entre llaves del texto lleva uno delante. */
const STATEMENT_ICONS: Record<string, { Icon: LucideIcon; className: string }> = {
	sitios: { Icon: Monitor, className: "bg-[#4f5bff] text-white" },
	sistemas: { Icon: LayoutDashboard, className: "bg-[#ff5fa8] text-white" },
	tiendas: { Icon: ShoppingBag, className: "bg-[#ffd33d] text-[#15151a]" },
	automatizaciones: { Icon: Workflow, className: "bg-[#ff7a3d] text-white" },
};

/**
 * Home corporativa de Gcode Labs: página clara, titular centrado y un gran escenario
 * violeta que crece con el scroll. Aquí habla la empresa, no la campaña del producto.
 */
export function LabsHome({ path, posPath, socialLinks, jsonLd }: LabsHomeProps) {
	const whatsapp = socialLinks.find((link) => link.kind === "whatsapp") ?? null;
	const whatsappHref = whatsapp ? withWhatsAppText(whatsapp.href, LABS_WHATSAPP_GREETING) : null;
	const email = socialLinks.find((link) => link.kind === "email") ?? null;
	const linkedin = socialLinks.find((link) => link.kind === "linkedin") ?? null;
	const instagram = socialLinks.find((link) => link.kind === "instagram") ?? null;
	const year = new Date().getFullYear();

	return (
		<div className="labs-root bg-white text-[#15151a] antialiased">
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
				{/* Hero: titular centrado y, debajo, el escenario con las pantallas de muestra. */}
				<section className="relative overflow-hidden px-6 pb-12 pt-28 sm:pt-32">
					<div className="mx-auto max-w-4xl text-center">
						<LabsSourceBanner href={posPath} productName={LANDING_PRODUCT_NAME} />
						<p className="labs-rise text-xs font-semibold uppercase tracking-[0.2em] text-[#4f5bff]" style={rise(0)}>
							{LABS_HOME.eyebrow}
						</p>
						<h1
							className="labs-rise mt-5 text-[clamp(2.3rem,4.8vw,4.1rem)] font-semibold leading-[1.04] tracking-[-0.03em] text-balance"
							style={rise(1)}
						>
							{LABS_HOME.title}
						</h1>
						<p
							className="labs-rise mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[#6b6b76] text-pretty sm:text-[17px]"
							style={rise(2)}
						>
							{LABS_HOME.intro}
						</p>
						<div className="labs-rise mt-8 flex flex-wrap items-center justify-center gap-3" style={rise(3)}>
							<Link
								href="#cotizar"
								className="inline-flex items-center gap-2 rounded-full bg-[#4f5bff] px-7 py-3.5 text-[15px] font-semibold text-white shadow-[0_18px_40px_-16px_rgba(79,91,255,0.8)] transition-colors hover:bg-[#15151a]"
							>
								{LABS_HOME.primaryCta}
								<ArrowRight className="h-4 w-4" aria-hidden />
							</Link>
							<Link
								href="#proyectos"
								className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-7 py-3.5 text-[15px] font-semibold text-[#15151a] transition-colors hover:border-black/30"
							>
								{LABS_HOME.secondaryCta}
								<ArrowRight className="h-4 w-4" aria-hidden />
							</Link>
						</div>
						{/* Las tres garantías en una línea con punto medio. En el teléfono van una debajo de otra, sin puntos. */}
						<p className="labs-rise mt-6 text-sm leading-relaxed text-[#6b6b76]" style={rise(4)}>
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
				</section>

				{/* La frase grande, con un icono delante de cada tipo de trabajo. */}
				<section className="px-6 py-20 sm:py-28">
					<p className="labs-reveal mx-auto max-w-5xl text-center text-[clamp(1.6rem,3.5vw,3rem)] font-medium leading-[1.3] tracking-[-0.02em] text-balance">
						{statementParts(LABS_HOME.statement).map((part, index) => {
							const icon = part.icon ? STATEMENT_ICONS[part.icon] : undefined;
							if (!icon) return <Fragment key={index}>{part.text}</Fragment>;
							const chip = Object.keys(STATEMENT_ICONS).indexOf(part.icon!);
							return (
								<Fragment key={index}>
									<span
										aria-hidden
										className={cn(
											"labs-pop mr-[0.3em] inline-flex h-[1.1em] w-[1.1em] translate-y-[0.12em] items-center justify-center rounded-[0.32em] align-baseline shadow-[0_10px_24px_-10px_rgba(20,8,90,0.5)]",
											icon.className,
											`labs-stagger-${Math.min(chip, 4)}`,
										)}
									>
										<icon.Icon className="h-[0.6em] w-[0.6em]" strokeWidth={2.4} />
									</span>
									{part.text}
								</Fragment>
							);
						})}
					</p>
				</section>

				{/* Hechos, en cifras reales. */}
				<section className="px-6 pb-8">
					<dl className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
						{LABS_HOME.facts.map((fact, index) => (
							<div
								key={fact.label}
								className={cn("labs-reveal rounded-[2rem] p-7 sm:p-8", TINTS[index % TINTS.length], `labs-stagger-${index}`)}
							>
								<dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#15151a]/60">{fact.label}</dt>
								<dd className="mt-6">
									<span className="text-[clamp(3rem,5.5vw,4.25rem)] font-semibold leading-none tracking-[-0.04em] tabular-nums">
										{fact.value}
									</span>
									{"unit" in fact && fact.unit ? (
										<span className="ml-2 text-lg font-medium text-[#15151a]/70">{fact.unit}</span>
									) : null}
									<p className="mt-4 text-[15px] leading-relaxed text-[#15151a]/70 text-pretty">{fact.detail}</p>
								</dd>
							</div>
						))}
					</dl>
				</section>

				{/* Servicios: tarjetas en una tira horizontal, cada una con su pantalla de muestra. */}
				<section id="servicios" className="labs-track-scope scroll-mt-24 py-24 sm:py-32">
					<div className="mx-auto max-w-6xl px-6">
						<div className="labs-reveal mx-auto max-w-2xl text-center">
							<Eyebrow>{LABS_HOME.servicesEyebrow}</Eyebrow>
							<h2 className="mt-5 text-[clamp(2.2rem,4.6vw,3.75rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-balance">
								{LABS_HOME.servicesTitle}
							</h2>
							<p className="mt-5 text-lg leading-relaxed text-[#6b6b76] text-pretty">{LABS_HOME.servicesIntro}</p>
						</div>
					</div>
					<div className="labs-track mt-14 flex snap-x snap-mandatory gap-5 overflow-x-auto px-6 pb-6 [scrollbar-width:none] sm:px-[max(1.5rem,calc((100vw-72rem)/2))]">
						{LABS_SERVICES.map((service, index) => (
							<article
								key={service.id}
								id={service.id}
								className="flex w-[19rem] shrink-0 snap-start flex-col overflow-hidden rounded-[2rem] border border-black/[0.06] bg-white shadow-[0_30px_60px_-44px_rgba(20,8,90,0.35)] sm:w-[22rem]"
							>
								<ServiceArt id={service.id} index={index} />
								<div className="flex flex-1 flex-col p-7">
									<span className="text-xs font-semibold text-[#4f5bff] tabular-nums">{String(index + 1).padStart(2, "0")}</span>
									<h3 className="mt-3 text-xl font-semibold tracking-tight">{service.title}</h3>
									<p className="mt-3 text-[15px] leading-relaxed text-[#6b6b76] text-pretty">{service.summary}</p>
									<dl className="mt-auto space-y-3 pt-6 text-sm leading-relaxed text-[#6b6b76]">
										<div>
											<dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#15151a]/60">Para quién</dt>
											<dd className="mt-1 text-pretty">{service.fit}</dd>
										</div>
										<div>
											<dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#15151a]/60">Incluye</dt>
											<dd className="mt-1 text-pretty">{sentence(service.deliverables)}</dd>
										</div>
									</dl>
								</div>
							</article>
						))}
					</div>
					<div className="mx-auto mt-2 flex max-w-6xl items-center gap-4 px-6">
						<div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#ececf3]">
							<div className="labs-progress h-full w-full rounded-full bg-[linear-gradient(90deg,#4f5bff,#ff5fa8,#ffd33d)]" />
						</div>
						<p className="text-xs text-[#6b6b76]">Desliza para ver los cinco</p>
					</div>
				</section>

				{/* Cómo trabajamos: la palabra que rueda y cuatro tarjetas de color. */}
				<section id="proceso" className="scroll-mt-24 px-6 py-24 sm:py-32">
					<div className="mx-auto max-w-6xl">
						<div className="labs-reveal text-center">
							<Eyebrow>{LABS_HOME.processEyebrow}</Eyebrow>
							<h2 className="mt-5 text-[clamp(2.2rem,4.6vw,3.75rem)] font-semibold leading-[1.15] tracking-[-0.03em]">
								<span className="sr-only">{LABS_HOME.processTitle}</span>
								<span aria-hidden>
									{LABS_HOME.processTitleLead}{" "}
									<span className="inline-grid h-[1.2em] overflow-hidden rounded-[0.28em] bg-[#ffd33d] px-[0.3em] align-bottom text-[#15151a]">
										<span className="labs-roll grid">
											{[...LABS_HOME.processWords, LABS_HOME.processWords[0]].map((word, index) => (
												<span key={`${index}-${word}`} className="h-[1.2em] whitespace-nowrap leading-[1.2em]">
													{word}
												</span>
											))}
										</span>
									</span>
									<br />
									{LABS_HOME.processTitleTail}
								</span>
							</h2>
						</div>
						<ol className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
							{LABS_PROCESS.map((step, index) => (
								<li
									key={step.num}
									className={cn(
										"labs-reveal relative flex min-h-[19rem] flex-col overflow-hidden rounded-[2rem] p-7",
										PROCESS_COLORS[index % PROCESS_COLORS.length],
										`labs-stagger-${index}`,
									)}
								>
									<span aria-hidden className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/15" />
									<h3 className="relative text-xl font-semibold tracking-tight">{step.title}</h3>
									<p className="relative mt-3 text-[15px] leading-relaxed opacity-90 text-pretty">{step.text}</p>
									<span className="relative mt-auto pt-10 text-[4rem] font-semibold leading-none tracking-[-0.04em] tabular-nums">
										{step.num}
									</span>
								</li>
							))}
						</ol>
					</div>
				</section>

				{/* Con qué construimos: la amplitud del estudio en herramientas reales, sin logos. */}
				<section id="tecnologia" className="scroll-mt-24 px-6 py-24 sm:py-32">
					<div className="mx-auto max-w-6xl">
						<div className="labs-reveal grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
							<div>
								<Eyebrow>{LABS_HOME.stackEyebrow}</Eyebrow>
								<h2 className="mt-5 text-[clamp(2rem,3.8vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-balance">
									{LABS_HOME.stackTitle}
								</h2>
							</div>
							<p className="self-end text-lg leading-relaxed text-[#6b6b76] text-pretty">{LABS_HOME.stackIntro}</p>
						</div>
						<dl className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{LABS_STACK.map((group, index) => (
								<div
									key={group.label}
									className={cn("labs-reveal rounded-[2rem] p-7", TINTS[index % TINTS.length], `labs-stagger-${index % 3}`)}
								>
									<dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#15151a]/60">{group.label}</dt>
									<dd className="mt-4 flex flex-wrap gap-2">
										{group.items.map((item) => (
											<span key={item} className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-[#15151a] shadow-sm">
												{item}
											</span>
										))}
									</dd>
								</div>
							))}
						</dl>
					</div>
				</section>

				{/* Proyectos */}
				<section id="proyectos" className="scroll-mt-24 px-6 py-24 sm:py-32">
					<div className="mx-auto max-w-6xl">
						<div className="labs-reveal text-center">
							<Eyebrow>{LABS_HOME.projectsEyebrow}</Eyebrow>
							<h2 className="mt-5 text-[clamp(2.2rem,4.6vw,3.75rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
								{LABS_HOME.projectsTitle}
							</h2>
						</div>
						<ul className="mt-14 grid gap-6 lg:grid-cols-2">
							{LABS_PROJECTS.map((project, index) => {
								const external = project.href?.startsWith("http");
								const body = (
									<>
										<ProjectArt project={project} index={index} />
										<div className="p-8">
											<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#15151a]/60">{project.kind}</p>
											<h3 className="mt-3 flex items-center gap-2 text-2xl font-semibold tracking-tight">
												{project.name}
												{project.href ? (
													<ArrowUpRight
														className="h-5 w-5 text-[#6b6b76] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
														aria-hidden
													/>
												) : null}
											</h3>
											<p className="mt-3 leading-relaxed text-[#6b6b76] text-pretty">{project.summary}</p>
											<p className="mt-5 text-sm leading-relaxed text-[#6b6b76]">{dotted(project.scope)}</p>
											{project.href && project.linkLabel ? (
												<p className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[#15151a] underline decoration-black/20 underline-offset-4 group-hover:decoration-black/60">
													{project.linkLabel}
												</p>
											) : null}
										</div>
									</>
								);
								const className = cn(
									"labs-reveal group block h-full overflow-hidden rounded-[2rem] border border-black/[0.06] bg-white shadow-[0_30px_60px_-44px_rgba(20,8,90,0.35)] transition-transform duration-300 hover:-translate-y-1",
									`labs-stagger-${index % 2}`,
								);
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
					<section id="equipo" className="scroll-mt-24 px-6 py-24 sm:py-32">
						<div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
							<div className="labs-reveal">
								<Eyebrow>{LABS_HOME.teamEyebrow}</Eyebrow>
								<h2 className="mt-5 text-[clamp(2rem,3.8vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.03em]">
									{LABS_HOME.teamTitle}
								</h2>
								<p className="mt-6 max-w-md text-lg leading-relaxed text-[#6b6b76] text-pretty">{LABS_HOME.teamIntro}</p>
								<p className="mt-6 max-w-md rounded-[1.5rem] bg-[#eef0ff] p-6 text-[15px] leading-relaxed text-[#3a3a44] text-pretty">
									{LABS_HOME.founderNote}
								</p>
							</div>
							<ul className="grid gap-5 self-start sm:grid-cols-2">
								{LABS_TEAM.map((member, index) => (
									<li
										key={member.name}
										className={cn(
											"labs-reveal rounded-[2rem] border border-black/[0.06] bg-white p-7 shadow-[0_30px_60px_-44px_rgba(20,8,90,0.35)]",
											`labs-stagger-${index % 2}`,
										)}
									>
										{/* Con foto real la tarjeta pesa más que con iniciales; basta con poner photoUrl en el contenido. */}
										{member.photoUrl ? (
											<Image src={member.photoUrl} alt={member.name} width={112} height={112} className="h-16 w-16 rounded-full object-cover" />
										) : (
											<div className="flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,#6a5cff,#36219f)] text-lg font-semibold text-white">
												{initials(member.name)}
											</div>
										)}
										<h3 className="mt-5 text-lg font-semibold tracking-tight">{member.name}</h3>
										<p className="mt-1 text-sm text-[#6b6b76]">{member.role}</p>
										{member.linkedinUrl ? (
											<a
												href={member.linkedinUrl}
												target="_blank"
												rel="noopener noreferrer"
												className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#15151a] underline decoration-black/20 underline-offset-4 hover:decoration-black/60"
											>
												LinkedIn
												<ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
											</a>
										) : null}
									</li>
								))}
							</ul>
						</div>
					</section>
				) : null}

				{/* Preguntas frecuentes, en acordeón. El JSON-LD de arriba lleva las mismas preguntas. */}
				<section id="preguntas" className="scroll-mt-24 px-6 py-24 sm:py-32">
					<div className="mx-auto max-w-3xl">
						<div className="labs-reveal text-center">
							<Eyebrow>{LABS_HOME.faqEyebrow}</Eyebrow>
							<h2 className="mt-5 text-[clamp(2.2rem,4.6vw,3.75rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
								{LABS_HOME.faqTitle}
							</h2>
						</div>
						<div className="labs-reveal mt-12 divide-y divide-[#e8e8ef] border-y border-[#e8e8ef]">
							{LABS_FAQ.map((item) => (
								<details key={item.question} className="group py-5">
									<summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-left text-lg font-semibold tracking-tight [&::-webkit-details-marker]:hidden">
										{item.question}
										<ChevronDown className="h-5 w-5 shrink-0 text-[#6b6b76] transition-transform duration-300 group-open:rotate-180" aria-hidden />
									</summary>
									<p className="mt-3 max-w-2xl leading-relaxed text-[#6b6b76] text-pretty">{item.answer}</p>
								</details>
							))}
						</div>
					</div>
				</section>

				{/* Cotizar: el cierre, dentro de un panel violeta como el del hero. */}
				<section id="cotizar" className="scroll-mt-24 px-6 pb-16 pt-6 sm:pb-24">
					<div className="labs-reveal relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-[linear-gradient(135deg,#6a5cff_0%,#4a2fd8_55%,#36219f_100%)] px-6 py-12 text-white sm:px-12 sm:py-16">
						<span
							aria-hidden
							className="pointer-events-none absolute -bottom-12 -left-10 h-40 w-40 rounded-full bg-[radial-gradient(circle_at_30%_30%,#ffe9a3,#ffb13d_55%,#e5651a)] opacity-90 blur-[1px]"
						/>
						<span
							aria-hidden
							className="pointer-events-none absolute -bottom-16 right-[38%] h-44 w-44 rounded-full border-[24px] border-[#ff5fa8] opacity-80 lg:right-[44%]"
						/>
						<div className="relative grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
							<div>
								<p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">{LABS_HOME.quoteEyebrow}</p>
								<h2 className="mt-5 text-[clamp(2rem,3.8vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-balance">
									{LABS_HOME.quoteTitle}
								</h2>
								<p className="mt-6 max-w-md text-lg leading-relaxed text-white/80 text-pretty">{LABS_HOME.quoteText}</p>
								<ul className="mt-10 space-y-4 text-[15px]">
									{whatsapp && whatsappHref ? (
										<li>
											<span className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/60">WhatsApp</span>
											<a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block font-semibold hover:underline">
												{phoneDisplay(whatsapp.display)}
											</a>
										</li>
									) : null}
									{email ? (
										<li>
											<span className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Correo</span>
											<a href={email.href} className="mt-1 inline-block font-semibold hover:underline">
												{email.display}
											</a>
										</li>
									) : null}
									<li>
										<span className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Dónde</span>
										<span className="mt-1 inline-block font-semibold">Santiago de Chile · trabajo a distancia en Chile y Venezuela</span>
									</li>
								</ul>
							</div>
							<QuoteForm whatsappHref={whatsappHref} />
						</div>
					</div>
				</section>
			</main>

			<footer className="px-6 pb-12">
				<div className="mx-auto flex max-w-6xl flex-col gap-8 border-t border-[#e8e8ef] pt-10 md:flex-row md:items-start md:justify-between">
					<div className="max-w-sm">
						<p className="text-lg font-semibold tracking-tight">{LANDING_COMPANY_NAME}</p>
						<p className="mt-2 text-sm leading-relaxed text-[#6b6b76]">{LABS_HOME.footerNote}</p>
					</div>
					<nav aria-label="Pie de página" className="grid grid-cols-2 gap-x-12 gap-y-3 text-sm sm:grid-cols-3">
						<Link href="#servicios" className="text-[#3a3a44] hover:text-[#15151a]">
							Servicios
						</Link>
						<Link href="#proyectos" className="text-[#3a3a44] hover:text-[#15151a]">
							Proyectos
						</Link>
						<Link href={posPath} className="text-[#3a3a44] hover:text-[#15151a]">
							{LANDING_PRODUCT_NAME}
						</Link>
						<Link href="/sobre-godcode" className="text-[#3a3a44] hover:text-[#15151a]">
							Sobre nosotros
						</Link>
						{linkedin ? (
							<a href={linkedin.href} target="_blank" rel="noopener noreferrer" className="text-[#3a3a44] hover:text-[#15151a]">
								LinkedIn
							</a>
						) : null}
						{instagram ? (
							<a href={instagram.href} target="_blank" rel="noopener noreferrer" className="text-[#3a3a44] hover:text-[#15151a]">
								Instagram
							</a>
						) : null}
						<Link href="/onboarding/terminos" className="text-[#3a3a44] hover:text-[#15151a]">
							Términos
						</Link>
						<Link href="/onboarding/privacidad" className="text-[#3a3a44] hover:text-[#15151a]">
							Privacidad
						</Link>
					</nav>
				</div>
				<div className="mx-auto max-w-6xl pt-8 text-xs text-[#8e8e93]">
					© {year} {LANDING_COMPANY_NAME}. {LANDING_PRODUCT_NAME} es un producto de {LANDING_COMPANY_NAME}.
				</div>
			</footer>
		</div>
	);
}

/** Etiqueta pequeña de sección, en píldora. */
function Eyebrow({ children }: { children: ReactNode }) {
	return (
		<p className="inline-flex items-center rounded-full border border-black/[0.08] bg-white px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4f5bff]">
			{children}
		</p>
	);
}

/**
 * Pantalla de muestra de cada servicio, dibujada solo con CSS: una web, un panel, una tienda,
 * una automatización y el mantenimiento. Ilustraciones, no clientes; van ocultas a lectores de pantalla.
 */
function ServiceArt({ id, index }: { id: string; index: number }) {
	const tint = TINTS[index % TINTS.length];
	return (
		<div aria-hidden className={cn("relative h-44 overflow-hidden", tint)}>
			<span className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(20,8,90,0.12)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:radial-gradient(70%_70%_at_80%_20%,#000,transparent)]" />
			{id === "sitios-web" ? (
				<div className="absolute inset-x-8 bottom-0 top-8 rounded-t-2xl bg-white p-4 shadow-[0_20px_40px_-24px_rgba(20,8,90,0.5)]">
					<div className="flex gap-1.5">
						<span className="h-2 w-2 rounded-full bg-[#ff7a3d]" />
						<span className="h-2 w-2 rounded-full bg-[#ffd33d]" />
						<span className="h-2 w-2 rounded-full bg-[#22c58b]" />
					</div>
					<span className="mt-4 block h-3 w-2/3 rounded-full bg-[#15151a]" />
					<span className="mt-2 block h-2 w-5/6 rounded-full bg-[#e8e8ef]" />
					<span className="mt-1.5 block h-2 w-1/2 rounded-full bg-[#e8e8ef]" />
					<span className="mt-4 inline-block h-7 w-24 rounded-full bg-[#4f5bff]" />
				</div>
			) : null}
			{id === "sistemas-a-medida" ? (
				<div className="absolute inset-x-8 bottom-0 top-8 flex overflow-hidden rounded-t-2xl bg-white shadow-[0_20px_40px_-24px_rgba(20,8,90,0.5)]">
					<div className="w-14 space-y-2 bg-[#15151a] p-3">
						<span className="block h-2 w-full rounded-full bg-white/80" />
						<span className="block h-2 w-full rounded-full bg-white/30" />
						<span className="block h-2 w-full rounded-full bg-white/30" />
						<span className="block h-2 w-full rounded-full bg-white/30" />
					</div>
					<div className="flex-1 space-y-2 p-4">
						{[82, 64, 70, 48].map((width, row) => (
							<div key={row} className="flex items-center gap-2">
								<span className={cn("h-2 w-2 rounded-full", row === 1 ? "bg-[#ff5fa8]" : "bg-[#22c58b]")} />
								<span className="h-2 rounded-full bg-[#e8e8ef]" style={{ width: `${width}%` }} />
							</div>
						))}
					</div>
				</div>
			) : null}
			{id === "tiendas-y-pedidos" ? (
				<div className="absolute inset-x-8 bottom-0 top-8 grid grid-cols-2 gap-3 rounded-t-2xl bg-white p-4 shadow-[0_20px_40px_-24px_rgba(20,8,90,0.5)]">
					{["#4f5bff", "#ff5fa8", "#ffd33d", "#ff7a3d"].map((color) => (
						<div key={color} className="rounded-xl border border-[#e8e8ef] p-2">
							<span className="block h-10 rounded-lg" style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }} />
							<span className="mt-2 block h-2 w-3/4 rounded-full bg-[#e8e8ef]" />
						</div>
					))}
					<span className="absolute right-3 top-3 inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-[#15151a] px-2 text-[11px] font-semibold text-white">
						3
					</span>
				</div>
			) : null}
			{id === "integraciones" ? (
				<div className="absolute inset-x-8 top-1/2 flex -translate-y-1/2 items-center justify-between">
					{["WhatsApp", "Tu sistema", "Planilla"].map((node, position) => (
						<Fragment key={node}>
							{position > 0 ? <span className="h-0.5 flex-1 bg-[repeating-linear-gradient(90deg,#15151a_0_6px,transparent_6px_12px)] opacity-40" /> : null}
							<span
								className={cn(
									"rounded-full px-3 py-2 text-xs font-semibold shadow-[0_14px_30px_-16px_rgba(20,8,90,0.5)]",
									position === 1 ? "bg-[#15151a] text-white" : "bg-white text-[#15151a]",
								)}
							>
								{node}
							</span>
						</Fragment>
					))}
				</div>
			) : null}
			{id === "mantenimiento" ? (
				<div className="absolute inset-x-8 bottom-0 top-8 rounded-t-2xl bg-white p-4 shadow-[0_20px_40px_-24px_rgba(20,8,90,0.5)]">
					<div className="flex items-center justify-between text-xs">
						<span className="font-semibold text-[#15151a]">Disponibilidad</span>
						<span className="rounded-full bg-[#e3f8ee] px-2 py-0.5 font-semibold text-[#15804f]">En línea</span>
					</div>
					<div className="mt-3 flex gap-1">
						{Array.from({ length: 24 }, (_, day) => (
							<span key={day} className={cn("h-6 flex-1 rounded-sm", day === 9 ? "bg-[#ffd33d]" : "bg-[#22c58b]")} />
						))}
					</div>
					<div className="mt-3 flex items-center gap-2 text-xs text-[#6b6b76]">
						<span className="rounded-full bg-[#f4f4f8] px-2 py-0.5 font-medium text-[#15151a]">v2.4</span>
						<ArrowRight className="h-3 w-3" />
						<span className="rounded-full bg-[#4f5bff] px-2 py-0.5 font-medium text-white">v2.5</span>
						<span>actualización aplicada</span>
					</div>
				</div>
			) : null}
		</div>
	);
}

/** Cabecera de la tarjeta de proyecto: una ventana de navegador de muestra sobre un fondo de color. */
function ProjectArt({ project, index }: { project: LabsProject; index: number }) {
	const external = project.href?.startsWith("http");
	const address = external ? safeHostname(project.href!) : `${LANDING_PRODUCT_NAME.toLowerCase().replace(/\s+/g, "")}.app`;
	const gradient = index % 2 === 0 ? "bg-[linear-gradient(135deg,#6a5cff_0%,#4a2fd8_60%,#36219f_100%)]" : "bg-[linear-gradient(135deg,#ff7a3d_0%,#ff5fa8_60%,#c7368a_100%)]";
	return (
		<div aria-hidden className={cn("relative h-56 overflow-hidden", gradient)}>
			<span className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:20px_20px] [mask-image:radial-gradient(70%_70%_at_20%_20%,#000,transparent)]" />
			<div className="absolute inset-x-10 bottom-0 top-10 rounded-t-2xl bg-white p-5 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6)] transition-transform duration-500 group-hover:-translate-y-2">
				<div className="flex items-center gap-2">
					<span className="h-2 w-2 rounded-full bg-[#ff7a3d]" />
					<span className="h-2 w-2 rounded-full bg-[#ffd33d]" />
					<span className="h-2 w-2 rounded-full bg-[#22c58b]" />
					<span className="ml-2 flex-1 truncate rounded-full bg-[#f4f4f8] px-3 py-1 text-[11px] text-[#6b6b76]">{address}</span>
				</div>
				<p className="mt-5 text-xl font-semibold tracking-tight text-[#15151a]">{project.name}</p>
				<span className="mt-3 block h-2 w-5/6 rounded-full bg-[#e8e8ef]" />
				<span className="mt-1.5 block h-2 w-3/5 rounded-full bg-[#e8e8ef]" />
				{project.linkLabel ? (
					<span className="mt-4 inline-block rounded-full bg-[#15151a] px-3 py-1.5 text-[11px] font-semibold text-white">{project.linkLabel}</span>
				) : null}
			</div>
		</div>
	);
}

function safeHostname(href: string): string {
	try {
		return new URL(href).hostname.replace(/^www\./, "");
	} catch {
		return href;
	}
}

/** Parte la frase grande en texto y palabras con icono: «{sitios} que convierten» → icono + «sitios que convierten». */
function statementParts(text: string): Array<{ text: string; icon?: string }> {
	const parts: Array<{ text: string; icon?: string }> = [];
	const pattern = /\{(\w+)\}/g;
	let last = 0;
	for (const match of text.matchAll(pattern)) {
		const index = match.index ?? 0;
		if (index > last) parts.push({ text: text.slice(last, index) });
		parts.push({ text: match[1]!, icon: match[1] });
		last = index + match[0].length;
	}
	if (last < text.length) parts.push({ text: text.slice(last) });
	return parts;
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
