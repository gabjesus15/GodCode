import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { LandingSocialLink } from "@/lib/landing/contact";

import { LandingWhatsAppIcon } from "./social-icons";
import { SectionGlow } from "./section-light";

const TICKER_ITEMS = Array.from({ length: 12 }, (_, i) => (i % 2 === 0 ? "GCODE POS" : "CREA TU TIENDA"));

function TickerRun({ hidden }: { hidden?: boolean }) {
	return (
		<>
			{TICKER_ITEMS.map((text, i) => (
				<span
					key={`${hidden ? "dup" : "run"}-${i}`}
					aria-hidden={hidden}
					className="flex shrink-0 items-center gap-6 px-6 font-display text-3xl tracking-[0.12em] text-[#0d0d0d] md:text-4xl"
				>
					{text}
					<span className="h-2 w-2 rotate-45 bg-[#0d0d0d]" aria-hidden />
				</span>
			))}
		</>
	);
}

/** Cierre de la página: la última oportunidad de decidir, con la salida a WhatsApp para quien aún duda. */
export function Ticker({ socialLinks }: { socialLinks: LandingSocialLink[] }) {
	const whatsapp = socialLinks.find((link) => link.kind === "whatsapp");

	return (
		<section id="empezar" className="v3-section-dark pb-9">
			{/* pb-9 = 2.25rem: el footer (ficha) se monta sobre esa franja oscura y no sobre la cinta. */}
			{/* El amanecer: la luz sube desde la cinta hacia el titular. */}
			<SectionGlow
				className="bottom-[-38%] left-1/2 h-[820px] w-[min(1500px,220vw)] -translate-x-1/2"
				intensity={0.34}
				drift={120}
			/>
			<div className="v3-container py-28 text-center md:py-40">
				<div data-reveal className="mx-auto flex max-w-3xl flex-col items-center">
					<h2 className="font-display text-6xl leading-[0.92] text-[#f4f4f5] text-balance md:text-8xl">
						Empieza a vender <span className="text-[#4f5bff]">sin comisiones</span>
					</h2>
					<p className="mt-6 text-lg text-[#a1a1aa]">Tu tienda puede estar lista hoy.</p>
					<div className="mt-10 flex flex-col items-center gap-5 sm:flex-row sm:gap-7">
						<Link
							href="/onboarding"
							className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#4f5bff] px-8 py-4 text-[15px] font-semibold text-white transition-[background-color,transform] duration-200 hover:bg-[#3d47e6] active:scale-[0.98]"
						>
							Crear mi tienda
							<ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
						</Link>
						{whatsapp ? (
							<a
								href={whatsapp.href}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-2 text-[15px] font-medium text-[#d4d4d8] transition-colors hover:text-white"
							>
								<LandingWhatsAppIcon size={16} />
								<span className="underline decoration-white/20 underline-offset-[6px]">Hablar por WhatsApp</span>
							</a>
						) : null}
					</div>
				</div>
			</div>

			<Link
				href="/onboarding"
				aria-label="Crear mi tienda"
				data-track-zone="cinta"
				className="group block overflow-hidden bg-[#4f5bff] py-5 transition-colors duration-300 hover:bg-[#5d68ff]"
			>
				<div className="ticker-track">
					<TickerRun />
					<TickerRun hidden />
				</div>
			</Link>
		</section>
	);
}
