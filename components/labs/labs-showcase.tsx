"use client";

import { useEffect, useId, useState, useSyncExternalStore, type FocusEvent, type KeyboardEvent } from "react";

import type { LabsShowcaseItem } from "@/lib/labs/content";
import { cn } from "@/utils/cn";

import { LaptopFrame, PhoneFrame } from "./labs-frames";

/**
 * La vitrina del hero: un solo proyecto a la vez, grande y en calma, como presentan su producto las
 * páginas de Apple, Stripe o Linear. Un panel gris claro con la pantalla de escritorio en un MacBook y,
 * cuando la hay, la de teléfono en un iPhone delante; debajo, una fila de pestañas con los
 * cuatro proyectos. Pasa de uno a otro cada seis segundos (una línea bajo la pestaña activa marca el
 * tiempo) hasta que la persona elige uno, y se detiene mientras el cursor está encima o el foco está
 * dentro. Con «reducir movimiento» no pasa sola. En el teléfono solo se ve la pantalla de móvil.
 */

const AUTO_MS = 6000;

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const subscribeMotion = (onChange: () => void) => {
	const query = window.matchMedia(REDUCED_MOTION);
	query.addEventListener("change", onChange);
	return () => query.removeEventListener("change", onChange);
};
const motionAllowed = () => !window.matchMedia(REDUCED_MOTION).matches;
const motionOnServer = () => false;

export function LabsShowcase({ items }: { items: LabsShowcaseItem[] }) {
	const id = useId();
	const [active, setActive] = useState(0);
	const [chosen, setChosen] = useState(false);
	const [paused, setPaused] = useState(false);
	/** Cambia cada vez que la cuenta vuelve a empezar, para reiniciar la línea de tiempo. */
	const [run, setRun] = useState(0);
	/** Solo pasa sola cuando el sistema no pide «reducir movimiento» (y nunca en el servidor). */
	const auto = useSyncExternalStore(subscribeMotion, motionAllowed, motionOnServer);

	const running = auto && !chosen && !paused;

	useEffect(() => {
		if (!running) return;
		const timer = window.setTimeout(() => setActive((index) => (index + 1) % items.length), AUTO_MS);
		return () => window.clearTimeout(timer);
	}, [running, active, run, items.length]);

	const pick = (index: number) => {
		setChosen(true);
		setActive(index);
	};

	const resume = () => {
		setPaused(false);
		setRun((n) => n + 1);
	};

	const onBlur = (event: FocusEvent<HTMLDivElement>) => {
		if (!event.currentTarget.contains(event.relatedTarget as Node | null)) resume();
	};

	const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
		let next = index;
		if (event.key === "ArrowRight") next = (index + 1) % items.length;
		else if (event.key === "ArrowLeft") next = (index - 1 + items.length) % items.length;
		else if (event.key === "Home") next = 0;
		else if (event.key === "End") next = items.length - 1;
		else return;
		event.preventDefault();
		pick(next);
		document.getElementById(`${id}-tab-${next}`)?.focus();
	};

	return (
		<div onPointerEnter={() => setPaused(true)} onPointerLeave={resume} onFocus={() => setPaused(true)} onBlur={onBlur}>
			<div
				role="tabpanel"
				id={`${id}-panel`}
				aria-labelledby={`${id}-tab-${active}`}
				className="relative h-[24rem] overflow-hidden rounded-[1.75rem] border border-black/[0.06] bg-[#f4f4f6] bg-[radial-gradient(120%_90%_at_50%_0%,#ffffff_0%,#f4f4f6_55%,#ebebef_100%)] sm:h-[26rem] sm:rounded-[2rem] lg:h-[36rem]"
			>
				{items.map((item, index) => {
					const isActive = index === active;
					return (
						<div
							key={item.name}
							aria-hidden={!isActive}
							className={cn(
								"absolute inset-0 transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
								isActive ? "opacity-100" : "pointer-events-none translate-y-3 opacity-0",
							)}
						>
							{/* El MacBook con la pantalla de escritorio y, delante, el iPhone; en el teléfono solo el iPhone (o el MacBook, si el proyecto no tiene pantalla móvil). */}
							<LaptopFrame
								screen={item.desktop}
								address={item.desktop.address}
								className={cn(
									"absolute",
									item.phone
										? "left-[9%] top-[7%] hidden w-[66%] sm:block sm:left-[6%] sm:w-[70%] lg:left-[9%] lg:w-[66%]"
										: "left-1/2 top-1/2 w-[92%] -translate-x-1/2 -translate-y-1/2 sm:top-[7%] sm:w-[78%] sm:translate-y-0",
								)}
								sizes="(min-width: 1024px) 760px, (min-width: 640px) 70vw, 92vw"
							/>
							{item.phone ? (
								<PhoneFrame
									screen={item.phone}
									className="absolute bottom-[1.6rem] left-1/2 w-[9.5rem] -translate-x-1/2 sm:bottom-[5%] sm:left-auto sm:right-[8%] sm:w-[10rem] sm:translate-x-0 lg:right-[13%] lg:w-[13rem]"
									sizes="(min-width: 1024px) 208px, 160px"
								/>
							) : null}
						</div>
					);
				})}
			</div>

			<div
				role="tablist"
				aria-label="Proyectos en la vitrina"
				className="mt-4 grid grid-cols-2 gap-1 rounded-2xl border border-black/[0.06] bg-[#f4f4f6] p-1 sm:flex"
			>
				{items.map((item, index) => {
					const isActive = index === active;
					return (
						<button
							key={item.name}
							type="button"
							role="tab"
							id={`${id}-tab-${index}`}
							aria-selected={isActive}
							aria-controls={`${id}-panel`}
							tabIndex={isActive ? 0 : -1}
							onClick={() => pick(index)}
							onKeyDown={(event) => onKeyDown(event, index)}
							className={cn(
								"relative min-w-0 flex-1 overflow-hidden rounded-xl px-4 py-3 text-left transition-colors",
								isActive ? "bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.04)]" : "hover:bg-black/[0.04]",
							)}
						>
							<span className={cn("block truncate text-sm font-semibold", isActive ? "text-[#15151a]" : "text-[#3a3a44]")}>{item.name}</span>
							{/* En el teléfono solo cabe el nombre; la descripción corta aparece desde tablet. */}
							<span className="mt-0.5 hidden truncate text-xs text-[#6b6b76] sm:block">{item.caption}</span>
							{isActive && auto && !chosen ? (
								<span
									key={`${active}-${run}`}
									aria-hidden
									className={cn("labs-tab-progress absolute inset-x-4 bottom-0 h-[2px] rounded-full bg-[#4f5bff]", paused && "[animation-play-state:paused]")}
								/>
							) : null}
						</button>
					);
				})}
			</div>
		</div>
	);
}
