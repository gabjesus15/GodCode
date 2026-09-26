import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Layers, Smartphone, Zap } from "lucide-react";

import { LANDING_COMPANY_NAME, LANDING_PRODUCT_NAME } from "@/lib/landing/brand";
import type { LandingV3Config } from "@/lib/landing/v3-config";
import { getLandingShowcaseMenuUrl, LANDING_SHOWCASE_TENANT } from "@/lib/landing/showcase";
import { SectionGlow } from "./section-light";

type BentoGridProps = {
	bentoMenuMobile: LandingV3Config["bentoMenuMobile"];
};

const CAPABILITIES = [
	{
		icon: Zap,
		title: "Rápido",
		text: "Pedidos al instante, sin fricción en la mesa ni en delivery.",
	},
	{
		icon: Smartphone,
		title: "Pensado para el celular",
		text: "Tu carta se ve y se usa bien en el teléfono de tu cliente.",
	},
	{
		icon: Layers,
		title: "Multisucursal",
		text: "Un local o varias sucursales en la misma plataforma.",
	},
] as const;

/** Por qué Gcode: la idea (tu canal), la prueba (Oishi Sushi), lo que trae y quién está detrás. */
export function BentoGrid({ bentoMenuMobile }: BentoGridProps) {
	const showcaseMenuUrl = getLandingShowcaseMenuUrl();

	return (
		<section id="por-que-gcode" className="v3-section-dark py-24 md:py-32">
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

				<ul data-reveal className="mt-24 grid gap-10 sm:grid-cols-3 md:mt-28">
					{CAPABILITIES.map(({ icon: Icon, title, text }) => (
						<li key={title} className="border-t border-white/[0.08] pt-6">
							<Icon className="h-5 w-5 text-[#8b93ff]" strokeWidth={1.75} aria-hidden />
							<h3 className="mt-5 font-semibold text-[#f4f4f5]">{title}</h3>
							<p className="mt-1.5 text-sm leading-relaxed text-[#a1a1aa] text-pretty">{text}</p>
						</li>
					))}
				</ul>

				<div
					data-reveal
					className="mt-16 flex flex-col gap-6 rounded-[1.75rem] border border-white/[0.08] bg-[#111113] p-8 sm:flex-row sm:items-center sm:justify-between md:p-10"
				>
					<div className="max-w-xl">
						<p className="text-2xl font-medium leading-snug text-[#f4f4f5] text-balance">
							¿Necesitas algo que no está en un sistema estándar?
						</p>
						<p className="mt-3 leading-relaxed text-[#a1a1aa] text-pretty">
							{LANDING_COMPANY_NAME} es un estudio de desarrollo web y sistemas a medida.{" "}
							{LANDING_PRODUCT_NAME} es nuestro producto para restaurantes, y también creamos páginas y
							sistemas hechos para tu negocio.
						</p>
					</div>
					<Link
						href="/sobre-godcode"
						className="group inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-sm font-medium text-white transition-colors duration-200 hover:border-white/35 hover:bg-white/[0.04]"
					>
						Conocer {LANDING_COMPANY_NAME}
						<ArrowRight
							className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
							aria-hidden
						/>
					</Link>
				</div>
			</div>
		</section>
	);
}
