import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { LandingInstagramIcon, LandingLinkedInIcon } from "@/components/landing-v3/social-icons";
import { CookieSettingsLink } from "@/components/legal/cookie-consent";
import { LANDING_COMPANY_NAME, LANDING_PRODUCT_NAME } from "@/lib/landing/brand";
import type { LandingSocialLink } from "@/lib/landing/contact";
import { LABS_HOME } from "@/lib/labs/content";

import { QuoteForm } from "./quote-form";

/**
 * Pie y bloque de cotización del estudio, compartidos por la home de Labs y sus páginas
 * (servicios, proyectos, guía). `homeHref` antepone la ruta de la home a las anclas del
 * pie: en la home queda vacío («#servicios»); en una subpágina, «/labs#servicios».
 */

/** Flecha que avanza un poco al pasar el ratón (la misma de la home). */
const ARROW_NUDGE = "h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:translate-x-1";

/** Enlaces del pie: se aclaran y se corren un poco a la derecha al pasar. */
const FOOTER_LINK = "inline-block text-white/75 transition-[color,translate] duration-200 hover:translate-x-0.5 hover:text-white";

/** Iconos redondos de redes en el pie. */
const SOCIAL_BUTTON =
	"inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/75 transition-[border-color,color,background-color,scale] duration-200 hover:scale-110 hover:border-white/40 hover:bg-white/10 hover:text-white active:scale-95";

export function LabsQuoteSection({ socialLinks, cotizarId = "cotizar" }: { socialLinks: LandingSocialLink[]; cotizarId?: string }) {
	const whatsapp = socialLinks.find((link) => link.kind === "whatsapp") ?? null;
	const whatsappHref = whatsapp?.href ?? null;
	const email = socialLinks.find((link) => link.kind === "email") ?? null;
	return (
		<section id={cotizarId} className="scroll-mt-24 px-6 pb-16 pt-6 sm:pb-24">
			<div className="labs-reveal relative mx-auto max-w-6xl rounded-[2.5rem] bg-[linear-gradient(135deg,#6a5cff_0%,#4a2fd8_55%,#36219f_100%)] px-6 py-12 text-white sm:px-12 sm:py-16">
				<div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2.5rem]">
					<span className="absolute -bottom-12 -left-10 h-40 w-40 rounded-full bg-[radial-gradient(circle_at_30%_30%,#ffe9a3,#ffb13d_55%,#e5651a)] opacity-90 blur-[1px]" />
					<span className="absolute -bottom-20 -right-16 hidden h-52 w-52 rounded-full border-[26px] border-[#ff5fa8] opacity-80 sm:block" />
				</div>
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
									<a
										href={whatsappHref}
										target="_blank"
										rel="noopener noreferrer"
										className="mt-1 inline-block font-semibold underline decoration-white/0 underline-offset-4 transition-[text-decoration-color] duration-200 hover:decoration-white/80"
									>
										{phoneDisplay(whatsapp.display)}
									</a>
								</li>
							) : null}
							{email ? (
								<li>
									<span className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Correo</span>
									<a
										href={email.href}
										className="mt-1 inline-block font-semibold underline decoration-white/0 underline-offset-4 transition-[text-decoration-color] duration-200 hover:decoration-white/80"
									>
										{email.display}
									</a>
								</li>
							) : null}
							<li>
								<span className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Dónde</span>
								<span className="mt-1 inline-block font-semibold">Santiago de Chile · a distancia en Chile, Venezuela y Estados Unidos</span>
							</li>
						</ul>
					</div>
					<QuoteForm whatsappHref={whatsappHref} />
				</div>
			</div>
		</section>
	);
}

