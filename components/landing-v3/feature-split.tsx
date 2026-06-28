"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/utils/cn";

import { PhoneFrame } from "./phone-frame";

const AUTOPLAY_MS = 7000;
const SWIPE_THRESHOLD_PX = 48;

const slides = [
	{
		id: "pos",
		chip: "POS",
		accentWord: "Diseñado",
		rest: "para el servicio rápido",
		description:
			"Un punto de venta pensado para la velocidad. Toma pedidos, divide cuentas, gestiona modificadores y envía comandas a cocina en segundos, sin salir de la vista de mesas.",
		image: "/imagenes para landing/caja_mobil.jpg",
		imageAlt: "Vista previa del POS de Gcode",
		aspectRatio: 1220 / 2587,
	},
	{
		id: "menu",
		chip: "Menú digital",
		accentWord: "Menús",
		rest: "que venden solos",
		description:
			"Menús digitales con fotos, variantes, combos y acceso por QR. Tus clientes navegan, piden y pagan desde su celular mientras tú te quedas con el margen.",
		image: "/la-parada-menu.png",
		imageAlt: "Menú digital de La Parada en Gcode",
		aspectRatio: 390 / 858,
	},
	{
		id: "inventory",
		chip: "Inventario",
		accentWord: "Una",
		rest: "plataforma, todos los canales",
		description:
			"Unifica pedidos en sala, delivery, pickup y WhatsApp en un solo dashboard. Inventario en tiempo real, reportes y gestión multi-tenant incluidos.",
		image: "/imagenes para landing/iventario_mobil.jpg",
		imageAlt: "Gestión de inventario en Gcode",
		aspectRatio: 1220 / 2598,
	},
] as const;

export function FeatureSplit() {
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

	const [reducedMotion, setReducedMotion] = useState(false);

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
		setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
	}, []);

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

		const tick = (now: number) => {
			const elapsed = now - startTime;
			const t = Math.min(elapsed / AUTOPLAY_MS, 1);
			setSlideProgress(t);
			if (t >= 1) goNext();
			else raf = requestAnimationFrame(tick);
		};

		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
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
			className="v3-section-dark py-28 md:py-36 outline-none"
			aria-roledescription="carrusel"
			aria-label="Funciones de Gcode"
		>
			<div className="v3-container">
				<p className="v3-label mb-8 text-center lg:mb-10 lg:text-left">
					{"// "}FUNCIONES
				</p>

				{/* Chips */}
				<div className="mb-10 flex justify-center gap-2 overflow-x-auto pb-1 lg:mb-12 lg:justify-start">
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
								"shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors",
								i === index
									? "bg-[#7c3aed] text-white"
									: "border border-[rgba(244,244,245,0.2)] text-[#a1a1aa] hover:border-[#7c3aed] hover:text-[#f4f4f5]",
							)}
							aria-current={i === index ? "true" : undefined}
						>
							{item.chip}
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
										src={item.image}
										alt={item.imageAlt}
										priority={i === 0}
										imageFit="contain"
										showSystemChrome={false}
										aspectRatio={item.aspectRatio}
										className="max-w-[280px] lg:max-w-[320px] xl:max-w-[300px]"
									/>
								</div>
							))}
							</div>
						</div>
						<p className="mt-4 text-center text-[10px] tracking-wide text-[#52525b] lg:hidden">
							Deslizá para cambiar
						</p>
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
							<h2 className="font-display text-[clamp(2.5rem,8vw,4.5rem)] leading-[0.95] tracking-wide text-[#f4f4f5] lg:text-6xl xl:text-7xl">
								<span className="text-[#7c3aed]">{slide.accentWord}</span>
								<br />
								{slide.rest}
							</h2>
							<p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-[#a1a1aa] sm:text-lg lg:mx-0 lg:mt-6">
								{slide.description}
							</p>
						</div>

						<div className="mt-2 flex flex-col gap-5 border-t border-[rgba(244,244,245,0.12)] pt-6 lg:mt-4">
							{/* Progress bars — una por slide */}
							<div className="flex gap-2">
								{slides.map((item, i) => (
									<div
										key={item.id}
										className="h-1 flex-1 overflow-hidden rounded-full bg-[#1a1a1a]"
									>
										<div
											className="h-full bg-[#7c3aed] transition-[width] duration-100 linear"
											style={{
												width: reducedMotion
													? i <= index
														? "100%"
														: "0%"
													: i < index
														? "100%"
														: i === index
															? `${slideProgress * 100}%`
															: "0%",
											}}
										/>
									</div>
								))}
							</div>

							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3 sm:gap-4">
									<button
										type="button"
										onClick={() => {
											pauseAutoplay();
											goPrev();
											focusSection();
											scheduleAutoplayResume();
										}}
										className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(244,244,245,0.2)] text-[#f4f4f5] transition-colors hover:border-[#7c3aed] hover:text-[#7c3aed] sm:h-12 sm:w-12"
										aria-label="Función anterior"
									>
										<ChevronLeft className="h-5 w-5" />
									</button>
									<button
										type="button"
										onClick={() => {
											pauseAutoplay();
											goNext();
											focusSection();
											scheduleAutoplayResume();
										}}
										className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(244,244,245,0.2)] text-[#f4f4f5] transition-colors hover:border-[#7c3aed] hover:text-[#7c3aed] sm:h-12 sm:w-12"
										aria-label="Siguiente función"
									>
										<ChevronRight className="h-5 w-5" />
									</button>
								</div>
								<span className="font-display text-2xl text-[#f4f4f5] sm:text-3xl">
									0{index + 1}
									<span className="text-[#71717a]">/0{slides.length}</span>
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
