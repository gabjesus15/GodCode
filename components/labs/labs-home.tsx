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
	LABS_TEAM,
} from "@/lib/labs/content";

import { LabsNavbar, type LabsNavLink } from "./labs-navbar";
import { QuoteForm } from "./quote-form";

type LabsHomeProps = {
	/** Ruta donde vive esta página («/» cuando sea la raíz; «/labs» en la vista previa). */
	path: string;
	/** Ruta del landing de Gcode POS. */
	posPath: string;
	socialLinks: LandingSocialLink[];
	jsonLd: string;
};

const NAV_LINKS: LabsNavLink[] = [
	{ label: "Servicios", href: "#servicios" },
	{ label: "Cómo trabajamos", href: "#proceso" },
	{ label: "Proyectos", href: "#proyectos" },
	{ label: LANDING_PRODUCT_NAME, href: "#productos" },
	{ label: "Equipo", href: "#equipo" },
];

/**
 * Home corporativa de Gcode Labs. Fondo claro y tipografía sobria, a diferencia
 * del landing del producto: aquí habla la empresa, no la campaña.
 */
export function LabsHome({ path, posPath, socialLinks, jsonLd }: LabsHomeProps) {
	const whatsapp = socialLinks.find((link) => link.kind === "whatsapp") ?? null;
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
			/>

			<main>
				{/* Hero */}
				<section className="bg-[#080808] px-6 pb-20 pt-36 text-[#f4f4f5] sm:pb-28 sm:pt-40 lg:pb-32 lg:pt-44">
					<div className="mx-auto max-w-6xl">
						<p className="text-xs font-medium uppercase tracking-[0.2em] text-[#a1a1aa]">{LABS_HOME.eyebrow}</p>
						<h1 className="mt-6 max-w-4xl text-[clamp(2.5rem,5.6vw,5rem)] font-semibold leading-[1.04] tracking-[-0.035em] text-balance">
							{LABS_HOME.title}
						</h1>
						<p className="mt-8 max-w-2xl text-lg leading-relaxed text-[#a1a1aa] text-pretty sm:text-xl">{LABS_HOME.intro}</p>
						<div className="mt-10 flex flex-wrap items-center gap-6">
							<Link
								href="#cotizar"
								className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-[15px] font-semibold text-[#0d0d0d] transition-colors hover:bg-[#4f5bff] hover:text-white"
							>
								{LABS_HOME.primaryCta}
								<ArrowRight className="h-4 w-4" aria-hidden />
							</Link>
							<Link
								href={posPath}
								className="inline-flex items-center gap-1.5 text-[15px] font-medium text-[#d4d4d8] underline decoration-white/20 underline-offset-[6px] transition-colors hover:text-white hover:decoration-white/60"
							>
								{LABS_HOME.secondaryCta}
								<ArrowUpRight className="h-4 w-4" aria-hidden />
							</Link>
						</div>
					</div>
				</section>

				{/* Hechos */}
				<section className="border-b border-[#e5e5ea] bg-[#fbfbfd]">
					<div className="mx-auto max-w-6xl px-6">
						<dl className="grid divide-y divide-[#e5e5ea] sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
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
						<div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
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
								<li key={service.id} id={service.id} className="scroll-mt-24 grid gap-6 py-10 lg:grid-cols-[6rem_minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
									<span className="font-mono text-sm text-[#8e8e93]">{String(index + 1).padStart(2, "0")}</span>
									<div>
										<h3 className="text-2xl font-semibold tracking-tight">{service.title}</h3>
										<p className="mt-3 max-w-lg leading-relaxed text-[#6e6e73] text-pretty">{service.summary}</p>
										<p className="mt-4 text-sm text-[#8e8e93]">
											<span className="font-medium text-[#1d1d1f]">Para quién: </span>
											{service.fit}
										</p>
									</div>
									<ul className="grid gap-2.5 self-start sm:grid-cols-2 lg:grid-cols-1">
										{service.deliverables.map((item) => (
											<li key={item} className="flex items-start gap-3 text-[15px] text-[#1d1d1f]">
												<span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4f5bff]" />
												{item}
											</li>
										))}
									</ul>
								</li>
							))}
						</ol>
					</div>
				</section>

				{/* Proceso */}
				<section id="proceso" className="scroll-mt-24 border-t border-[#e5e5ea] bg-[#fbfbfd]">
					<div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
						<p className="text-xs font-medium uppercase tracking-[0.2em] text-[#8e8e93]">{LABS_HOME.processEyebrow}</p>
						<h2 className="mt-4 max-w-2xl text-[clamp(2rem,3.6vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-balance">
							{LABS_HOME.processTitle}
						</h2>
						<ol className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-[#e5e5ea] bg-[#e5e5ea] sm:grid-cols-2 lg:grid-cols-4">
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

				{/* Productos propios */}
				<section id="productos" className="scroll-mt-24 bg-[#080808] text-[#f4f4f5]">
					<div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
						<div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
							<div>
								<p className="text-xs font-medium uppercase tracking-[0.2em] text-[#a1a1aa]">{LABS_HOME.productsEyebrow}</p>
								<h2 className="mt-4 text-[clamp(2rem,3.6vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-balance">
									{LABS_HOME.productsTitle}
								</h2>
								<p className="mt-7 text-lg leading-relaxed text-[#a1a1aa] text-pretty">{LABS_HOME.productsIntro}</p>
							</div>
							<div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-8 sm:p-10">
								<div>
									<p className="text-xs font-medium uppercase tracking-[0.2em] text-[#8b93ff]">Producto</p>
									<h3 className="mt-4 text-3xl font-semibold tracking-tight">{LANDING_PRODUCT_NAME}</h3>
									<p className="mt-3 text-[#a1a1aa] text-pretty">
										Menú digital con QR, pedidos online, punto de venta, delivery e inventario para restaurantes.
										Suscripción mensual, sin comisión por venta.
									</p>
									<ul className="mt-6 grid gap-2.5 text-[15px] text-[#d4d4d8] sm:grid-cols-2">
										{LABS_PROJECTS[0]?.scope.map((item) => (
											<li key={item} className="flex items-start gap-3">
												<span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4f5bff]" />
												{item}
											</li>
										))}
									</ul>
								</div>
								<div className="mt-8 flex flex-wrap items-center gap-5">
									<Link
										href={posPath}
										className="inline-flex items-center gap-2 rounded-full bg-[#4f5bff] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#3d47e6]"
									>
										Ver {LANDING_PRODUCT_NAME}
										<ArrowRight className="h-4 w-4" aria-hidden />
									</Link>
									<Link
										href="/onboarding/negocios"
										className="text-sm font-medium text-[#d4d4d8] underline decoration-white/20 underline-offset-[6px] hover:text-white"
									>
										Negocios que lo usan
									</Link>
								</div>
							</div>
						</div>
					</div>
				</section>

				{/* Proyectos */}
				<section id="proyectos" className="scroll-mt-24 bg-white">
					<div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
						<p className="text-xs font-medium uppercase tracking-[0.2em] text-[#8e8e93]">{LABS_HOME.projectsEyebrow}</p>
						<h2 className="mt-4 text-[clamp(2rem,3.6vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.03em]">
							{LABS_HOME.projectsTitle}
						</h2>
						<ul className="mt-14 grid gap-6 lg:grid-cols-2">
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
										<ul className="mt-6 grid gap-2 text-sm text-[#1d1d1f] sm:grid-cols-2">
											{project.scope.map((item) => (
												<li key={item} className="flex items-start gap-3">
													<span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#4f5bff]" />
													{item}
												</li>
											))}
										</ul>
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
							<div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
								<div>
									<p className="text-xs font-medium uppercase tracking-[0.2em] text-[#8e8e93]">{LABS_HOME.teamEyebrow}</p>
									<h2 className="mt-4 text-[clamp(2rem,3.6vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.03em]">
										{LABS_HOME.teamTitle}
									</h2>
									<p className="mt-6 max-w-md text-lg leading-relaxed text-[#6e6e73] text-pretty">
										Un equipo pequeño con base en Santiago de Chile. En cada proyecto hablas directamente con quien lo
										diseña y lo programa.
									</p>
								</div>
								<ul className="grid gap-6 sm:grid-cols-2">
									{LABS_TEAM.map((member) => (
										<li key={member.name} className="rounded-2xl border border-[#e5e5ea] bg-white p-7">
											<div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1d1d1f] text-lg font-semibold text-white">
												{initials(member.name)}
											</div>
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
							<dl className="divide-y divide-[#e5e5ea] border-y border-[#e5e5ea]">
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
						<div className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
							<div>
								<p className="text-xs font-medium uppercase tracking-[0.2em] text-[#8e8e93]">{LABS_HOME.quoteEyebrow}</p>
								<h2 className="mt-4 text-[clamp(2rem,3.6vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-balance">
									{LABS_HOME.quoteTitle}
								</h2>
								<p className="mt-6 max-w-md text-lg leading-relaxed text-[#6e6e73] text-pretty">{LABS_HOME.quoteText}</p>
								<ul className="mt-10 space-y-4 text-[15px]">
									{whatsapp ? (
										<li>
											<span className="block text-xs font-medium uppercase tracking-[0.18em] text-[#8e8e93]">WhatsApp</span>
											<a href={whatsapp.href} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block font-medium hover:underline">
												{whatsapp.label}
											</a>
										</li>
									) : null}
									{email ? (
										<li>
											<span className="block text-xs font-medium uppercase tracking-[0.18em] text-[#8e8e93]">Correo</span>
											<a href={email.href} className="mt-1 inline-block font-medium hover:underline">
												{email.label}
											</a>
										</li>
									) : null}
									<li>
										<span className="block text-xs font-medium uppercase tracking-[0.18em] text-[#8e8e93]">Dónde</span>
										<span className="mt-1 inline-block font-medium">Santiago de Chile · trabajo a distancia en Chile y Venezuela</span>
									</li>
								</ul>
							</div>
							<QuoteForm whatsappHref={whatsapp?.href ?? null} />
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

function initials(name: string): string {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? "")
		.join("");
}
