import Link from "next/link";

import {
	LANDING_BRAND_ALTERNATE,
	LANDING_COMPANY_NAME,
	LANDING_PRODUCT_NAME,
} from "@/lib/landing/brand";
import type { LandingSocialLink } from "@/lib/landing/contact";

import { LandingBrandMark } from "./landing-brand-mark";
import {
	LandingInstagramIcon,
	LandingLinkedInIcon,
	LandingMailIcon,
	LandingWhatsAppIcon,
} from "./social-icons";

const footerLinks = [
	// "/#…": funcionan igual desde la home y desde la calculadora.
	{ label: "Cómo funciona", href: "/#como-funciona" },
	{ label: "Precios", href: "/#precios" },
	{ label: "Preguntas frecuentes", href: "/#faq" },
	{ label: "Calculadora de comisiones", href: "/calculadora-comisiones" },
	{ label: "Negocios que usan Gcode", href: "/onboarding/negocios" },
	{ label: "Crear mi tienda", href: "/onboarding" },
];

const legalLinks = [
	{ label: "Términos", href: "/onboarding/terminos" },
	{ label: "Privacidad", href: "/onboarding/privacidad" },
];

function SocialIcon({ link }: { link: LandingSocialLink }) {
	if (link.kind === "instagram") return <LandingInstagramIcon size={18} />;
	if (link.kind === "linkedin") return <LandingLinkedInIcon size={18} />;
	if (link.kind === "whatsapp") return <LandingWhatsAppIcon size={18} />;
	return <LandingMailIcon size={18} />;
}

function contactLinkClassName(kind: LandingSocialLink["kind"]) {
	const base =
		// min-w-0: el correo es largo y en pantallas chicas tiene que poder partirse.
		"inline-flex min-w-0 max-w-full items-center gap-3 text-lg font-medium transition-colors";
	if (kind === "instagram") return `${base} text-[#0d0d0d] hover:text-[#c13584]`;
	if (kind === "linkedin") return `${base} text-[#0d0d0d] hover:text-[#0a66c2]`;
	if (kind === "whatsapp") return `${base} text-[#0d0d0d] hover:text-[#25D366]`;
	return `${base} text-[#0d0d0d] hover:text-[#4f5bff]`;
}

export function Footer({ socialLinks }: { socialLinks: LandingSocialLink[] }) {
	return (
		<footer id="contacto" className="v3-section-beige pt-16 md:pt-20">
			<div className="v3-container">
				{/* Tablet: Producto | Contacto y Gcode Labs abajo a lo ancho. Desde lg, tres columnas. */}
				<div className="grid grid-cols-1 gap-x-10 gap-y-14 border-b border-[#0d0d0d]/10 pb-16 md:grid-cols-2 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)_minmax(0,1fr)]">
					<div>
						<p className="v3-label mb-6 text-[#52525b]">{"// "}PRODUCTO</p>
						<ul className="flex flex-col gap-3">
							{footerLinks.map((link) => (
								<li key={link.label}>
									{link.href.startsWith("#") ? (
										<a
											href={link.href}
											className="text-lg font-medium text-[#0d0d0d] transition-colors hover:text-[#4f5bff]"
										>
											{link.label}
										</a>
									) : (
										<Link
											href={link.href}
											className="text-lg font-medium text-[#0d0d0d] transition-colors hover:text-[#4f5bff]"
										>
											{link.label}
										</Link>
									)}
								</li>
							))}
						</ul>
					</div>

					<div>
						<p className="v3-label mb-6 text-[#52525b]">{"// "}CONTACTO</p>
						<ul className="flex flex-col gap-4">
							{socialLinks.map((link) => (
								<li key={link.kind}>
									<a
										href={link.href}
										target={link.kind === "email" ? undefined : "_blank"}
										rel={link.kind === "email" ? undefined : "noopener noreferrer"}
										className={contactLinkClassName(link.kind)}
									>
										<span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#0d0d0d]/15 bg-white/60">
											<SocialIcon link={link} />
										</span>
										<span className="min-w-0 [overflow-wrap:anywhere]">
											{/* Corte preferido tras la @: "nombre@" / "dominio" en vez de partir el dominio. */}
											{link.kind === "email" && link.display.includes("@") ? (
												<>
													{link.display.slice(0, link.display.indexOf("@") + 1)}
													<wbr />
													{link.display.slice(link.display.indexOf("@") + 1)}
												</>
											) : (
												link.display
											)}
										</span>
									</a>
								</li>
							))}
						</ul>
					</div>

					<div className="md:col-span-2 md:max-w-md lg:col-span-1">
						<p className="v3-label mb-6 text-[#52525b]">{"// "}{LANDING_COMPANY_NAME.toUpperCase()}</p>
						<p className="text-lg leading-relaxed text-[#0d0d0d]">
							Estudio de desarrollo web y sistemas a medida. {LANDING_PRODUCT_NAME} es nuestro
							producto para restaurantes.
						</p>
						<Link
							href="/sobre-godcode"
							className="mt-4 inline-flex text-base font-semibold text-[#0d0d0d] underline decoration-[#0d0d0d]/25 underline-offset-4 transition-colors hover:text-[#4f5bff] hover:decoration-[#4f5bff]"
						>
							Conocer el estudio
						</Link>
						<address className="mt-6 not-italic text-base text-[#52525b]">Santiago, Chile</address>
					</div>
				</div>

				<div className="flex flex-col items-start gap-6 py-10 md:flex-row md:items-center md:justify-between md:py-12">
					<div className="flex items-center gap-3">
						<LandingBrandMark variant="onLight" className="h-8" />
						<div className="text-sm text-[#52525b]">
							<p>
								© {new Date().getFullYear()} {LANDING_COMPANY_NAME}
							</p>
							{/* Mención visible del nombre anterior: mantiene la home en las búsquedas por "godcode". */}
							<p className="mt-0.5">
								{LANDING_PRODUCT_NAME} es un producto de {LANDING_COMPANY_NAME}, antes{" "}
								{LANDING_BRAND_ALTERNATE}.
							</p>
						</div>
					</div>

					<ul className="flex items-center gap-6 text-sm text-[#52525b]">
						{legalLinks.map((link) => (
							<li key={link.href}>
								<Link href={link.href} className="transition-colors hover:text-[#0d0d0d]">
									{link.label}
								</Link>
							</li>
						))}
					</ul>
				</div>
			</div>

			<div className="border-t border-[#0d0d0d]/10">
				<div className="v3-container py-8">
					<p className="font-display text-[clamp(5rem,22vw,16rem)] leading-[0.8] tracking-[0.02em] text-[#0d0d0d]">
						code
					</p>
				</div>
			</div>
		</footer>
	);
}
