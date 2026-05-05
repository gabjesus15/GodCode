"use client";

import React, { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getCloudinaryOptimizedUrl } from "../utils/cloudinary";

const FALLBACK_IMAGE =
	"https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80";

/** Misma duración que la barra de progreso (CSS) */
const HERO_CAROUSEL_AUTOPLAY_MS = 4000;

export interface HeroBanner {
	id: string;
	image_url: string;
}

function HeroSlide({
	banner,
	isActive,
	isFirst,
}: {
	banner: HeroBanner;
	isActive: boolean;
	isFirst: boolean;
}) {
	const rawUrl = banner.image_url?.trim() ?? "";
	const isCloudinary = rawUrl.includes("res.cloudinary.com");
	const fallbackUrl = rawUrl || FALLBACK_IMAGE;

	// Loader personalizado para aprovechar srcset (resoluciones dinámicas)
	const cloudinaryLoader = ({ src, width }: { src: string; width: number }) => {
		return (
			getCloudinaryOptimizedUrl(src, {
				width,
				crop: "fill",
				gravity: "auto",
				quality: "auto",
			}) || src
		);
	};

	return (
		<div
			className={`hero-slide hero-slide--image-only${isActive ? " hero-slide--active" : ""}`}
		>
			<div className="hero-slide-media">
				{isCloudinary ? (
					<Image
						src={isCloudinary ? rawUrl : fallbackUrl}
						alt="Promoción"
						fill
						sizes="100vw"
						className="hero-slide-image"
						priority={isFirst}
						loader={isCloudinary ? cloudinaryLoader : undefined}
						unoptimized={!isCloudinary}
					/>
				) : (
					// eslint-disable-next-line @next/next/no-img-element -- rutas /public y dominios del tenant no están en images.remotePatterns
					<img
						src={fallbackUrl}
						alt="Promoción"
						className="hero-slide-image"
						loading={isFirst ? "eager" : "lazy"}
						fetchPriority={isFirst ? "high" : "auto"}
						decoding="async"
					/>
				)}
			</div>
		</div>
	);
}

export function HeroCarousel({ banners }: { banners: HeroBanner[] }) {
	const safeBanners = banners?.length ? banners : [];
	const multi = safeBanners.length > 1;

	const [emblaRef, emblaApi] = useEmblaCarousel(
		{ loop: multi, align: "center", duration: 24 },
		multi
			? [
					/* stopOnInteraction:false: el plugin registra mouseleave y pointerUp; con true el autoplay se quedaba parado tras hover o drag. */
					Autoplay({
						delay: HERO_CAROUSEL_AUTOPLAY_MS,
						stopOnInteraction: false,
						stopOnMouseEnter: true,
						stopOnFocusIn: false,
						playOnInit: true,
						rootNode: (emblaRoot) => emblaRoot.parentElement,
					}),
				]
			: []
	);

	const [selectedIndex, setSelectedIndex] = useState(0);

	useEffect(() => {
		if (!emblaApi) return;
		const onSelect = () => {
			requestAnimationFrame(() => {
				setSelectedIndex(emblaApi.selectedScrollSnap());
			});
		};
		emblaApi.on("select", onSelect);
		onSelect();
		return () => {
			emblaApi.off("select", onSelect);
		};
	}, [emblaApi]);

	const scrollTo = useCallback(
		(index: number) => emblaApi?.scrollTo(index),
		[emblaApi]
	);

	const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
	const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

	if (safeBanners.length === 0) return null;

	return (
		<section className="hero-carousel" aria-label="Promociones">
			<div className="hero-carousel-frame">
				<div className="hero-carousel-shell">
					{multi && (
						<>
							<button
								type="button"
								className="hero-carousel-arrow hero-carousel-arrow--prev"
								onClick={scrollPrev}
								aria-label="Anterior promoción"
							>
								<ChevronLeft size={22} strokeWidth={2.25} aria-hidden />
							</button>
							<button
								type="button"
								className="hero-carousel-arrow hero-carousel-arrow--next"
								onClick={scrollNext}
								aria-label="Siguiente promoción"
							>
								<ChevronRight size={22} strokeWidth={2.25} aria-hidden />
							</button>
						</>
					)}

					<div className="hero-carousel-viewport" ref={emblaRef}>
						<div className="hero-carousel-container">
							{safeBanners.map((banner, i) => (
								<div className="hero-carousel-slide" key={banner.id}>
									<HeroSlide banner={banner} isActive={i === selectedIndex} isFirst={i === 0} />
								</div>
							))}
						</div>
					</div>

					{multi && <div className="hero-carousel-scrim" aria-hidden />}

					{multi && (
						<div className="hero-carousel-chrome">
							<div
								className="hero-progress-track"
								role="presentation"
								aria-hidden
							>
								<div
									key={selectedIndex}
									className="hero-progress-fill"
									style={{
										animationDuration: `${HERO_CAROUSEL_AUTOPLAY_MS}ms`,
									}}
								/>
							</div>
							<div className="hero-dots">
								{safeBanners.map((_, i) => (
									<button
										key={i}
										type="button"
										className={`hero-dot ${i === selectedIndex ? "hero-dot--active" : ""}`}
										onClick={() => scrollTo(i)}
										aria-label={`Ir a promoción ${i + 1}`}
										aria-current={i === selectedIndex ? "true" : undefined}
									>
										<span className="hero-dot-pill" />
									</button>
								))}
							</div>
						</div>
					)}
				</div>
			</div>
		</section>
	);
}
