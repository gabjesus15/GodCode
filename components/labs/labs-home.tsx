import { Fragment, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, ChevronDown, LayoutDashboard, Monitor, ShoppingBag, Workflow, type LucideIcon } from "lucide-react";

import { LandingInstagramIcon, LandingLinkedInIcon } from "@/components/landing-v3/social-icons";
import { LANDING_COMPANY_NAME, LANDING_PRODUCT_NAME } from "@/lib/landing/brand";
import type { LandingSocialLink } from "@/lib/landing/contact";
import {
	LABS_FAQ,
	LABS_HOME,
	LABS_PROCESS,
	LABS_PRODUCT_SCREENS,
	LABS_PROJECTS,
	LABS_SERVICES,
	LABS_STACK,
	LABS_TEAM,
	LABS_WHATSAPP_GREETING,
	type LabsProject,
	type LabsService,
} from "@/lib/labs/content";
import { cn } from "@/utils/cn";

import { BrowserFrame, LaptopFrame, PhoneFrame } from "./labs-frames";
import { LabsHeroVisual } from "./labs-hero-visual";
import { LABS_LOGOS, LabsLogoIcon } from "./labs-logos";
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

/** El producto propio no va entre las secciones: tiene su píldora a la derecha de la barra y su propia sección (#gcode-pos). */
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

/** Fondos de las tarjetas de proyecto: tintas apagadas, una por proyecto, para que el color lo ponga la captura. */
const PROJECT_TINTS = ["bg-[#eef0ff]", "bg-[#edf1f6]", "bg-[#ecf4ef]", "bg-[#fbf1ea]"] as const;

/** Las tarjetas del método, de color pleno como las de la referencia. */
const PROCESS_COLORS = [
	"bg-[#ff7a3d] text-white",
	"bg-[#ff5fa8] text-white",
	"bg-[#4f5bff] text-white",
	"bg-[#ffd33d] text-[#15151a]",
] as const;

