"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { MapPin } from "lucide-react";
import { useTranslations } from "next-intl";

import { shouldUnoptimizeImageSrc } from "@/lib/tenant/images/should-unoptimize-image";
import type { BranchInfo } from "./menu-types";

/** "Rica Pizza" → "RP". */
function initials(name: string): string {
	return name
		.trim()
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((w) => w.charAt(0).toUpperCase())
		.join("");
}

/**
 * Portada del menú (headerStyle "cover"): foto ancha, logo grande que se
 * apoya en el borde y, debajo, el nombre con el estado del local. Va encima
 * del catálogo; la barra fija de arriba sigue igual para buscar y cambiar de
 * categoría.
 *
 * La foto es la imagen de fondo del tema o, sin ella, el primer banner. Sin
 * ninguna de las dos solo van el logo y el nombre, sin bloque de relleno.
 *
 * Mientras la portada se ve, la barra de arriba esconde su logo y nombre
 * (clase `cover-in-view` en `.page-wrapper`) para no mostrarlos dos veces;
 * al bajar, vuelven.
 */
export function MenuStoreCover({
	displayName,
	logoUrl,
	logoError,
	onLogoError,
	coverImageUrl,
	branch,
	isOpen,
}: {
	displayName: string;
	logoUrl: string | null | undefined;
	logoError: boolean;
	onLogoError: () => void;
	coverImageUrl: string | null;
	branch: BranchInfo | null;
	isOpen: boolean | null;
}) {
	const t = useTranslations("tenant.home.status");
	const place = [branch?.name, branch?.address].filter(Boolean).join(" · ");
	const sectionRef = useRef<HTMLElement>(null);

	useEffect(() => {
		const section = sectionRef.current;
		const page = section?.closest(".page-wrapper");
		if (!section || !page || typeof IntersectionObserver === "undefined") return;
		const observer = new IntersectionObserver(
			([entry]) => page.classList.toggle("cover-in-view", entry.isIntersecting),
			// Cuenta como fuera en cuanto el nombre pasa por debajo de la barra fija.
			{ rootMargin: "-120px 0px 0px 0px" },
		);
		observer.observe(section);
		return () => {
			observer.disconnect();
			page.classList.remove("cover-in-view");
		};
	}, []);

	return (
		<section ref={sectionRef} className={`store-cover${coverImageUrl ? "" : " store-cover--plain"}`} aria-label={displayName}>
			{/* Sin foto no se dibuja un bloque de color de relleno: el logo y el nombre
			    bastan, como en la ficha de un local en un mapa. */}
			{coverImageUrl ? (
				<div className="store-cover__media">
					<Image
						src={coverImageUrl}
						alt=""
						fill
						priority
						sizes="(max-width: 1200px) 100vw, 1200px"
						className="store-cover__img"
						unoptimized={shouldUnoptimizeImageSrc(coverImageUrl)}
					/>
				</div>
			) : null}
			<div className="store-cover__body">
				<div className="store-cover__logo">
					{logoUrl && !logoError ? (
						<Image src={logoUrl} alt="" width={88} height={88} onError={onLogoError} unoptimized />
					) : (
						<span className="store-cover__monogram" aria-hidden>
							{initials(displayName)}
						</span>
					)}
				</div>
				<div className="store-cover__info">
					<p className="store-cover__name">{displayName}</p>
					<div className="store-cover__meta">
						{isOpen !== null ? (
							<span className={`store-cover__status${isOpen ? " is-open" : ""}`}>
								<span className="store-cover__dot" aria-hidden />
								{isOpen ? t("open") : t("closed")}
							</span>
						) : null}
						{place ? (
							<span className="store-cover__place">
								<MapPin size={13} aria-hidden />
								<span>{place}</span>
							</span>
						) : null}
					</div>
				</div>
			</div>
		</section>
	);
}
