import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Layers, Smartphone, Zap, Quote } from "lucide-react";

import type { LandingV3Config } from "@/lib/landing/v3-config";
import {
	getLandingShowcaseMenuUrl,
	LANDING_SHOWCASE_TENANT,
} from "@/lib/landing/showcase";

import { BentoShowcaseMetric } from "./bento-showcase-metric";

type BentoGridProps = {
	bentoMenuMobile: LandingV3Config["bentoMenuMobile"];
};

const FEATURE_PILLARS = [
	{
		icon: Zap,
		code: "01",
		title: "Rápido",
		text: "Pedidos al instante, sin fricción en mesa o delivery.",
	},
	{
		icon: Smartphone,
		code: "02",
		title: "Móvil",
		text: "Menú pensado para el celular del cliente.",
	},
	{
		icon: Layers,
		code: "03",
		title: "Multi-tenant",
		text: "Un local o varias sucursales, misma plataforma.",
	},
] as const;

export function BentoGrid({ bentoMenuMobile }: BentoGridProps) {
	const showcaseMenuUrl = getLandingShowcaseMenuUrl();

	return (
		<section id="nosotros" className="v3-section-dark py-16 md:py-24">
			<div className="v3-container">
				<p className="v3-label mb-12">{"// "}POR QUÉ GCODE</p>

				<div className="grid auto-rows-[minmax(220px,auto)] grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
					{/* 1. Wide stat card */}
					<div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[rgba(244,244,245,0.12)] bg-[#141414] p-7 transition-colors hover:border-[#4f5bff]/40 md:col-span-2 lg:col-span-2">
						<div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#4f5bff]/10 transition-transform duration-500 group-hover:scale-150" />
						<div className="relative flex items-start justify-between">
							<div>
								<p className="font-display text-6xl text-[#4f5bff] md:text-7xl">4.9/5</p>
								<p className="mt-2 text-sm font-medium text-[#a1a1aa]">
									Calificación promedio de dueños de restaurantes
								</p>
							</div>
							<span className="v3-label">{"// "}RATING</span>
						</div>
						<p className="relative mt-8 max-w-xl text-lg leading-relaxed text-[#f4f4f5]">
							Los equipos que migran a Gcode reducen a la mitad los errores de
							pedido en el primer mes.
						</p>
					</div>

					{/* 2. Tall UI preview card */}
					<div className="group relative min-h-[560px] overflow-hidden rounded-2xl border border-[rgba(244,244,245,0.12)] bg-[#141414] p-0 md:row-span-3">
						<div className="absolute inset-0 transition-transform duration-700 group-hover:scale-105">
							<Image
								src={bentoMenuMobile.src}
								alt={bentoMenuMobile.alt}
								fill
								className="object-cover"
								sizes="(max-width: 768px) 100vw, 33vw"
							/>
							<div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d]/60 to-[#0d0d0d]/20" />
						</div>
						<div className="relative z-10 flex h-full flex-col justify-end p-7">
							<p className="v3-label mb-2 text-[#4f5bff]">{"// "}MOBILE FIRST</p>
							<p className="font-display text-3xl leading-tight text-[#f4f4f5]">
								MENÚS QUE FUNCIONAN EN CUALQUIER PANTALLA
							</p>
						</div>
					</div>

					{/* 3. Caso real — Oishi Sushi */}
					<div className="group flex flex-col justify-between rounded-2xl border border-[rgba(244,244,245,0.12)] bg-[#141414] p-7 transition-colors hover:border-[rgba(244,244,245,0.2)]">
						<div className="flex items-start justify-between gap-3">
							<Quote className="h-8 w-8 shrink-0 text-[#4f5bff]/60" />
							<span className="v3-label text-[#71717a]">{"// "}CASO REAL</span>
						</div>
						<blockquote className="mt-4 text-lg leading-relaxed text-[#f4f4f5]">
							“{LANDING_SHOWCASE_TENANT.quote}”
						</blockquote>
						<BentoShowcaseMetric />
						<div className="mt-5 flex items-end justify-between gap-3 border-t border-[rgba(244,244,245,0.08)] pt-4">
							<div>
								<p className="text-sm font-semibold text-[#f4f4f5]">
									{LANDING_SHOWCASE_TENANT.name}
								</p>
								<p className="text-xs text-[#71717a]">
									{LANDING_SHOWCASE_TENANT.role} · {LANDING_SHOWCASE_TENANT.location}
								</p>
							</div>
							<Link
								href={showcaseMenuUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#4f5bff] transition-colors hover:text-[#8b93ff]"
							>
								Ver menú
								<ArrowUpRight className="h-3.5 w-3.5" />
							</Link>
						</div>
					</div>

					{/* 4. Feature highlight card */}
					<div className="flex flex-col justify-between rounded-2xl border border-[rgba(244,244,245,0.12)] bg-[#141414] p-7 transition-colors hover:border-[rgba(244,244,245,0.2)]">
						<div>
							<p className="v3-label mb-5 text-[#71717a]">{"// "}CAPACIDADES</p>
							<ul className="flex flex-col gap-4">
								{FEATURE_PILLARS.map(({ icon: Icon, code, title, text }) => (
									<li key={code} className="flex items-start gap-3">
										<div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1a1a1a] text-[#4f5bff]">
											<Icon className="h-4 w-4" />
										</div>
										<div className="min-w-0 pt-0.5">
											<p className="text-sm font-semibold text-[#f4f4f5]">
												<span className="mr-2 font-display text-[#4f5bff]">{code}</span>
												{title}
											</p>
											<p className="mt-0.5 text-sm leading-snug text-[#a1a1aa]">{text}</p>
										</div>
									</li>
								))}
							</ul>
						</div>
						<div className="mt-8 border-t border-[rgba(244,244,245,0.08)] pt-5">
							<p className="font-display text-2xl leading-tight text-[#f4f4f5]">
								RÁPIDO, MÓVIL Y MULTI-TENANT
							</p>
							<p className="mt-2 text-sm leading-relaxed text-[#a1a1aa]">
								Pensado para locales únicos y cadenas por igual.
							</p>
						</div>
					</div>

					{/* 5. CTA card */}
					<div className="flex flex-col justify-center rounded-2xl border border-[rgba(244,244,245,0.12)] bg-[#141414] p-7 md:col-span-2">
						<div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
							<div>
								<p className="v3-label mb-3">{"// "}NOSOTROS</p>
								<p className="max-w-md text-2xl font-medium leading-snug text-[#f4f4f5]">
									¿Querés ver cómo Gcode se adapta a tu negocio?
								</p>
							</div>
							<Link
								href="/sobre-godcode"
								className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-[#4f5bff] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#3d47e6]"
							>
								Conocer más
								<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
							</Link>
						</div>
					</div>

					{/* 6. Full accent card */}
					<div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-[#4f5bff] p-7 md:col-span-2 lg:col-span-3">
						<div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 transition-transform duration-700 group-hover:scale-125" />
						<div className="relative flex flex-col justify-between gap-10 lg:flex-row lg:items-end">
							<div>
								<p className="font-display text-6xl leading-[0.9] text-white md:text-7xl lg:text-8xl">
									0% COMISIONES
								</p>
								<p className="mt-4 max-w-xl text-lg leading-relaxed text-white/90">
									Cada pedido es tuyo. Sin comisiones de marketplaces, sin cargos
									ocultos, sin sorpresas.
								</p>
							</div>
							<Link
								href="/onboarding"
								className="inline-flex w-fit shrink-0 rounded-full bg-[#0d0d0d] px-8 py-4 text-sm font-semibold text-white transition-colors hover:bg-[#141414]"
							>
								Empezar ahora
							</Link>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