/** Mantenimiento no tiene pantalla que mostrar: esto es lo que corre de verdad sobre nuestro código en cada cambio (.github/workflows). */
const MAINTENANCE_CHECKS = [
	"Lint, tipos y pruebas en cada cambio",
	"Build y pruebas de punta a punta",
	"CodeQL y revisión de dependencias",
	"Análisis de seguridad programado",
];

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

	/** Columnas del pie: las rutas de siempre, agrupadas como en el sitio de una empresa grande. */
	const footerColumns: Array<{ title: string; links: Array<{ label: string; href: string; external?: boolean }> }> = [
		{
			title: "Empresa",
			links: [
				{ label: "Servicios", href: "#servicios" },
				{ label: "Cómo trabajamos", href: "#proceso" },
				{ label: "Proyectos", href: "#proyectos" },
				{ label: "Equipo", href: "#equipo" },
				{ label: "Sobre nosotros", href: "/sobre-godcode" },
			],
		},
		{
			title: "Producto",
			links: [
				{ label: LANDING_PRODUCT_NAME, href: posPath },
				{ label: "Producto propio", href: "#gcode-pos" },
				{ label: "Preguntas frecuentes", href: "#preguntas" },
			],
		},
		{
			title: "Contacto",
			links: [
				...(whatsapp && whatsappHref ? [{ label: "WhatsApp", href: whatsappHref, external: true }] : []),
				...(email ? [{ label: "Correo", href: email.href, external: true }] : []),
				{ label: "Cotizar un proyecto", href: "#cotizar" },
			],
		},
		{
			title: "Legal",
			links: [
				{ label: "Términos", href: "/onboarding/terminos" },
				{ label: "Privacidad", href: "/onboarding/privacidad" },
			],
		},
	];

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

				{/* Banda de logos: con qué construimos y cobramos de verdad. Se desplaza sola y se detiene al pasar el ratón. */}
				<section aria-label="Tecnología y pasarelas de pago con las que trabajamos" className="pb-6 pt-4 sm:pt-8">
					<p className="labs-reveal text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8e8e93]">{LABS_HOME.logosTitle}</p>
					<div className="labs-marquee-scope mt-7 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
						<ul className="labs-marquee flex w-max items-center gap-12 pr-12 sm:gap-16 sm:pr-16">
							{[...LABS_LOGOS, ...LABS_LOGOS].map((logo, index) => (
								<li
									key={`${logo.slug}-${index}`}
									aria-hidden={index >= LABS_LOGOS.length}
									className="flex shrink-0 items-center gap-2.5 text-[#a3a3ad] transition-colors hover:text-[#15151a]"
								>
									<LabsLogoIcon logo={logo} className="h-6 w-6 sm:h-7 sm:w-7" />
									<span className="text-[17px] font-semibold tracking-tight sm:text-xl">{logo.label}</span>
								</li>
							))}
						</ul>
					</div>
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
								<ServiceArt service={service} index={index} />
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

				{/* El producto propio, con sus pantallas reales: la parada de quien llega desde Instagram buscándolo. */}
				<section id="gcode-pos" className="scroll-mt-24 px-6 pb-8">
					<div className="labs-reveal relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-[#eef0ff] px-7 pt-10 sm:px-12 sm:pt-14">
						<div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16">
							<div className="min-w-0 pb-2 lg:pb-14">
								<Eyebrow>{LABS_HOME.productEyebrow}</Eyebrow>
								<h2 className="mt-5 text-[clamp(2rem,3.8vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-balance">
									{LABS_HOME.productTitle}
								</h2>
								<p className="mt-6 text-lg leading-relaxed text-[#6b6b76] text-pretty">{LABS_HOME.productText}</p>
								<ul className="mt-6 space-y-3 text-[15px] text-[#3a3a44]">
									{LABS_HOME.productPoints.map((point) => (
										<li key={point} className="flex items-start gap-3">
											<span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#4f5bff] text-white">
												<Check className="h-3 w-3" strokeWidth={3} aria-hidden />
											</span>
											{point}
										</li>
									))}
								</ul>
								<div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
									<Link
										href={posPath}
										className="inline-flex items-center gap-2 rounded-full bg-[#4f5bff] px-7 py-3.5 text-[15px] font-semibold text-white shadow-[0_18px_40px_-16px_rgba(79,91,255,0.8)] transition-colors hover:bg-[#15151a]"
									>
										{LABS_HOME.productCta}
										<ArrowRight className="h-4 w-4" aria-hidden />
									</Link>
									<p className="text-sm text-[#6b6b76]">{LABS_HOME.productNote}</p>
								</div>
							</div>
							{/* Dos pantallas reales que salen por el borde inferior del panel: el menú de un restaurante y la caja. */}
							<div className="flex min-w-0 items-end justify-center gap-4 self-end pt-6 sm:gap-8 lg:justify-end lg:pt-0">
								{LABS_PRODUCT_SCREENS.map((screen, index) => (
									<figure key={screen.src} className="w-full max-w-40 sm:max-w-48">
										{screen.label ? (
											<figcaption className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4f5bff]">{screen.label}</figcaption>
										) : null}
										<PhoneFrame
											screen={screen}
											cut
											sizes="(min-width: 640px) 192px, 160px"
											screenClassName={index === 0 ? "max-h-[22rem] sm:max-h-[26rem]" : "max-h-[18rem] sm:max-h-[21rem]"}
										/>
									</figure>
								))}
							</div>
						</div>
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
						<div className="labs-reveal mx-auto max-w-2xl text-center">
							<Eyebrow>{LABS_HOME.projectsEyebrow}</Eyebrow>
							<h2 className="mt-5 text-[clamp(2.2rem,4.6vw,3.75rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
								{LABS_HOME.projectsTitle}
							</h2>
							<p className="mt-5 text-[17px] leading-relaxed text-[#6b6b76] text-pretty">{LABS_HOME.projectsIntro}</p>
						</div>
						{/* Cuadrícula de casos, como en los estudios grandes: la captura manda, el texto va debajo y la tarjeta no lleva borde ni sombra. */}
						<ul className="mt-14 grid gap-x-8 gap-y-14 lg:grid-cols-2">
							{LABS_PROJECTS.map((project, index) => {
								const external = project.href?.startsWith("http");
								const body = (
									<>
										<ProjectArt project={project} index={index} />
										<div className="mt-6 flex items-start justify-between gap-6">
											<div className="min-w-0">
												<h3 className="flex items-center gap-2 text-[1.35rem] font-semibold tracking-tight">
													{project.name}
													{project.href ? (
														<ArrowUpRight
															className="h-5 w-5 text-[#6b6b76] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
															aria-hidden
														/>
													) : null}
												</h3>
												<p className="mt-1 text-sm text-[#6b6b76]">{project.kind}</p>
											</div>
											{project.href && project.linkLabel ? (
												<span className="mt-0.5 shrink-0 rounded-full border border-black/10 px-3.5 py-1.5 text-xs font-semibold text-[#15151a] transition-colors group-hover:border-black/40">
													{project.linkLabel}
												</span>
											) : null}
										</div>
										<p className="mt-4 leading-relaxed text-[#6b6b76] text-pretty">{project.summary}</p>
										<p className="mt-4 text-sm leading-relaxed text-[#8a8a94]">{dotted(project.scope)}</p>
									</>
								);
								const className = cn("labs-reveal group block h-full", `labs-stagger-${index % 2}`);
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
											"labs-reveal rounded-[2rem] border border-black/[0.06] bg-white p-5 shadow-[0_30px_60px_-44px_rgba(20,8,90,0.35)] sm:p-6",
											`labs-stagger-${index % 2}`,
										)}
									>
										{/* Con foto real la tarjeta pesa más que con iniciales: va grande, en vertical, como un retrato. */}
										{member.photoUrl ? (
											<Image
												src={member.photoUrl}
												alt={member.name}
												width={640}
												height={800}
												sizes="(min-width: 1024px) 300px, (min-width: 640px) 45vw, 90vw"
												className="aspect-[4/5] w-full rounded-[1.5rem] object-cover"
											/>
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

			{/* Pie: un panel negro con columnas de enlaces y el nombre del estudio gigante, entero a lo ancho (la letra se mide con el ancho del panel) y cortado solo por el borde inferior. */}
			<footer className="px-4 pb-6 sm:px-6 sm:pb-8">
				<div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-[#0f0f13] px-7 pt-14 text-white [container-type:inline-size] sm:px-12 sm:pt-20">
					<div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_minmax(0,1.5fr)]">
						{footerColumns.map((column) => (
							<nav key={column.title} aria-label={column.title}>
								<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">{column.title}</p>
								<ul className="mt-5 space-y-3 text-sm">
									{column.links.map((link) => (
										<li key={link.label}>
											{link.external ? (
												<a
													href={link.href}
													target={link.href.startsWith("http") ? "_blank" : undefined}
													rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
													className="text-white/75 transition-colors hover:text-white"
												>
													{link.label}
												</a>
											) : (
												<Link href={link.href} className="text-white/75 transition-colors hover:text-white">
													{link.label}
												</Link>
											)}
										</li>
									))}
								</ul>
							</nav>
						))}
						<div className="sm:col-span-2 lg:col-span-1">
							<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">Hablemos</p>
							<p className="mt-5 max-w-xs text-sm leading-relaxed text-white/75 text-pretty">{LABS_HOME.footerLead}</p>
							<Link
								href="#cotizar"
								className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#15151a] transition-colors hover:bg-[#ffd33d]"
							>
								{LABS_HOME.primaryCta}
								<ArrowRight className="h-4 w-4" aria-hidden />
							</Link>
							<div className="mt-6 flex items-center gap-3">
								{linkedin ? (
									<a
										href={linkedin.href}
										target="_blank"
										rel="noopener noreferrer"
										aria-label="LinkedIn"
										className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/75 transition-colors hover:border-white/40 hover:text-white"
									>
										<LandingLinkedInIcon size={16} />
									</a>
								) : null}
								{instagram ? (
									<a
										href={instagram.href}
										target="_blank"
										rel="noopener noreferrer"
										aria-label="Instagram"
										className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/75 transition-colors hover:border-white/40 hover:text-white"
									>
										<LandingInstagramIcon size={16} />
									</a>
								) : null}
							</div>
							<p className="mt-6 text-xs leading-relaxed text-white/45">
								© {year} {LANDING_COMPANY_NAME}. {LANDING_PRODUCT_NAME} es un producto de {LANDING_COMPANY_NAME}.
								<br />
								{LABS_HOME.footerNote}
							</p>
						</div>
					</div>
					<p
						aria-hidden
						className="labs-wordmark pointer-events-none -mb-[0.14em] mt-12 select-none whitespace-nowrap text-center text-[18.2cqw] font-bold leading-[0.85] tracking-[-0.06em] sm:mt-16"
					>
						{LABS_HOME.footerWordmark}
					</p>
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
 * La imagen de cada tarjeta de servicio: una captura real de algo que construimos, en un marco de
 * teléfono o de navegador (`service.image`). Mantenimiento no tiene pantalla: muestra lo que corre
 * de verdad sobre nuestro código en cada cambio.
 */
function ServiceArt({ service, index }: { service: LabsService; index: number }) {
	const tint = TINTS[index % TINTS.length];
	const image = service.image;
	return (
		<div className={cn("relative h-48 overflow-hidden", tint)}>
			<span
				aria-hidden
				className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(20,8,90,0.12)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:radial-gradient(70%_70%_at_80%_20%,#000,transparent)]"
			/>
			{image?.frame === "laptop" ? (
				<LaptopFrame screen={image} cut className="absolute inset-x-6 top-8" sizes="(min-width: 640px) 304px, 256px" />
			) : image?.frame === "browser" ? (
				<BrowserFrame screen={image} className="absolute inset-x-7 top-7" sizes="(min-width: 640px) 296px, 248px" />
			) : image ? (
				<PhoneFrame screen={image} cut className="absolute left-1/2 top-7 w-44 -translate-x-1/2" sizes="176px" />
			) : (
				<ul className="absolute inset-x-8 top-8 space-y-2.5 rounded-t-2xl bg-white p-4 text-xs text-[#3a3a44] shadow-[0_20px_40px_-24px_rgba(20,8,90,0.5)]">
					{MAINTENANCE_CHECKS.map((item) => (
						<li key={item} className="flex items-center gap-2">
							<span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#e3f8ee] text-[#15804f]">
								<Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
							</span>
							{item}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

/**
 * La imagen de cada caso: un fondo de tinta apagada, la captura de escritorio en una ventana de
 * navegador que sale por el borde inferior y, si la hay, la de teléfono superpuesta en la esquina.
 * Al pasar el ratón la escena crece apenas. Sin captura, una ventana de muestra con el dominio.
 */
function ProjectArt({ project, index }: { project: LabsProject; index: number }) {
	const external = project.href?.startsWith("http");
	const address = project.image?.address ?? (external ? safeHostname(project.href!) : undefined);
	return (
		<div className={cn("relative aspect-[4/3] overflow-hidden rounded-[1.5rem] border border-black/[0.06]", PROJECT_TINTS[index % PROJECT_TINTS.length])}>
			<div className="absolute inset-0 transition-transform duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:scale-[1.025]">
				{project.image ? (
					<BrowserFrame
						screen={project.image}
						address={address}
						cut
						className={cn("absolute -bottom-[4%] left-1/2 w-[92%] -translate-x-1/2", project.phone && "left-[4%] w-full translate-x-0")}
						sizes="(min-width: 1024px) 500px, 92vw"
					/>
				) : (
					<div className="absolute inset-x-[8%] bottom-0 top-[12%] rounded-t-xl bg-white p-5 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_30px_60px_-30px_rgba(0,0,0,0.45)]">
						<div className="flex items-center gap-1.5">
							<span className="h-2.5 w-2.5 rounded-full bg-[#d6d6dc]" />
							<span className="h-2.5 w-2.5 rounded-full bg-[#d6d6dc]" />
							<span className="h-2.5 w-2.5 rounded-full bg-[#d6d6dc]" />
							<span className="ml-2 flex-1 truncate rounded-md bg-[#f6f6f8] px-3 py-1 text-[11px] text-[#6b6b76]">{address}</span>
						</div>
						<p className="mt-5 text-xl font-semibold tracking-tight text-[#15151a]">{project.name}</p>
						<span className="mt-3 block h-2 w-5/6 rounded-full bg-[#ececf1]" />
						<span className="mt-1.5 block h-2 w-3/5 rounded-full bg-[#ececf1]" />
					</div>
				)}
				{project.phone ? (
					<PhoneFrame
						screen={project.phone}
						cut
						className="absolute bottom-0 right-[6%] w-[30%] max-w-[11rem]"
						sizes="(min-width: 1024px) 176px, 30vw"
						screenClassName="max-h-[13rem] sm:max-h-[16rem]"
					/>
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
