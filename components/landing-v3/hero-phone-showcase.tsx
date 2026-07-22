"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { PhoneFrame } from "./phone-frame";
import type { LandingV3PhoneSlide } from "@/lib/landing/v3-config";

const DEFAULT_PHONES: LandingV3PhoneSlide[] = [
	{
		src: "/oishi-sushi-bio.png",
		alt: "Página de enlaces de Oishi Sushi",
		label: "Página de enlaces",
		priority: false,
	},
	{
		src: "/la-parada-menu.png",
		alt: "Menú digital de La Parada en Gcode",
		label: "Menú digital",
		priority: true,
	},
];

type HeroPhoneShowcaseProps = {
	phones?: LandingV3PhoneSlide[];
};

const HERO_SCREEN_ASPECT = 390 / 858;

const SWIPE_THRESHOLD_PX = 48;
const AUTOPLAY_MS = 5500;

export function HeroPhoneShowcase({ phones = DEFAULT_PHONES }: HeroPhoneShowcaseProps) {
	const [active, setActive] = useState(0);
	const [paused, setPaused] = useState(false);
	const [dragOffset, setDragOffset] = useState(0);
	const [isDragging, setIsDragging] = useState(false);

	const pointerStartX = useRef(0);
	const pointerId = useRef<number | null>(null);
	const resumeTimer = useRef<number | null>(null);

	const goTo = useCallback((index: number) => {
		const next = ((index % phones.length) + phones.length) % phones.length;
		setActive(next);
	}, [phones.length]);

	const goNext = useCallback(() => goTo(active + 1), [active, goTo]);
	const goPrev = useCallback(() => goTo(active - 1), [active, goTo]);

	const pauseAutoplay = useCallback(() => {
		setPaused(true);
		if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
	}, []);

	const scheduleAutoplayResume = useCallback(() => {
		if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
		resumeTimer.current = window.setTimeout(() => setPaused(false), 4000);
	}, []);

	const finishDrag = useCallback(
		(offset: number) => {
			setIsDragging(false);
			setDragOffset(0);
			pointerId.current = null;

			if (offset < -SWIPE_THRESHOLD_PX) {
				goNext();
			} else if (offset > SWIPE_THRESHOLD_PX) {
				goPrev();
			}

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

		let delta = event.clientX - pointerStartX.current;

		if ((active === 0 && delta > 0) || (active === phones.length - 1 && delta < 0)) {
			delta *= 0.3;
		}

		setDragOffset(delta);
	};

	const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
		if (pointerId.current !== event.pointerId) return;

		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}

		let offset = event.clientX - pointerStartX.current;
		if ((active === 0 && offset > 0) || (active === phones.length - 1 && offset < 0)) {
			offset *= 0.3;
		}
		finishDrag(offset);
	};

	const onPointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
		if (pointerId.current !== event.pointerId) return;
		finishDrag(0);
	};

	useEffect(() => {
		if (paused) return;
		const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		if (prefersReduced) return;

		const timer = window.setInterval(() => {
			setActive((i) => (i + 1) % phones.length);
		}, AUTOPLAY_MS);
		return () => window.clearInterval(timer);
	}, [paused, phones.length]);

	useEffect(() => {
		return () => {
			if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
		};
	}, []);

	const trackTransform = `translate3d(calc(-${active * (100 / phones.length)}% + ${dragOffset}px), 0, 0)`;

	return (
		<>
			{/* Mobile: carrusel con swipe */}
			<div className="relative w-full max-w-[320px] sm:max-w-[340px] lg:hidden">
				<div
					className="touch-pan-y select-none overflow-hidden"
					onPointerDown={onPointerDown}
					onPointerMove={onPointerMove}
					onPointerUp={onPointerUp}
					onPointerCancel={onPointerCancel}
					role="region"
					aria-roledescription="carrusel"
					aria-label="Capturas de la app Gcode"
				>
					<div
						className="flex"
						style={{
							width: `${phones.length * 100}%`,
							transform: trackTransform,
							transition: isDragging ? "none" : "transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
						}}
					>
						{phones.map((phone) => (
							<div
								key={phone.src}
								className="flex shrink-0 justify-center px-1"
								style={{ width: `${100 / phones.length}%` }}
							>
								<div className="aspect-[9/17.5] w-[240px] max-w-[72vw] sm:w-[270px]">
							<PhoneFrame
								src={phone.src}
								alt={phone.alt}
								priority={phone.priority}
								imageFit="contain"
								showSystemChrome={false}
								aspectRatio={HERO_SCREEN_ASPECT}
							/>
								</div>
							</div>
						))}
					</div>
				</div>

				<div className="mt-4 flex flex-col items-center gap-2.5">
					<p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#a855f7]">
						{phones[active].label}
					</p>
					<div className="flex items-center gap-2">
						{phones.map((phone, index) => (
							<button
								key={phone.src}
								type="button"
								onClick={() => {
									pauseAutoplay();
									goTo(index);
									scheduleAutoplayResume();
								}}
								className={`h-1.5 rounded-full transition-all duration-300 ${
									index === active ? "w-6 bg-[#a855f7]" : "w-1.5 bg-white/25"
								}`}
								aria-label={`Ver ${phone.label}`}
								aria-current={index === active ? "true" : undefined}
							/>
						))}
					</div>
					<p className="text-[10px] tracking-wide text-[#52525b]">Deslizá para cambiar</p>
				</div>

				<a
					href="#funciones"
					className="mt-4 flex flex-col items-center gap-0.5 text-[#71717a] transition-colors hover:text-[#a1a1aa]"
					aria-label="Ver más abajo"
				>
					<span className="text-[10px] font-semibold uppercase tracking-[0.2em]">
						Descubrir más
					</span>
					<ChevronDown className="h-4 w-4 motion-safe:animate-bounce" />
				</a>
			</div>

			{/* Desktop: dos teléfonos con perspectiva */}
			<div className="relative hidden w-full max-w-[640px] items-end justify-center gap-5 lg:flex xl:max-w-[700px] xl:gap-7">
				<div
					className="w-[200px] shrink-0 xl:w-[220px]"
					style={{
						transform: "perspective(1200px) rotateY(12deg) rotateZ(-2deg) scale(0.9)",
						transformStyle: "preserve-3d",
					}}
				>
					<PhoneFrame
						src={phones[0].src}
						alt={phones[0].alt}
						className="opacity-90"
						imageFit="contain"
						showSystemChrome={false}
						aspectRatio={HERO_SCREEN_ASPECT}
					/>
				</div>

				<div
					className="relative z-10 w-[260px] shrink-0 xl:w-[300px]"
					style={{
						transform: "perspective(1200px) rotateY(-5deg) rotateZ(1deg)",
						transformStyle: "preserve-3d",
					}}
				>
					<PhoneFrame
						src={phones[1].src}
						alt={phones[1].alt}
						priority
						imageFit="contain"
						showSystemChrome={false}
						aspectRatio={HERO_SCREEN_ASPECT}
					/>
				</div>
			</div>
		</>
	);
}
