"use client";

import { useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { trackEvent } from "@/lib/analytics/track-event";
import {
	DEFAULT_COMMISSION_PERCENT,
	estimateCommissions,
	MAX_COMMISSION_PERCENT,
	parseMoneyInput,
} from "@/lib/landing/commission-calculator";
import { formatLandingPrice } from "@/lib/landing/price";
import { cn } from "@/utils/cn";

type CommissionCalculatorProps = {
	/** Plan más barato en la moneda del visitante; null si no hay planes publicados. */
	plan: { price: number; currency: string } | null;
};

/** Ejemplo de partida, para que el resultado se vea sin tener que escribir nada. */
function defaultSalesFor(currency: string): number {
	return currency === "CLP" ? 3_000_000 : 3_000;
}

function formatInput(value: number, currency: string): string {
	if (!value) return "";
	return value.toLocaleString(currency === "CLP" ? "es-CL" : "en-US", { maximumFractionDigits: 2 });
}

export function CommissionCalculator({ plan }: CommissionCalculatorProps) {
	const currency = plan?.currency ?? "USD";
	const planPrice = plan?.price ?? 0;

	const [salesText, setSalesText] = useState(() => formatInput(defaultSalesFor(currency), currency));
	const [percent, setPercent] = useState(DEFAULT_COMMISSION_PERCENT);
	const trackedRef = useRef(false);

	const salesId = useId();
	const percentId = useId();
	const hintId = useId();

	const sales = parseMoneyInput(salesText, currency);
	const estimate = useMemo(
		() => estimateCommissions({ monthlySales: sales, commissionPercent: percent, planMonthlyPrice: planPrice }),
		[sales, percent, planPrice],
	);

	const money = (value: number) => formatLandingPrice(Math.round(value), currency);

	// Una sola vez por visita: basta para saber que la calculadora se usa, sin registrar montos.
	const markUsed = () => {
		if (trackedRef.current) return;
		trackedRef.current = true;
		trackEvent("calculator_used", { calculator: "comisiones" });
	};

	return (
		<div className="rounded-[1.75rem] border border-white/[0.08] bg-[#111113]/90 p-6 shadow-[0_40px_90px_-40px_rgba(0,0,0,0.9)] backdrop-blur-sm md:p-9">
			<div className="grid gap-8">
				<div>
					<label htmlFor={salesId} className="text-sm font-medium text-[#d4d4d8]">
						Tus ventas al mes por apps de delivery
					</label>
					<div className="mt-3 flex items-center rounded-2xl border border-white/[0.1] bg-[#0b0b0d] px-4 transition-colors focus-within:border-[#4f5bff]/70">
						<span className="text-lg text-[#71717a]" aria-hidden>
							$
						</span>
						<input
							id={salesId}
							type="text"
							inputMode="decimal"
							autoComplete="off"
							value={salesText}
							onChange={(event) => {
								setSalesText(event.target.value);
								markUsed();
							}}
							onBlur={() => setSalesText(formatInput(sales, currency))}
							placeholder={formatInput(defaultSalesFor(currency), currency)}
							className="w-full bg-transparent px-2 py-4 font-display text-3xl tracking-wide text-white tabular-nums outline-none placeholder:text-[#3f3f46]"
						/>
						<span className="text-sm text-[#71717a]">{currency}</span>
					</div>
				</div>

				<div>
					<div className="flex items-baseline justify-between gap-4">
						<label htmlFor={percentId} className="text-sm font-medium text-[#d4d4d8]">
							Comisión que te cobra la app
						</label>
						<output htmlFor={percentId} className="font-display text-3xl leading-none text-white tabular-nums">
							{percent}%
						</output>
					</div>
					<input
						id={percentId}
						type="range"
						min={0}
						max={MAX_COMMISSION_PERCENT}
						step={1}
						value={percent}
						aria-describedby={hintId}
						onChange={(event) => {
							setPercent(Number(event.target.value));
							markUsed();
						}}
						className="v3-range mt-4 w-full"
						style={{ "--range-fill": `${(percent / MAX_COMMISSION_PERCENT) * 100}%` } as React.CSSProperties}
					/>
					<p id={hintId} className="mt-2 text-xs text-[#71717a]">
						Lo encuentras en tu contrato o en la liquidación de la app. Cambia según el país y el tipo de envío.
					</p>
				</div>
			</div>

			<div className="mt-9 border-t border-white/[0.08] pt-8" aria-live="polite">
				<p className="text-sm text-[#a1a1aa]">Hoy pagas en comisiones</p>
				<p className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
					<span className="font-display text-6xl leading-none text-white tabular-nums md:text-7xl">
						{money(estimate.monthlyCommission)}
					</span>
					<span className="text-sm text-[#a1a1aa]">
						al mes · {money(estimate.yearlyCommission)} al año
					</span>
				</p>

				<ul className="mt-8 grid gap-3">
					{estimate.scenarios.map((scenario) => {
						const positive = scenario.netMonthly > 0;
						return (
							<li
								key={scenario.share}
								className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5"
							>
								<span className="text-sm text-[#a1a1aa]">
									Si llevas <span className="font-semibold text-[#f4f4f5]">{Math.round(scenario.share * 100)}%</span> de
									esos pedidos a tu tienda
								</span>
								<span
									className={cn(
										"shrink-0 text-right font-display text-2xl leading-none tabular-nums",
										positive ? "text-[#8b93ff]" : "text-[#71717a]",
									)}
								>
									{positive ? `+${money(scenario.netMonthly)}` : "Aún no compensa"}
								</span>
							</li>
						);
					})}
				</ul>

				<p className="mt-5 text-xs leading-relaxed text-[#71717a]">
					{plan
						? `Ahorro al mes ya descontado el plan desde ${formatLandingPrice(plan.price, plan.currency)} ${plan.currency}/mes. `
						: null}
					Es una estimación: no incluye envío ni la comisión de tu medio de pago.
				</p>

				<Link
					href="/onboarding"
					className="group mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#4f5bff] px-7 py-4 text-[15px] font-semibold text-white transition-[background-color,transform] duration-200 hover:bg-[#3d47e6] active:scale-[0.98]"
				>
					Crear mi tienda sin comisiones
					<ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
				</Link>
			</div>
		</div>
	);
}
