"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Pause, Play } from "lucide-react";

import { trackEvent } from "@/lib/analytics/track-event";
import { LANDING_DEMO_VIDEOS as DEMOS, type DemoChapter } from "@/lib/landing/demo-videos";
import { cn } from "@/utils/cn";

import { SectionGlow } from "./section-light";

function chapterIndexAt(chapters: readonly DemoChapter[], t: number): number {
	let index = -1;
	chapters.forEach((c, i) => {
		if (t >= c.start) index = i;
	});
	return index;
}

type DemoVideosProps = {
	/** Menú de demostración (pedidos desactivados). Sin URL no se muestra el botón. */
	demoMenuUrl: string | null;
};

export function DemoVideos({ demoMenuUrl }: DemoVideosProps) {
	const [active, setActive] = useState(0);
	const [time, setTime] = useState(0);
	const [inView, setInView] = useState(false);
	/** El visitante pausó: no se reanuda solo al volver a la pantalla. */
	const [userPaused, setUserPaused] = useState(false);

	const sectionRef = useRef<HTMLElement>(null);
	const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
	const trackedRef = useRef(false);

	useEffect(() => {
		const query = window.matchMedia("(prefers-reduced-motion: reduce)");
		// Con movimiento reducido el video espera a que el visitante le dé play.
		const sync = () => {
			if (query.matches) setUserPaused(true);
		};
		sync();
		query.addEventListener("change", sync);
		return () => query.removeEventListener("change", sync);
	}, []);

	useEffect(() => {
		const node = sectionRef.current;
		if (!node) return;
		const observer = new IntersectionObserver(([entry]) => setInView(entry?.isIntersecting ?? false), {
			threshold: 0.35,
		});
		observer.observe(node);
		return () => observer.disconnect();
	}, []);

	const playing = inView && !userPaused;

	// Solo el video activo corre, y solo mientras se ve: no gasta datos ni batería fuera de pantalla.
	useEffect(() => {
		videoRefs.current.forEach((video, i) => {
			if (!video) return;
			if (i === active && playing) void video.play().catch(() => {});
			else video.pause();
		});
		if (inView && !trackedRef.current) {
			trackedRef.current = true;
			trackEvent("demo_view", { demo: DEMOS[active].id });
		}
	}, [active, playing, inView]);

	// Tiempo del video cuadro a cuadro (timeupdate va a saltos de ~250 ms y la barra se vería a tirones).
	useEffect(() => {
		if (!playing) return;
		let raf = 0;
		const tick = () => {
			const video = videoRefs.current[active];
			if (video) setTime(video.currentTime);
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, [active, playing]);

	const selectTab = useCallback((index: number) => {
		const video = videoRefs.current[index];
		if (video) video.currentTime = 0;
		setTime(0);
		setActive(index);
		trackEvent("demo_tab", { demo: DEMOS[index].id });
	}, []);

	const seekTo = (seconds: number) => {
		const video = videoRefs.current[active];
		if (!video) return;
		video.currentTime = seconds;
		setTime(seconds);
		setUserPaused(false);
		trackEvent("demo_chapter", { demo: DEMOS[active].id, at: Math.round(seconds) });
	};

	const demo = DEMOS[active];
	const current = chapterIndexAt(demo.chapters, time);
	const overall = Math.min(1, time / demo.end);

	return (
		<section ref={sectionRef} id="demo" className="v3-section-dark py-24 md:py-32">
			<SectionGlow
				className="left-1/2 top-[18%] h-[700px] w-[700px] -translate-x-1/2 lg:left-[64%]"
				intensity={0.24}
				drift={100}
			/>
			<div
				className={cn(
					"v3-container grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-x-20 lg:gap-y-10",
					"[grid-template-areas:'head'_'video'_'chapters'] lg:[grid-template-areas:'head_video'_'chapters_video']",
				)}
			>
				<div data-reveal className="[grid-area:head] lg:self-end">
					<h2 className="font-display text-5xl leading-[0.95] text-[#f4f4f5] md:text-6xl">Míralo funcionando</h2>
					<div className="mt-8 flex gap-2" role="tablist" aria-label="Demostraciones">
						{DEMOS.map((item, i) => (
							<button
								key={item.id}
								type="button"
								role="tab"
								aria-selected={i === active}
								aria-controls={`demo-video-${item.id}`}
								onClick={() => selectTab(i)}
								className={cn(
									"relative min-w-0 flex-1 overflow-hidden rounded-full border px-4 py-2.5 text-center text-sm font-medium transition-colors duration-300 sm:flex-none sm:px-5",
									i === active
										? "border-white/25 text-white"
										: "border-white/[0.08] text-[#a1a1aa] hover:border-white/20 hover:text-[#f4f4f5]",
								)}
							>
								{i === active ? (
									<span
										aria-hidden
										className="absolute inset-0 origin-left bg-white/[0.08]"
										style={{ transform: `scaleX(${overall})` }}
									/>
								) : null}
								<span className="relative">{item.tab}</span>
							</button>
						))}
					</div>
				</div>

				{/* Capítulos: se iluminan con el video y llevan a ese momento al tocarlos. */}
				<div data-reveal className="[grid-area:chapters] lg:self-start">
					<ol key={demo.id} className="v3-fade-up relative border-l border-white/[0.08]">
						{demo.chapters.map((chapter, i) => {
							const next = demo.chapters[i + 1]?.start ?? demo.end;
							const isCurrent = i === current;
							const done = i < current;
							const fill = isCurrent ? Math.min(1, Math.max(0, (time - chapter.start) / (next - chapter.start))) : done ? 1 : 0;
							return (
								<li key={chapter.title} className="relative">
									{/* Tramo del riel que se llena mientras dura el capítulo. */}
									<span aria-hidden className="absolute -left-px top-0 h-full w-px overflow-hidden">
										<span
											className="block h-full w-full origin-top bg-[#4f5bff]"
											style={{ transform: `scaleY(${fill})`, transition: isCurrent ? "none" : "transform .4s" }}
										/>
									</span>
									<button
										type="button"
										onClick={() => seekTo(chapter.start)}
										aria-current={isCurrent ? "step" : undefined}
										className="group block w-full py-4 pl-6 text-left"
									>
										<span
											className={cn(
												"flex items-baseline gap-3 text-lg font-medium transition-colors duration-300",
												isCurrent ? "text-white" : done ? "text-[#a1a1aa]" : "text-[#71717a] group-hover:text-[#d4d4d8]",
											)}
										>
											<span className="font-display text-base tabular-nums text-[#4f5bff]/80">0{i + 1}</span>
											{chapter.title}
										</span>
										<span
											className={cn(
												"grid transition-[grid-template-rows,opacity] duration-500 ease-out",
												isCurrent ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
											)}
										>
											<span className="overflow-hidden">
												<span className="block pt-1.5 text-[15px] leading-relaxed text-[#a1a1aa]">{chapter.text}</span>
											</span>
										</span>
									</button>
								</li>
							);
						})}
					</ol>

					{demoMenuUrl ? (
						<a
							href={demoMenuUrl}
							target="_blank"
							rel="noopener noreferrer"
							onClick={() => trackEvent("demo_menu_open", {})}
							className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-sm font-medium text-white transition-colors duration-200 hover:border-white/35 hover:bg-white/[0.04]"
						>
							Probar el menú de demostración
							<ArrowUpRight className="h-4 w-4" aria-hidden />
						</a>
					) : null}
				</div>

				<div data-reveal className="[grid-area:video] lg:self-center">
					<div className="relative mx-auto w-full max-w-[340px] md:max-w-[360px] lg:max-w-[330px] xl:max-w-[350px]">
						<div className="relative aspect-[9/16] overflow-hidden rounded-[2rem] bg-[#111113] shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_40px_100px_-40px_rgba(79,91,255,0.55),0_30px_60px_-30px_rgba(0,0,0,0.9)]">
							{DEMOS.map((item, i) => (
								<video
									key={item.id}
									id={`demo-video-${item.id}`}
									ref={(el) => {
										videoRefs.current[i] = el;
									}}
									src={item.src}
									poster={item.poster}
									muted
									playsInline
									preload={i === 0 ? "metadata" : "none"}
									aria-label={item.name}
									aria-hidden={i !== active}
									onEnded={() => selectTab((i + 1) % DEMOS.length)}
									className={cn(
										"absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
										i === active ? "opacity-100" : "pointer-events-none opacity-0",
									)}
								/>
							))}

							<div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/45 to-transparent" />
							<div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3">
								<span className="rounded-full bg-black/45 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-md">
									{demo.badge}
								</span>
								<button
									type="button"
									onClick={() => setUserPaused((p) => !p)}
									aria-label={playing ? "Pausar video" : "Reproducir video"}
									className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md transition-colors hover:bg-black/60"
								>
									{playing ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4 translate-x-px" aria-hidden />}
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
