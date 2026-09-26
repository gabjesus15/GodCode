import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";

import type { LandingV3Config } from "@/lib/landing/v3-config";
import { getLandingShowcaseMenuUrl, LANDING_SHOWCASE_TENANT } from "@/lib/landing/showcase";
import { SectionGlow } from "./section-light";

type BentoGridProps = {
	bentoMenuMobile: LandingV3Config["bentoMenuMobile"];
};

/** Por qué Gcode: la idea (tu canal) y la prueba real (Oishi Sushi). */
export function BentoGrid({ bentoMenuMobile }: BentoGridProps) {
	const showcaseMenuUrl = getLandingShowcaseMenuUrl();

	return (
		<section id="por-que-gcode" className="v3-section-dark py-24 md:py-28">
			<SectionGlow
				className="right-[-20%] top-[2%] h-[760px] w-[760px] lg:right-[-6%]"
				intensity={0.18}
				drift={110}
			/>
			<div className="v3-container">
				<div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-24">
					<div
						data-reveal
						className="relative mx-auto aspect-[4/5] w-full max-w-[460px] overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-[#141414] lg:order-2"
					>
						<Image
							src={bentoMenuMobile.src}
							alt={bentoMenuMobile.alt}
							fill
							className="object-cover object-top"
							sizes="(max-width: 1024px) 90vw, 460px"
						/>
						<div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#0d0d0d]/80 to-transparent" />
					</div>

					<div data-reveal className="max-w-xl">
						<h2 className="font-display text-5xl leading-[0.95] text-[#f4f4f5] text-balance md:text-6xl">
							Tu canal de venta, no el de una app
						</h2>
						<p className="mt-6 text-lg leading-relaxed text-[#a1a1aa] text-pretty">
							Las apps de delivery se quedan con una parte de cada pedido. Con tu propia tienda, el cliente y
							la venta son tuyos.
						</p>
						<Link
							href="/calculadora-comisiones"
							className="group mt-5 inline-flex items-center gap-1.5 text-[15px] font-medium text-[#d4d4d8] underline decoration-white/20 underline-offset-[6px] transition-colors hover:text-white hover:decoration-white/60"
						>
							Calcula cuánto pagas en comisiones
							<ArrowRight
								className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
								aria-hidden
							/>
						</Link>
						<p className="mt-8 text-sm leading-relaxed text-[#71717a]">
							Rápido en la mesa y en delivery <span aria-hidden className="mx-1.5">·</span> Pensado para el
							celular <span aria-hidden className="mx-1.5">·</span> Uno o varios locales
						</p>

						<figure className="mt-12 border-t border-white/[0.08] pt-10">
							<blockquote className="text-xl leading-relaxed text-[#f4f4f5] text-pretty md:text-2xl md:leading-snug">
								&ldquo;{LANDING_SHOWCASE_TENANT.quote}&rdquo;
							</blockquote>
							<figcaption className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
								<span className="font-semibold text-[#f4f4f5]">{LANDING_SHOWCASE_TENANT.name}</span>
								<span className="text-[#71717a]">
									{LANDING_SHOWCASE_TENANT.location} · {LANDING_SHOWCASE_TENANT.metricValue}{" "}
									{LANDING_SHOWCASE_TENANT.metricLabel.toLowerCase()}
								</span>
								<Link
									href={showcaseMenuUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1 font-medium text-[#d4d4d8] transition-colors hover:text-white"
								>
									Ver su menú
									<ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
								</Link>
							</figcaption>
						</figure>
					</div>
				</div>

			</div>
		</section>
	);
}
