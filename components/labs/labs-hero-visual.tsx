import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/utils/cn";

/**
 * Lo que construimos, en cuatro pantallas de muestra: un panel de operación, una tienda,
 * un sistema de reservas y una automatización. Son ilustraciones, no clientes: ningún
 * nombre ni cifra es real, y por eso el bloque va oculto a los lectores de pantalla.
 * En escritorio flotan a la derecha del titular; en el teléfono se deslizan en una fila
 * bajo el botón.
 */

const BARS = [38, 54, 34, 68, 58, 82, 100];
const DAYS = ["L", "M", "M", "J", "V", "S", "D"];
const SLOTS = ["09:00", "10:30", "12:00"];
const STEPS = ["Nuevo pedido recibido", "Aviso por WhatsApp al equipo", "Fila nueva en la planilla"];

function Tile({ order, label, className, children }: { order: number; label: string; className?: string; children: ReactNode }) {
	return (
		<div
			className={cn("labs-rise w-60 shrink-0 snap-center lg:absolute", className)}
			style={{ "--labs-i": order } as CSSProperties}
		>
			<div className="labs-float rounded-2xl border border-white/10 bg-[#101012]/90 p-4 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur">
				<p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#8b93ff]">{label}</p>
				{children}
			</div>
		</div>
	);
}

export function LabsHeroVisual() {
	return (
		<div
			aria-hidden
			className="relative -mx-6 flex snap-x gap-4 overflow-x-auto px-6 pb-4 [scrollbar-width:none] lg:mx-0 lg:block lg:h-[540px] lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden"
		>
			<div className="labs-glow pointer-events-none absolute left-1/2 top-1/2 -z-10 hidden h-[520px] w-[520px] rounded-full bg-[#4f5bff]/20 blur-[110px] lg:block" />

			<Tile order={2} label="Panel de operación" className="lg:left-0 lg:top-0">
				<div className="mt-3 flex items-baseline justify-between">
					<p className="text-sm text-[#a1a1aa]">Ventas de la semana</p>
					<span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">+18 %</span>
				</div>
				<div className="mt-3 flex h-16 items-end gap-1.5">
					{BARS.map((height, index) => (
						<span
							key={`${index}-${height}`}
							className={cn("flex-1 rounded-sm", index === BARS.length - 1 ? "bg-[#4f5bff]" : "bg-white/15")}
							style={{ height: `${height}%` }}
						/>
					))}
				</div>
				<dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
					<div>
						<dt className="text-[#71717a]">Órdenes</dt>
						<dd className="font-semibold text-[#f4f4f5] tabular-nums">312</dd>
					</div>
					<div>
						<dt className="text-[#71717a]">Por despachar</dt>
						<dd className="font-semibold text-[#f4f4f5] tabular-nums">7</dd>
					</div>
				</dl>
			</Tile>

			<Tile order={3} label="Tienda online" className="w-56 lg:right-0 lg:top-16">
				<div className="mt-3 flex items-center gap-3">
					<span className="h-10 w-10 shrink-0 rounded-lg bg-gradient-to-br from-[#4f5bff] to-[#8b93ff]" />
					<div className="min-w-0 flex-1">
						<p className="truncate text-sm font-medium text-[#f4f4f5]">Kit de inicio</p>
						<p className="text-xs text-[#71717a]">
							2 unidades · <span className="font-semibold text-[#f4f4f5] tabular-nums">$ 24.990</span>
						</p>
					</div>
				</div>
				<div className="mt-3 flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2 text-xs">
					<span className="text-[#a1a1aa]">Envío a domicilio</span>
					<span className="text-[#f4f4f5]">Mañana</span>
				</div>
				<span className="mt-3 block rounded-full bg-[#4f5bff] py-2 text-center text-xs font-semibold text-white">Pagar en línea</span>
			</Tile>

			<Tile order={4} label="Reservas" className="w-56 lg:bottom-10 lg:left-4">
				<div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px]">
					{DAYS.map((day, index) => (
						<span
							key={`${index}-${day}`}
							className={cn("rounded-md py-1", index === 3 ? "bg-[#4f5bff] font-semibold text-white" : "text-[#71717a]")}
						>
							{day}
						</span>
					))}
				</div>
				<div className="mt-3 flex gap-1.5 text-[11px]">
					{SLOTS.map((slot) => (
						<span
							key={slot}
							className={cn(
								"rounded-full border px-2.5 py-1",
								slot === "10:30" ? "border-[#4f5bff] text-[#f4f4f5]" : "border-white/10 text-[#71717a]",
							)}
						>
							{slot}
						</span>
					))}
				</div>
				<p className="mt-3 text-xs text-[#a1a1aa]">Depósito pagado · recordatorio enviado</p>
			</Tile>

			<Tile order={5} label="Automatización" className="lg:bottom-0 lg:right-0">
				<ul className="mt-3 space-y-2 text-xs">
					{STEPS.map((step, index) => (
						<li key={step} className="flex items-center gap-2 text-[#d4d4d8]">
							<span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", index < 2 ? "bg-emerald-400" : "animate-pulse bg-[#4f5bff]")} />
							{step}
						</li>
					))}
				</ul>
				<p className="mt-3 text-xs text-[#71717a]">Hace 2 segundos</p>
			</Tile>
		</div>
	);
}
