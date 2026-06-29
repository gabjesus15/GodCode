import Image from "next/image";
import Link from "next/link";

import { LANDING_SUPPORT_EMAIL } from "@/lib/landing/brand";
import type { LandingSocialLink } from "@/lib/landing/contact";

import {
	LandingInstagramIcon,
	LandingMailIcon,
	LandingWhatsAppIcon,
} from "./social-icons";

const footerLinks = [
	{ label: "Funciones", href: "#funciones" },
	{ label: "Precios", href: "#precios" },
	{ label: "Nosotros", href: "#nosotros" },
	{ label: "Contacto", href: "#contacto" },
];

function SocialIcon({ link }: { link: LandingSocialLink }) {
	if (link.kind === "instagram") return <LandingInstagramIcon size={18} />;
	if (link.kind === "whatsapp") return <LandingWhatsAppIcon size={18} />;
	return <LandingMailIcon size={18} />;
}

function contactLinkClassName(kind: LandingSocialLink["kind"]) {
	const base =
		"inline-flex items-center gap-3 text-lg font-medium transition-colors";
	if (kind === "instagram") return `${base} text-[#0d0d0d] hover:text-[#c13584]`;
	if (kind === "whatsapp") return `${base} text-[#0d0d0d] hover:text-[#25D366]`;
	return `${base} text-[#0d0d0d] hover:text-[#7c3aed]`;
}

export function Footer({ socialLinks }: { socialLinks: LandingSocialLink[] }) {
	const directSocialLinks = socialLinks.filter((link) => link.kind !== "email");

	return (
		<footer id="contacto" className="v3-section-beige pt-20 md:pt-28">
			<div className="v3-container">
				<div className="grid grid-cols-1 gap-12 border-b border-[#0d0d0d]/10 pb-16 md:grid-cols-3">
					<div>
						<p className="v3-label mb-6 text-[#71717a]">{"// "}NAVEGACIÓN</p>
						<ul className="flex flex-col gap-3">
							{footerLinks.map((link) => (
								<li key={link.label}>
									<Link
										href={link.href}
										className="text-lg font-medium text-[#0d0d0d] transition-colors hover:text-[#7c3aed]"
									>
										{link.label}
									</Link>
								</li>
							))}
						</ul>
					</div>

					<div>
						<p className="v3-label mb-6 text-[#71717a]">{"// "}CONTACTO</p>
						<ul className="flex flex-col gap-4">
							{socialLinks.map((link) => (
								<li key={link.kind}>
									<a
										href={link.href}
										target={link.kind === "email" ? undefined : "_blank"}
										rel={link.kind === "email" ? undefined : "noopener noreferrer"}
										className={contactLinkClassName(link.kind)}
									>
										<span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#0d0d0d]/15 bg-white/60">
											<SocialIcon link={link} />
										</span>
										<span>{link.display}</span>
									</a>
								</li>
							))}
						</ul>
					</div>

					<div>
						<p className="v3-label mb-6 text-[#71717a]">{"// "}ALIANZAS</p>
						<p className="text-lg leading-relaxed text-[#0d0d0d]">
							Abiertos a integraciones con hardware POS, pasarelas de pago y flotas de
							delivery.
						</p>
						<address className="mt-6 not-italic text-base leading-relaxed text-[#71717a]">
							Gcode HQ
							<br />
							Santiago, Chile
							<br />
							{LANDING_SUPPORT_EMAIL}
						</address>
					</div>
				</div>

				<div className="flex flex-col items-center gap-8 py-12 md:flex-row md:justify-between">
					<div className="flex items-center gap-3">
						<Image
							src="/gcode-logo.svg"
							alt="Gcode"
							width={32}
							height={32}
							className="h-8 w-8 rounded-lg"
						/>
						<p className="text-sm text-[#71717a]">
							© {new Date().getFullYear()} Gcode. Todos los derechos reservados.
						</p>
					</div>

					{directSocialLinks.length > 0 ? (
						<div className="flex flex-wrap items-center justify-center gap-3">
							{directSocialLinks.map((link) => (
								<a
									key={link.kind}
									href={link.href}
									target="_blank"
									rel="noopener noreferrer"
									aria-label={link.label}
									className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#0d0d0d]/20 bg-white/50 text-[#0d0d0d] transition-colors hover:border-[#7c3aed] hover:bg-[#7c3aed] hover:text-white"
								>
									<SocialIcon link={link} />
								</a>
							))}
						</div>
					) : null}
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
