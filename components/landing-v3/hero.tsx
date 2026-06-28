import Link from "next/link";

import { HeroPhoneShowcase } from "./hero-phone-showcase";

type HeroFromPrice = {
	price: number;
	currency: string;
} | null;

function formatFromPrice(fromPrice: HeroFromPrice): { amount: string; currency: string } {
	if (!fromPrice) return { amount: "$19", currency: "USD" };
	try {
		const amount = new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: fromPrice.currency,
			maximumFractionDigits: 0,
		}).format(fromPrice.price);
		return { amount, currency: fromPrice.currency };
	} catch {
		return { amount: `$${Math.round(fromPrice.price)}`, currency: fromPrice.currency };
	}
}

function HeroBackground() {
	return (
		<div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
			<div className="absolute inset-0 bg-[#080808]" />

			<div
				className="absolute -right-[10%] top-[8%] h-[70vh] w-[65vw] max-w-[900px] rounded-full opacity-70 blur-[60px] md:blur-[100px]"
				style={{
					background:
						"radial-gradient(ellipse at center, rgba(124, 58, 237, 0.45) 0%, rgba(88, 28, 135, 0.2) 45%, transparent 72%)",
				}}
			/>

			<div
				className="absolute right-[5%] top-[35%] h-[40vh] w-[35vw] max-w-[480px] rounded-full opacity-50 blur-[50px] md:blur-[80px]"
				style={{
					background:
						"radial-gradient(ellipse at center, rgba(168, 85, 247, 0.3) 0%, transparent 70%)",
				}}
			/>

			<div
				className="absolute -left-[15%] bottom-[10%] h-[50vh] w-[50vw] max-w-[600px] rounded-full opacity-30 blur-[70px] md:blur-[120px]"
				style={{
					background:
						"radial-gradient(ellipse at center, rgba(99, 102, 241, 0.25) 0%, transparent 70%)",
				}}
			/>

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

function HeroPriceTag({
	amount,
	currency,
	className,
}: {
	amount: string;
	currency: string;
	className?: string;
}) {
	return (
		<div className={className}>
			<p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#71717a]">
				{"// "}DESDE
			</p>
			<p className="font-display text-2xl leading-none text-white sm:text-[28px]">
				{amount}
				<span className="ml-1 text-xs text-[#71717a] sm:text-[13px]">{currency}/MES</span>
			</p>
		</div>
	);
}

export function Hero({ fromPrice }: { fromPrice: HeroFromPrice }) {
	const { amount, currency } = formatFromPrice(fromPrice);

	return (
		<section className="relative min-h-[100dvh] overflow-hidden bg-[#080808] lg:min-h-screen lg:pb-[52px]">
			<HeroBackground />

			<div className="v3-container relative flex min-h-[100dvh] flex-col justify-center gap-8 pt-24 pb-10 sm:gap-10 lg:min-h-screen lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-x-10 lg:gap-y-0 lg:pt-28 lg:pb-12 xl:gap-x-16">
				{/* Copy */}
				<div className="z-10 flex flex-col items-center text-center lg:items-start lg:text-left lg:py-6">
					<p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#a855f7] sm:mb-4 lg:mb-5">
						{"// "}EL POS Y MENÚ DIGITAL
					</p>

					<h1 className="w-full font-display text-[clamp(4rem,18vw,7.5rem)] leading-[0.88] tracking-[-0.02em] text-white lg:text-[clamp(5.5rem,7.5vw,13.75rem)] lg:leading-[0.85]">
						<span className="sr-only">Menú digital y POS para restaurantes — Gcode</span>
						<span aria-hidden="true">GCODE</span>
					</h1>

					<p className="mt-3 max-w-sm text-base leading-relaxed text-[#a1a1aa] sm:mt-4 sm:max-w-md sm:text-lg lg:mt-5">
						Menú, pedidos y caja en un solo lugar.{" "}
						<span className="text-[#f4f4f5]">Sin comisiones por venta.</span>
					</p>

					<p className="mt-2 max-w-sm text-sm leading-relaxed text-[#a855f7]/90 sm:max-w-md">
						En tu primer pago: 2 meses al precio de 1.
					</p>

					<div className="mt-5 flex w-full max-w-sm flex-wrap items-center justify-center gap-2.5 sm:mt-6 sm:gap-3 lg:max-w-none lg:justify-start">
						<Link
							href="/onboarding"
							className="inline-flex min-w-[140px] justify-center rounded-md bg-[#a855f7] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#9333ea] sm:px-7"
						>
							Empezar ahora
						</Link>
						<Link
							href="#funciones"
							className="inline-flex min-w-[140px] justify-center rounded-md border border-white/20 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-[#a855f7] hover:text-white sm:px-7"
						>
							Ver funciones
						</Link>
					</div>

					<HeroPriceTag
						amount={amount}
						currency={currency}
						className="mt-5 sm:mt-6 lg:mt-7"
					/>
				</div>

				{/* Teléfonos */}
				<div className="relative z-10 flex w-full items-center justify-center lg:py-4">
					<HeroPhoneShowcase />
				</div>
			</div>

			{/* Barra inferior solo desktop */}
			<div className="absolute bottom-0 left-0 right-0 z-30 hidden border-t border-white/[0.06] bg-[#080808]/80 backdrop-blur-md lg:block">
				<Link
					href="/onboarding"
					className="group flex min-h-[52px] items-center justify-center transition-colors hover:bg-white/5"
				>
					<span className="font-display text-[13px] tracking-[0.2em] text-white transition-colors group-hover:text-[#a855f7]">
						EMPEZAR AHORA — 2 MESES AL PRECIO DE 1
					</span>
				</Link>
			</div>
		</section>
	);
}
