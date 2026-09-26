import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { formatLandingPrice } from "@/lib/landing/price";
import type { LandingV3PhoneSlide } from "@/lib/landing/v3-config";

import { HeroPhoneShowcase } from "./hero-phone-showcase";

type HeroFromPrice = {
	price: number;
	currency: string;
} | null;

function HeroBackground() {
	return (
		<div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
			<div className="absolute inset-0 bg-[#080808]" />

			{/* Capa de fondo: al bajar se queda atrás (parallax en CSS). */}
			<div className="v3-hero-depth-back absolute inset-0">
			<div
				className="absolute -right-[10%] top-[8%] h-[70vh] w-[65vw] max-w-[900px] rounded-full opacity-70 blur-[60px] md:blur-[100px]"
				style={{
					background:
						"radial-gradient(ellipse at center, rgba(79, 91, 255, 0.45) 0%, rgba(61, 71, 230, 0.2) 45%, transparent 72%)",
				}}
			/>

			<div
				className="absolute right-[5%] top-[35%] h-[40vh] w-[35vw] max-w-[480px] rounded-full opacity-50 blur-[50px] md:blur-[80px]"
				style={{
					background: "radial-gradient(ellipse at center, rgba(79, 91, 255, 0.3) 0%, transparent 70%)",
				}}
			/>

			<div
				className="absolute -left-[15%] bottom-[10%] h-[50vh] w-[50vw] max-w-[600px] rounded-full opacity-30 blur-[70px] md:blur-[120px]"
				style={{
					background: "radial-gradient(ellipse at center, rgba(99, 102, 241, 0.25) 0%, transparent 70%)",
				}}
			/>
			</div>

			<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.55)_100%)]" />

			<div
				className="absolute inset-0 opacity-[0.035] mix-blend-overlay"
				style={{
					backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
					backgroundSize: "128px 128px",
				}}
			/>
		</div>
	);
}

export function Hero({
	fromPrice,
	heroPhones,
}: {
	fromPrice: HeroFromPrice;
	heroPhones: LandingV3PhoneSlide[];
}) {
	return (
		<section
			data-landing-hero
			className="relative z-10 overflow-hidden rounded-b-[2rem] border-b border-[#4f5bff]/25 bg-[#080808] shadow-[0_24px_60px_-24px_rgba(79,91,255,0.45)] md:rounded-b-[3rem]"
		>
			<HeroBackground />

			<div className="v3-container relative flex flex-col gap-14 pt-32 pb-16 lg:grid lg:min-h-[100svh] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-center lg:gap-x-12 lg:py-24 xl:gap-x-20">
				<div className="z-10 flex flex-col items-center text-center lg:items-start lg:text-left">
					<h1 className="font-display text-[clamp(3.1rem,13.5vw,6rem)] leading-[0.9] text-white">
						<span className="v3-hero-line">
							<span>Menú digital</span>
						</span>
						<span className="v3-hero-line">
							<span>y POS para</span>
						</span>
						<span className="v3-hero-line">
							<span className="text-[#4f5bff]">restaurantes</span>
						</span>
					</h1>

					<p className="v3-hero-copy mt-6 max-w-[26rem] text-lg leading-relaxed text-[#a1a1aa] text-pretty">
						Tus clientes piden desde tu link o tu QR, y tú no pagas comisión por venta.
					</p>

					<div className="v3-hero-copy mt-9 flex flex-col items-center gap-5 sm:flex-row sm:gap-7">
						<Link
							href="/onboarding"
							className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#4f5bff] px-7 py-3.5 text-[15px] font-semibold text-white transition-[background-color,transform] duration-200 hover:bg-[#3d47e6] active:scale-[0.98]"
						>
							Crear mi tienda
							<ArrowRight
								className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
								aria-hidden
							/>
						</Link>
						<Link
							href="#como-funciona"
							className="text-[15px] font-medium text-[#d4d4d8] underline decoration-white/20 underline-offset-[6px] transition-colors duration-200 hover:text-white hover:decoration-white/60"
						>
							Ver cómo funciona
						</Link>
					</div>

					<p className="v3-hero-copy mt-8 text-sm text-[#71717a]">
						{fromPrice ? (
							<>
								Desde {formatLandingPrice(fromPrice.price, fromPrice.currency)} {fromPrice.currency}/mes
								<span aria-hidden className="mx-2">
									·
								</span>
							</>
						) : null}
						2 meses al precio de 1 en tu primer pago
					</p>
				</div>

				<div className="v3-hero-phones relative z-10 flex w-full items-center justify-center">
					<div className="v3-hero-depth-front flex w-full justify-center">
						<HeroPhoneShowcase phones={heroPhones} />
					</div>
				</div>
			</div>
		</section>
	);
}
