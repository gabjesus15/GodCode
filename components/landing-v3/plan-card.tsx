"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";

import { cn } from "@/utils/cn";

export type PlanCardVariant = {
	id: string;
	/** Nombre completo del plan, el que viaja al alta y a la analítica. */
	name: string;
	/** Texto del selector cuando la tarjeta tiene más de una variante. */
	label: string;
	/** Precio ya formateado en el servidor, para que servidor y navegador pinten lo mismo. */
	price: string;
	currency: string;
	bullets: string[];
};

type PlanCardProps = {
	name: string;
	isPopular: boolean;
	variants: PlanCardVariant[];
};

function FeatureList({ id, features }: { id: string; features: string[] }) {
	return (
		<ul className="mt-6 flex flex-1 flex-col gap-3 border-t border-white/[0.06] pt-6">
			{features.map((feature, fi) => (
				<li key={`${id}-${fi}`} className="flex items-start gap-3 text-sm leading-snug text-[#a1a1aa]">
					<Check className="mt-0.5 h-4 w-4 shrink-0 text-[#71717a]" aria-hidden />
					<span className="whitespace-pre-wrap">{feature}</span>
				</li>
			))}
		</ul>
	);
}

/**
 * Tarjeta de un plan. Si el plan viene en variantes (Básico con solo menú o solo panel),
 * muestra un selector y la tarjeta cambia precio, lista y botón según la elegida: el
 * dueño compara dentro de la misma tarjeta en vez de entre dos «Básico» casi iguales.
 */
export function PlanCard({ name, isPopular, variants }: PlanCardProps) {
	const [selected, setSelected] = useState(0);
	const variant = variants[selected] ?? variants[0];
	if (!variant) return null;

	return (
		<div
			className={cn(
				"relative flex w-[84%] max-w-[360px] shrink-0 snap-center flex-col rounded-2xl border p-6 transition-colors duration-300 md:w-auto md:max-w-none lg:p-7",
				isPopular ? "border-[#4f5bff]/60 bg-[#13131a]" : "border-white/[0.08] bg-[#111113] hover:border-white/[0.16]",
			)}
		>
			{isPopular ? (
				// «Recomendado» y no «Más elegido»: es nuestra sugerencia, no un dato de ventas que hoy no medimos.
				<span className="absolute -top-2.5 left-6 rounded-full bg-[#4f5bff] px-2.5 py-0.5 text-[11px] font-semibold text-white">
					Recomendado
				</span>
			) : null}
			<h3 className="text-sm font-medium uppercase tracking-[0.12em] text-[#a1a1aa]">{name}</h3>

			{variants.length > 1 ? (
				// Botones con aria-pressed, no un radiogroup: cada uno se tabula y se activa con Enter o
				// espacio, sin tener que implementar el teclado de flechas que un radio exige.
				<div
					role="group"
					aria-label={`Qué incluye el plan ${name}`}
					className="mt-4 inline-flex self-start rounded-full border border-white/10 bg-black/20 p-0.5"
				>
					{variants.map((item, index) => {
						const pressed = index === selected;
						return (
							<button
								key={item.id}
								type="button"
								aria-pressed={pressed}
								onClick={() => setSelected(index)}
								className={cn(
									"rounded-full px-3.5 py-1 text-xs font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4f5bff]",
									pressed ? "bg-[#f4f4f5] text-[#0d0d0d]" : "text-[#a1a1aa] hover:text-[#f4f4f5]",
								)}
							>
								{item.label}
							</button>
						);
					})}
				</div>
			) : null}

			{/* Al cambiar de variante, el lector de pantalla dice el precio nuevo. */}
			<p className="mt-4 flex items-baseline gap-1.5" aria-live={variants.length > 1 ? "polite" : undefined}>
				<span className="font-display text-5xl leading-none text-[#f4f4f5] tabular-nums">{variant.price}</span>
				<span className="text-sm text-[#71717a]">{variant.currency}/mes</span>
			</p>
			<FeatureList id={variant.id} features={variant.bullets} />
			{/* El plan viaja al alta y queda marcado cuando el dueño publique su tienda. */}
			<Link
				href={`/onboarding?plan=${encodeURIComponent(variant.id)}`}
				aria-label={`Empezar con el plan ${variant.name}`}
				data-plan={variant.name}
				className={cn(
					"mt-8 inline-flex justify-center rounded-full px-6 py-3 text-sm font-semibold transition-colors duration-200",
					isPopular
						? "bg-[#4f5bff] text-white hover:bg-[#3d47e6]"
						: "border border-white/15 text-[#f4f4f5] hover:border-white/35 hover:bg-white/[0.04]",
				)}
			>
				Empezar
			</Link>
		</div>
	);
}
