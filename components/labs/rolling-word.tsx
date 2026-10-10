"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const subscribeMotion = (onChange: () => void) => {
	const query = window.matchMedia(REDUCED_MOTION);
	query.addEventListener("change", onChange);
	return () => query.removeEventListener("change", onChange);
};
const motionAllowed = () => !window.matchMedia(REDUCED_MOTION).matches;
const motionOnServer = () => false;

/** Lo que tarda en subir una palabra y en ajustarse el recuadro (igual en los dos, para que vayan juntos). */
const SLIDE_MS = 600;
/**
 * Cada palabra ocupa 1,2em y entre una y otra hay 0,5em de aire: Poppins se sale de su línea y,
 * pegadas, las colas de la palabra anterior («p», «g») asomaban en el borde del recuadro.
 */
const LINE_EM = 1.2;
const STEP_EM = LINE_EM + 0.5;
const EASE = "cubic-bezier(0.76, 0, 0.24, 1)";

/**
 * La palabra que cambia en el título del método: «Un método [sencillo] de principio a fin».
 * El recuadro amarillo toma el ancho de la palabra que se ve y se ajusta al cambiar (antes medía
 * lo de la más larga y «sencillo» quedaba suelta en el medio, con la línea descentrada). La lista
 * lleva la primera palabra repetida al final: al llegar a ella vuelve al inicio sin animación, así
 * el bucle nunca baja por todas. Con «reducir movimiento» se queda en la primera. Es decorativa:
 * el título completo va en texto para lectores de pantalla.
 */
export function RollingWord({ words, intervalMs = 2600 }: { words: readonly string[]; intervalMs?: number }) {
	const motion = useSyncExternalStore(subscribeMotion, motionAllowed, motionOnServer);
	const sizers = useRef<Array<HTMLSpanElement | null>>([]);
	const [widths, setWidths] = useState<number[]>([]);
	const [step, setStep] = useState(0);
	const [instant, setInstant] = useState(false);

	// El ancho de cada palabra con la tipografía real (otra vez cuando termina de cargar y al cambiar el tamaño).
	useEffect(() => {
		const measure = () => setWidths(sizers.current.map((node) => node?.getBoundingClientRect().width ?? 0));
		measure();
		let alive = true;
		document.fonts?.ready.then(() => {
			if (alive) measure();
		});
		window.addEventListener("resize", measure);
		return () => {
			alive = false;
			window.removeEventListener("resize", measure);
		};
	}, [words]);

	useEffect(() => {
		if (!motion) return;
		const timer = window.setInterval(() => {
			setInstant(false);
			setStep((current) => current + 1);
		}, intervalMs);
		return () => window.clearInterval(timer);
	}, [motion, intervalMs]);

	// En la copia de la primera palabra (al final), vuelve al inicio sin que se note.
	useEffect(() => {
		if (step < words.length) return;
		const timer = window.setTimeout(() => {
			setInstant(true);
			setStep(0);
		}, SLIDE_MS + 40);
		return () => window.clearTimeout(timer);
	}, [step, words.length]);

	const ready = widths.length === words.length && widths.every((width) => width > 0);
	const current = motion ? step : 0;
	const width = ready ? widths[current % words.length] : undefined;
	// Hasta medir, solo la primera palabra: el recuadro nace con su ancho y no salta al hidratar.
	const stack = ready && motion ? [...words, words[0]] : [words[0]];
	const transition = instant ? "none" : undefined;

	return (
		// `overflow-clip` con margen: las colas de «p» y «g» bajan un poco fuera del amarillo en vez de
		// cortarse (donde no se entiende el margen, se cortan como antes).
		<span
			className="relative inline-grid h-[1.2em] overflow-clip rounded-[0.28em] bg-[#ffd33d] px-[0.3em] align-bottom text-[#15151a] [overflow-clip-margin:0.2em]"
			style={{
				width: width ? `calc(${width}px + 0.6em)` : undefined,
				transition: transition ?? `width ${SLIDE_MS}ms ${EASE}`,
			}}
		>
			{/* `text-left`: el título va centrado y, sin esto, cada palabra se centraba en una pista tan ancha
			    como la más larga («sencillo» quedaba corrida a la derecha y cortada). */}
			<span
				className="grid gap-y-[0.5em] text-left"
				style={{
					transform: `translateY(-${(motion ? current : 0) * STEP_EM}em)`,
					transition: transition ?? `transform ${SLIDE_MS}ms ${EASE}`,
				}}
			>
				{stack.map((word, index) => (
					<span key={`${index}-${word}`} className="h-[1.2em] whitespace-nowrap leading-[1.2em]">
						{word}
					</span>
				))}
			</span>
			{/* Medidores invisibles, uno por palabra, con la misma letra que el título. */}
			<span aria-hidden className="pointer-events-none invisible absolute left-0 top-0 flex flex-col">
				{words.map((word, index) => (
					<span
						key={word}
						ref={(node) => {
							sizers.current[index] = node;
						}}
						className="w-max whitespace-nowrap leading-[1.2em]"
					>
						{word}
					</span>
				))}
			</span>
		</span>
	);
}
