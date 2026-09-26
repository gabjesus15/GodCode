import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { LANDING_COMPANY_NAME, LANDING_PRODUCT_NAME } from "@/lib/landing/brand";
import type { LandingSocialLink } from "@/lib/landing/contact";

import { SectionGlow } from "./section-light";
import { LandingWhatsAppIcon } from "./social-icons";

/**
 * Solo promesas que el producto cumple hoy (mismas que FAQ, precios y términos).
 * Se escriben como frases, no como tarjetas con ícono: la sección tiene que sonar a personas.
 */
const PROMISES = [
	{ lead: "Tus datos son tuyos.", rest: "Cada negocio está aislado y todo viaja cifrado." },
	{ lead: "Sin permanencia.", rest: "Si no te sirve, cancelas cuando quieras y sin penalidad." },
	{ lead: "Te atiende quien lo construyó.", rest: "Por WhatsApp o correo, sin bots de por medio." },
	{
		lead: "Ya lo usan restaurantes reales",
		rest: "en Chile y Venezuela.",
		href: "/onboarding/negocios",
		cta: "Verlos",
	},
] as const;

export function Trust({ socialLinks }: { socialLinks: LandingSocialLink[] }) {
	const whatsapp = socialLinks.find((link) => link.kind === "whatsapp");

	return (
		<section id="confianza" className="v3-section-dark py-20 md:py-28">
			<SectionGlow className="left-[5%] top-1/2 h-[560px] w-[560px] -translate-y-1/2" intensity={0.1} drift={70} />
			<div className="v3-container grid gap-14 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-24">
				<div data-reveal className="lg:sticky lg:top-28 lg:self-start">
					<h2 className="font-display text-5xl leading-[0.95] text-[#f4f4f5] text-balance md:text-6xl">
						Hecho por personas que puedes contactar
					</h2>
					<p className="mt-6 max-w-md text-lg leading-relaxed text-[#a1a1aa] text-pretty">
						Detrás está {LANDING_COMPANY_NAME}, un estudio de desarrollo web y sistemas a medida de Santiago
						de Chile. {LANDING_PRODUCT_NAME} es nuestro producto, y si tu negocio necesita algo que no está
						en un sistema estándar, también lo construimos.
					</p>
					<div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
						{whatsapp ? (
							<a
								href={whatsapp.href}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#0d0d0d] transition-colors duration-200 hover:bg-[#e4e4e7]"
							>
								<LandingWhatsAppIcon size={16} />
								Escríbenos por WhatsApp
							</a>
						) : null}
						<Link
							href="/sobre-godcode"
							className="group inline-flex items-center gap-1.5 text-sm font-medium text-[#d4d4d8] transition-colors hover:text-white"
						>
							Conocer {LANDING_COMPANY_NAME}
							<ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
						</Link>
					</div>
				</div>

				<div data-reveal>
					<ul className="border-t border-white/[0.1]">
						{PROMISES.map((item) => (
							<li key={item.lead} className="border-b border-white/[0.1] py-7 md:py-8">
								<p className="text-xl leading-snug text-[#71717a] text-pretty md:text-2xl md:leading-snug">
									<span className="text-[#f4f4f5]">{item.lead}</span> {item.rest}
									{"href" in item ? (
										<>
											{" "}
											<Link
												href={item.href}
												className="text-[#d4d4d8] underline decoration-white/25 underline-offset-[6px] transition-colors hover:text-white hover:decoration-white/60"
											>
												{item.cta}
											</Link>
										</>
									) : null}
								</p>
							</li>
						))}
					</ul>
					<p className="mt-8 text-sm text-[#71717a]">— Equipo {LANDING_COMPANY_NAME}, Santiago de Chile</p>
				</div>
			</div>
		</section>
	);
}
