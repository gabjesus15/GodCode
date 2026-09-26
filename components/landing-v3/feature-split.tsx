"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/utils/cn";

import { PhoneFrame } from "./phone-frame";
import { SectionGlow } from "./section-light";
import type { LandingV3Config } from "@/lib/landing/v3-config";

const AUTOPLAY_MS = 7000;
const SWIPE_THRESHOLD_PX = 48;

const slides = [
	{
		id: "pos",
		chip: "Punto de venta",
		accentWord: "POS",
		rest: "para restaurantes",
		description: "Toma pedidos, divide cuentas y envía comandas a cocina en segundos.",
		imageKey: "pos" as const,
		aspectRatio: 473 / 1024,
	},
	{
		id: "menu",
		chip: "Menú digital",
		accentWord: "Menú digital",
		rest: "que vende solo",
		description: "Fotos, variantes y combos por QR. Tus clientes piden desde el celular.",
		imageKey: "menu" as const,
		aspectRatio: 473 / 1024,
	},
	{
		id: "inventory",
		chip: "Pedidos y caja",
		accentWord: "Pedidos online",
		rest: "y caja integrados",
		description: "Sala, delivery, retiro y WhatsApp en un solo panel, con inventario y reportes.",
		imageKey: "inventory" as const,
		aspectRatio: 473 / 1024,
	},
] as const;

function barFillPercent(i: number, activeIndex: number, progress: number, reducedMotion: boolean): number {
	if (i < activeIndex) return 100;
	if (i > activeIndex) return 0;
	return reducedMotion ? 100 : progress * 100;
}

type FeatureSplitProps = {
	featureImages: LandingV3Config["featureImages"];
};

