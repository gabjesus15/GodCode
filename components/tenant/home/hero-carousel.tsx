"use client";

import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TENANT_HERO_FALLBACK_IMAGE } from "@/lib/tenant/config/tenant-assets";
import { shouldUnoptimizeImageSrc } from "@/lib/tenant/images/should-unoptimize-image";

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
	shouldRenderImage,
}: {
	banner: HeroBanner;
	isActive: boolean;
	isFirst: boolean;
	shouldRenderImage: boolean;
}) {
	const rawUrl = banner.image_url?.trim() ?? "";
	const fallbackUrl = rawUrl || TENANT_HERO_FALLBACK_IMAGE;

	return (
		<div
			className={`hero-slide hero-slide--image-only${isActive ? " hero-slide--active" : ""}`}
		>
			<div className="hero-slide-media">
				{shouldRenderImage ? (
					<Image
						src={fallbackUrl}
						alt="Promoción"
						fill
						sizes="100vw"
						quality={80}
						priority={isFirst}
						loading={isFirst ? "eager" : "lazy"}
						unoptimized={shouldUnoptimizeImageSrc(fallbackUrl)}
						className="hero-slide-image"
						style={{ objectFit: "cover" }}
					/>
				) : null}
			</div>
		</div>
	);
}

export function HeroCarousel({
	banners,
	autoplayEnabled = true,
}: {
	banners: HeroBanner[];
	autoplayEnabled?: boolean;
}) {
	const safeBanners = banners?.length ? banners : [];
	const multi = safeBanners.length > 1;

	const [emblaRef, emblaApi] = useEmblaCarousel(
		{ loop: multi, align: "center", duration: 24 },
		multi && autoplayEnabled
			? [
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
							{safeBanners.map((banner, i) => {
								const shouldRenderImage = i === 0 || Math.abs(i - selectedIndex) <= 1;
								return (
									<div className="hero-carousel-slide" key={banner.id}>
										<HeroSlide
											banner={banner}
											isActive={i === selectedIndex}
											isFirst={i === 0}
											shouldRenderImage={shouldRenderImage}
										/>
									</div>
								);
							})}
						</div>
					</div>

					{multi && autoplayEnabled && <div className="hero-carousel-scrim" aria-hidden />}

					{multi && (
						<div className="hero-carousel-chrome">
							{autoplayEnabled ? (
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
							) : null}
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