export function LabsFooter({ socialLinks, posPath, homeHref = "" }: { socialLinks: LandingSocialLink[]; posPath: string; homeHref?: string }) {
	const whatsapp = socialLinks.find((link) => link.kind === "whatsapp") ?? null;
	const whatsappHref = whatsapp?.href ?? null;
	const email = socialLinks.find((link) => link.kind === "email") ?? null;
	const linkedin = socialLinks.find((link) => link.kind === "linkedin") ?? null;
	const instagram = socialLinks.find((link) => link.kind === "instagram") ?? null;
	const year = new Date().getFullYear();
	const anchor = (id: string) => `${homeHref}#${id}`;

	/** Columnas del pie: las rutas de siempre, agrupadas como en el sitio de una empresa grande. */
	const footerColumns: Array<{
		title: string;
		links: Array<{ label: string; href: string; external?: boolean }>;
		/** Un último elemento que no es un enlace (el botón que reabre el aviso de cookies). */
		trailing?: ReactNode;
	}> = [
		{
			title: "Empresa",
			links: [
				{ label: "Servicios", href: anchor("servicios") },
				{ label: "Cómo trabajamos", href: anchor("proceso") },
				{ label: "Proyectos", href: anchor("proyectos") },
				{ label: "Equipo", href: anchor("equipo") },
				{ label: "Sobre nosotros", href: "/sobre-godcode" },
			],
		},
		{
			title: "Producto",
			links: [
				{ label: LANDING_PRODUCT_NAME, href: posPath },
				{ label: "Producto propio", href: anchor("gcode-pos") },
				{ label: "Preguntas frecuentes", href: anchor("preguntas") },
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
				{ label: "Cookies", href: "/onboarding/cookies" },
			],
			// El mismo botón que llevan los pies del landing y del alta: reabre el aviso de cookies.
			trailing: <CookieSettingsLink label="Preferencias de cookies" className={FOOTER_LINK} />,
		},
	];

	// Pie: un panel negro de borde a borde, con columnas de enlaces alineadas con la página y el nombre del estudio gigante, entero a lo ancho (la letra se mide con el ancho del panel) y cortado por el borde inferior.
	return (
		<footer className="relative overflow-hidden rounded-t-[2.5rem] bg-[#0f0f13] pt-14 text-white [container-type:inline-size] sm:pt-20">
			{/* La misma columna que las secciones (px-6 y max-w-6xl): las columnas del pie empiezan donde empieza la página. */}
			<div className="mx-auto max-w-[75rem] px-6">
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
												className={FOOTER_LINK}
											>
												{link.label}
											</a>
										) : (
											<Link href={link.href} className={FOOTER_LINK}>
												{link.label}
											</Link>
										)}
									</li>
								))}
								{column.trailing ? <li>{column.trailing}</li> : null}
							</ul>
						</nav>
					))}
					<div className="sm:col-span-2 lg:col-span-1">
						<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">Hablemos</p>
						<p className="mt-5 max-w-xs text-sm leading-relaxed text-white/75 text-pretty">{LABS_HOME.footerLead}</p>
						<Link
							href="#cotizar"
							className="group mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#15151a] transition-[background-color,scale] duration-200 hover:bg-[#ffd33d] active:scale-[0.97]"
						>
							{LABS_HOME.primaryCta}
							<ArrowRight className={ARROW_NUDGE} aria-hidden />
						</Link>
						<div className="mt-6 flex items-center gap-3">
							{linkedin ? (
								<a
									href={linkedin.href}
									target="_blank"
									rel="noopener noreferrer"
									aria-label="LinkedIn"
									className={SOCIAL_BUTTON}
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
									className={SOCIAL_BUTTON}
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
			</div>
			<p
				aria-hidden
				className="labs-wordmark pointer-events-none -mb-[0.14em] mt-12 select-none whitespace-nowrap text-center text-[18.2cqw] font-bold leading-[0.85] tracking-[-0.06em] sm:mt-16"
			>
				{LABS_HOME.footerWordmark}
			</p>
		</footer>
	);
}

/** Número legible: +56943848080 → +56 9 4384 8080; +584121234567 → +58 412 123 4567. Otros, tal cual. */
function phoneDisplay(display: string): string {
	const chile = display.match(/^\+56(9\d{8})$/);
	if (chile) return `+56 ${chile[1]!.slice(0, 1)} ${chile[1]!.slice(1, 5)} ${chile[1]!.slice(5)}`;
	const venezuela = display.match(/^\+58(\d{3})(\d{3})(\d{4})$/);
	if (venezuela) return `+58 ${venezuela[1]} ${venezuela[2]} ${venezuela[3]}`;
	return display;
}
