"use client";

import { useEffect, useState, type CSSProperties } from "react";

import type { LabsScreen } from "@/lib/labs/content";
import { cn } from "@/utils/cn";

import { LaptopFrame, PhoneFrame } from "./labs-frames";

/**
 * El muestrario del hero: las pantallas reales van en láminas de color puestas una junto a otra,
 * como las tiras de un abanico de muestras de pintura. Una lámina está abierta y enseña su pantalla
 * entera; las demás quedan contraídas, con su nombre en vertical. Apuntar, tocar o enfocar una lámina
 * la abre y contrae el resto. Hasta que la persona elige, el muestrario pasa de lámina solo cada pocos
 * segundos (nunca con «reducir movimiento»). En el teléfono las láminas se apilan en vertical.
 */

/** Tinta de cada lámina, en el orden de `LABS_HERO_SCREENS`. */
const TINTS = [
	"bg-[linear-gradient(170deg,#ffe066_0%,#ffb13d_100%)]",
	"bg-[linear-gradient(170deg,#ff9ccb_0%,#ff5fa8_100%)]",
	"bg-[linear-gradient(170deg,#eeecff_0%,#bdb6ff_100%)]",
	"bg-[linear-gradient(170deg,#86f0de_0%,#22c5b0_100%)]",
	"bg-[linear-gradient(170deg,#ffc8a8_0%,#ff7a3d_100%)]",
] as const;

/** Cada cuántos milisegundos pasa de lámina mientras nadie ha elegido una. */
const AUTO_MS = 4500;

export function LabsHeroDeck({ screens, initial = 2 }: { screens: LabsScreen[]; initial?: number }) {
	const [open, setOpen] = useState(initial);
	const [chosen, setChosen] = useState(false);

	useEffect(() => {
		if (chosen || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		const id = window.setInterval(() => setOpen((index) => (index + 1) % screens.length), AUTO_MS);
		return () => window.clearInterval(id);
	}, [chosen, screens.length]);

	const pick = (index: number) => {
		setChosen(true);
		setOpen(index);
	};

	return (
		<ul className="absolute inset-3 flex flex-col gap-2 sm:inset-5 sm:gap-2.5 lg:inset-7 lg:flex-row lg:gap-3">
			{screens.map((screen, index) => {
				const isOpen = index === open;
				const laptop = screen.frame === "laptop";
				return (
					<li
						key={screen.src}
						data-open={isOpen}
						style={{ "--labs-i": index + 2 } as CSSProperties}
						className={cn(
							"labs-rise group relative min-h-0 overflow-hidden rounded-[1.4rem] shadow-[0_30px_60px_-34px_rgba(20,8,90,0.7)] transition-[flex-grow,flex-basis] duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] sm:rounded-[1.6rem]",
							"data-[open=false]:flex-[0_0_3.25rem] data-[open=true]:flex-[1_1_0%] lg:data-[open=false]:flex-[1_1_0%] lg:data-[open=true]:flex-[4.4_1_0%]",
							TINTS[index % TINTS.length],
						)}
					>
						<button
							type="button"
							aria-pressed={isOpen}
							aria-label={`Ver ${screen.label ?? screen.alt}`}
							className="absolute inset-0 z-10 cursor-pointer rounded-[inherit] focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white"
							onMouseEnter={() => pick(index)}
							onFocus={() => pick(index)}
							onClick={() => pick(index)}
						/>
						{/* Etiqueta en horizontal: siempre en el teléfono; en escritorio, solo en la lámina abierta. */}
						<div className="pointer-events-none absolute left-5 top-[1.05rem] flex items-baseline gap-2 whitespace-nowrap transition-opacity duration-500 sm:left-6 sm:top-5 lg:group-data-[open=false]:opacity-0">
							<span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#15151a]/70">{screen.label}</span>
							{screen.project ? <span className="text-sm font-semibold text-[#15151a]">{screen.project}</span> : null}
						</div>
						{/* Etiqueta en vertical para las láminas contraídas de escritorio. */}
						<span
							aria-hidden
							className="pointer-events-none absolute left-1/2 top-6 hidden -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.18em] text-[#15151a]/80 transition-opacity duration-500 [writing-mode:vertical-rl] lg:block lg:group-data-[open=true]:opacity-0"
						>
							{screen.label}
						</span>
						<figure
							className={cn(
								"pointer-events-none absolute left-1/2 -translate-x-1/2 transition-[transform,opacity] duration-700",
								laptop
									? "top-1/2 w-64 -translate-y-1/2 sm:w-80 lg:w-[34rem] lg:-translate-y-[44%] lg:group-data-[open=false]:-translate-y-[6%]"
									: "top-12 w-40 sm:top-14 lg:w-[15rem] lg:group-data-[open=false]:translate-y-28",
								"lg:group-data-[open=false]:opacity-60",
								laptop ? "lg:group-data-[open=false]:scale-90" : "lg:group-data-[open=false]:scale-[0.88]",
							)}
						>
							{laptop ? (
								<LaptopFrame screen={screen} sizes="(min-width: 1024px) 544px, 320px" />
							) : (
								<PhoneFrame screen={screen} sizes="(min-width: 1024px) 240px, 160px" screenClassName="max-h-[19rem] lg:max-h-[30rem]" />
							)}
						</figure>
					</li>
				);
			})}
		</ul>
	);
}