export function FeatureSplit({ featureImages }: FeatureSplitProps) {
	const [index, setIndex] = useState(0);
	const [paused, setPaused] = useState(false);
	const [inView, setInView] = useState(false);
	const [slideProgress, setSlideProgress] = useState(0);
	const [dragOffset, setDragOffset] = useState(0);
	const [isDragging, setIsDragging] = useState(false);

	const sectionRef = useRef<HTMLElement>(null);
	const pointerStartX = useRef(0);
	const pointerId = useRef<number | null>(null);
	const resumeTimer = useRef<number | null>(null);

	// Se lee al montar: leerlo en el render inicial rompía la hidratación (el servidor no conoce la preferencia).
	const [reducedMotion, setReducedMotion] = useState(false);
	useEffect(() => {
		const query = window.matchMedia("(prefers-reduced-motion: reduce)");
		const sync = () => setReducedMotion(query.matches);
		sync();
		query.addEventListener("change", sync);
		return () => query.removeEventListener("change", sync);
	}, []);

	const slide = slides[index];

	const goTo = useCallback((next: number) => {
		const normalized = ((next % slides.length) + slides.length) % slides.length;
		setIndex(normalized);
		setSlideProgress(0);
	}, []);

	const goNext = useCallback(() => goTo(index + 1), [goTo, index]);
	const goPrev = useCallback(() => goTo(index - 1), [goTo, index]);

	const pauseAutoplay = useCallback(() => {
		setPaused(true);
		if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
	}, []);

	const scheduleAutoplayResume = useCallback(() => {
		if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
		resumeTimer.current = window.setTimeout(() => setPaused(false), 5000);
	}, []);

	const focusSection = useCallback(() => {
		sectionRef.current?.focus({ preventScroll: true });
	}, []);

	const handleSectionKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
		if (!inView) return;
		if (event.key === "ArrowRight") {
			event.preventDefault();
			pauseAutoplay();
			goNext();
			scheduleAutoplayResume();
		}
		if (event.key === "ArrowLeft") {
			event.preventDefault();
			pauseAutoplay();
			goPrev();
			scheduleAutoplayResume();
		}
	};

	const finishDrag = useCallback(
		(offset: number) => {
			setIsDragging(false);
			setDragOffset(0);
			pointerId.current = null;

			if (offset < -SWIPE_THRESHOLD_PX) goNext();
			else if (offset > SWIPE_THRESHOLD_PX) goPrev();

			scheduleAutoplayResume();
		},
		[goNext, goPrev, scheduleAutoplayResume],
	);

	const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
		if (event.pointerType === "mouse" && event.button !== 0) return;
		pauseAutoplay();
		pointerStartX.current = event.clientX;
		pointerId.current = event.pointerId;
		setIsDragging(true);
		event.currentTarget.setPointerCapture(event.pointerId);
	};

	const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
		if (pointerId.current !== event.pointerId) return;
		setDragOffset(event.clientX - pointerStartX.current);
	};

	const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
		if (pointerId.current !== event.pointerId) return;
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
		finishDrag(event.clientX - pointerStartX.current);
	};

	const onPointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
		if (pointerId.current !== event.pointerId) return;
		finishDrag(0);
	};

	useEffect(() => {
		const node = sectionRef.current;
		if (!node) return;

		const observer = new IntersectionObserver(
			([entry]) => setInView(entry?.isIntersecting ?? false),
			{ threshold: 0.2 },
		);
		observer.observe(node);
		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		if (!inView || paused || reducedMotion) return;

		const startTime = performance.now();
		let raf = 0;
		let advanceTimer = 0;

		const tick = (now: number) => {
			const elapsed = now - startTime;
			const t = Math.min(elapsed / AUTOPLAY_MS, 1);
			setSlideProgress(t);
			if (t < 1) {
				raf = requestAnimationFrame(tick);
			} else {
				setSlideProgress(1);
				advanceTimer = window.setTimeout(() => goNext(), 200);
			}
		};

		raf = requestAnimationFrame(tick);
		return () => {
			cancelAnimationFrame(raf);
			window.clearTimeout(advanceTimer);
		};
	}, [inView, paused, reducedMotion, index, goNext]);

	useEffect(() => {
		return () => {
			if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
		};
	}, []);

	const visualTransform = isDragging
		? `translate3d(${dragOffset}px, 0, 0)`
		: "translate3d(0, 0, 0)";

	return (
		<section
			id="funciones"
			ref={sectionRef}
			tabIndex={-1}
			onKeyDown={handleSectionKeyDown}
			className="v3-section-dark py-24 outline-none md:py-32"
			aria-roledescription="carrusel"
			aria-label="Funciones de Gcode"
		>
			<div className="v3-container">
				<SectionGlow
					className="left-1/2 top-[18%] h-[640px] w-[640px] -translate-x-1/2 lg:left-[28%]"
					intensity={0.26}
					drift={100}
				/>
				<h2 className="sr-only">Funciones de Gcode POS</h2>

				{/* Chips */}
				<div className="mb-10 flex w-full gap-1.5 sm:justify-center sm:gap-2 lg:mb-12 lg:w-auto lg:justify-start">
					{slides.map((item, i) => (
						<button
							key={item.id}
							type="button"
							onClick={() => {
								pauseAutoplay();
								goTo(i);
								focusSection();
								scheduleAutoplayResume();
							}}
							className={cn(
								"relative min-w-0 flex-1 overflow-hidden rounded-full border px-3 py-2.5 text-center text-xs font-medium leading-tight transition-colors duration-300 sm:flex-none sm:px-5 sm:text-sm",
								i === index
									? "border-white/25 text-white"
									: "border-white/[0.08] text-[#a1a1aa] hover:border-white/20 hover:text-[#f4f4f5]",
							)}
							aria-current={i === index ? "true" : undefined}
						>
							{/* El avance del carrusel vive dentro de la pestaña activa. */}
							{i === index ? (
								<span
									aria-hidden
									className="absolute inset-0 origin-left bg-white/[0.08]"
									style={{ transform: `scaleX(${barFillPercent(i, index, slideProgress, reducedMotion) / 100})` }}
								/>
							) : null}
							<span className="relative">{item.chip}</span>
						</button>
					))}
				</div>

				<div
					className={cn(
						"grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16 xl:gap-20",
					)}
				>
					{/* Visual */}
					<div
						className={cn(
							"touch-pan-y select-none",
							index % 2 === 1 && "lg:order-2",
						)}
						onPointerDown={onPointerDown}
						onPointerMove={onPointerMove}
						onPointerUp={onPointerUp}
						onPointerCancel={onPointerCancel}
						style={{
							transform: visualTransform,
							transition: isDragging ? "none" : "transform 0.35s ease-out",
						}}
					>
						<div
							className={cn(
								"relative mx-auto w-full max-w-[280px] lg:max-w-[320px] xl:max-w-[300px]",
								!reducedMotion && "lg:[perspective:1400px]",
							)}
						>
							<div
								className={cn(
									"grid transition-transform duration-500 ease-out [&>*]:col-start-1 [&>*]:row-start-1",
									!reducedMotion &&
										(index % 2 === 0
											? "lg:[transform:rotateY(12deg)]"
											: "lg:[transform:rotateY(-12deg)]"),
								)}
								style={
									!reducedMotion
										? { transformOrigin: "center center" }
										: undefined
								}
							>
							{slides.map((item, i) => (
								<div
									key={item.id}
									className={cn(
										"transition-opacity duration-500",
										i === index
											? "z-10 opacity-100"
											: "pointer-events-none opacity-0",
									)}
									aria-hidden={i !== index}
								>
									<PhoneFrame
										src={featureImages[item.imageKey].src}
										alt={featureImages[item.imageKey].alt}
										priority={i === 0}
										imageFit="cover"
										showSystemChrome={false}
										aspectRatio={item.aspectRatio}
										className="max-w-[280px] lg:max-w-[320px] xl:max-w-[300px]"
									/>
								</div>
							))}
							</div>
						</div>
					</div>

					{/* Copy */}
					<div
						className={cn(
							"flex flex-col gap-6 text-center lg:gap-8 lg:text-left",
							index % 2 === 1 && "lg:order-1",
						)}
						aria-live="polite"
					>
						<div key={slide.id} className="v3-fade-up">
							<h3 className="font-display text-[clamp(2.75rem,9vw,4.5rem)] leading-[0.92] text-[#f4f4f5]">
								{slide.accentWord}
								<br />
								{slide.rest}
							</h3>
							<p className="mx-auto mt-5 max-w-sm text-lg leading-relaxed text-[#a1a1aa] text-pretty lg:mx-0">
								{slide.description}
							</p>
						</div>

					</div>
				</div>
			</div>
		</section>
	);
}
