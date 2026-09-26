import Link from "next/link";
import { CalendarX2, MessagesSquare, ShieldCheck, Store } from "lucide-react";

import { LANDING_COMPANY_NAME } from "@/lib/landing/brand";
import type { LandingSocialLink } from "@/lib/landing/contact";

import { LandingWhatsAppIcon } from "./social-icons";

/** Solo promesas que el producto cumple hoy (mismas que FAQ, precios y términos). */
const GUARANTEES = [
	{ icon: ShieldCheck, title: "Datos protegidos", text: "Aislados por negocio y siempre con conexión cifrada." },
	{ icon: CalendarX2, title: "Sin permanencia", text: "Cancelas cuando quieras, sin penalidad." },
	{ icon: MessagesSquare, title: "Soporte de personas", text: "Te atiende el equipo que construye el sistema." },
	{ icon: Store, title: "Negocios reales", text: "Restaurantes de Chile y Venezuela ya venden con Gcode.", href: "/onboarding/negocios" },
] as const;

export function Trust({ socialLinks }: { socialLinks: LandingSocialLink[] }) {
	const whatsapp = socialLinks.find((link) => link.kind === "whatsapp");

	return (
		<section id="confianza" className="v3-section-dark py-24 md:py-32">
			<div className="v3-container">
				<div data-reveal className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
					<div className="max-w-xl">
						<h2 className="font-display text-5xl leading-[0.95] text-[#f4f4f5] text-balance md:text-6xl">
							Hecho por personas que puedes contactar
						</h2>
						<p className="mt-6 text-lg leading-relaxed text-[#a1a1aa] text-pretty">
							Detrás está {LANDING_COMPANY_NAME}, un estudio de desarrollo web y sistemas a medida de
							Santiago de Chile.
						</p>
					</div>
					{whatsapp ? (
						<a
							href={whatsapp.href}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm font-medium text-white transition-colors duration-200 hover:border-white/35 hover:bg-white/[0.04]"
						>
							<LandingWhatsAppIcon size={16} />
							Escríbenos por WhatsApp
						</a>
					) : null}
				</div>

				<ul data-reveal className="mt-16 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
					{GUARANTEES.map((item) => {
						const Icon = item.icon;
						const body = (
							<>
								<Icon className="h-5 w-5 text-[#8b93ff]" strokeWidth={1.75} aria-hidden />
								<h3 className="mt-5 font-semibold text-[#f4f4f5]">{item.title}</h3>
								<p className="mt-1.5 text-sm leading-relaxed text-[#a1a1aa] text-pretty">{item.text}</p>
							</>
						);
						return (
							<li key={item.title} className="border-t border-white/[0.08] pt-6">
								{"href" in item ? (
									<Link href={item.href} className="group block">
										{body}
										<span className="mt-3 inline-block text-sm font-medium text-[#d4d4d8] underline decoration-white/20 underline-offset-4 transition-colors group-hover:text-white group-hover:decoration-white/60">
											Verlos
										</span>
									</Link>
								) : (
									body
								)}
							</li>
						);
					})}
				</ul>
			</div>
		</section>
	);
}
