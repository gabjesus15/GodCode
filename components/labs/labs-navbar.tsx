"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Menu, X } from "lucide-react";

import { LandingBrandMark } from "@/components/landing-v3/landing-brand-mark";
import { cn } from "@/utils/cn";

const SCROLL_THRESHOLD = 24;

export type LabsNavLink = { label: string; href: string };

type LabsNavbarProps = {
	links: LabsNavLink[];
	homeHref: string;
	ctaHref: string;
	ctaLabel: string;
	companyName: string;
	/** Enlace discreto al producto propio, para quien llega buscándolo (Instagram, boca a boca). */
	product?: LabsNavLink;
};

/**
 * Barra de la home corporativa: fondo claro, enlaces de sección y un solo CTA.
 * Sobre el hero oscuro va translúcida; al hacer scroll pasa a blanco sólido.
 */
export function LabsNavbar({ links, homeHref, ctaHref, ctaLabel, companyName, product }: LabsNavbarProps) {
	const [scrolled, setScrolled] = useState(false);
	const [open, setOpen] = useState(false);

	useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	useEffect(() => {
		if (!open) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") setOpen(false);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open]);

	const solid = scrolled || open;

	return (
		<header
			className={cn(
				"fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,border-color] duration-300",
				solid
					? "border-b border-black/[0.06] bg-white/95 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.12)] backdrop-blur"
					: "border-b border-white/[0.06] bg-[#080808]/30 backdrop-blur-md",
			)}
		>
			<nav className="mx-auto flex h-18 max-w-6xl items-center justify-between px-6" aria-label="Principal">
				<Link
					href={homeHref}
					aria-label={`Inicio de ${companyName}`}
					className="relative z-50 inline-flex items-center rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4f5bff]"
				>
					<LandingBrandMark variant={solid ? "onLight" : "onDark"} priority />
				</Link>

				<ul className="hidden items-center gap-8 lg:flex">
					{links.map((link) => (
						<li key={link.href}>
							<Link
								href={link.href}
								className={cn(
									"text-sm font-medium transition-colors",
									solid ? "text-[#3a3a3f] hover:text-[#1d1d1f]" : "text-[#d4d4d8] hover:text-white",
								)}
							>
								{link.label}
							</Link>
						</li>
					))}
				</ul>

				<div className="flex items-center gap-3 sm:gap-5">
					{product ? (
						<Link
							href={product.href}
							className={cn(
								"hidden items-center gap-1 text-sm font-medium transition-colors md:inline-flex",
								solid ? "text-[#71717a] hover:text-[#1d1d1f]" : "text-[#a1a1aa] hover:text-white",
							)}
						>
							{product.label}
							<ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
						</Link>
					) : null}
					<Link
						href={ctaHref}
						className="hidden items-center gap-1.5 rounded-full bg-[#1d1d1f] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4f5bff] sm:inline-flex"
					>
						{ctaLabel}
						<ArrowRight className="h-3.5 w-3.5" aria-hidden />
					</Link>
					<button
						type="button"
						onClick={() => setOpen((value) => !value)}
						aria-expanded={open}
						aria-controls="labs-mobile-menu"
						aria-label={open ? "Cerrar menú" : "Abrir menú"}
						className={cn(
							"inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors lg:hidden",
							solid ? "border-black/10 text-[#1d1d1f]" : "border-white/20 text-white",
						)}
					>
						{open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
					</button>
				</div>
			</nav>

			{open ? (
				<div id="labs-mobile-menu" className="border-t border-black/[0.06] bg-white lg:hidden">
					<ul className="mx-auto flex max-w-6xl flex-col px-6 py-4">
						{links.map((link) => (
							<li key={link.href}>
								<Link
									href={link.href}
									onClick={() => setOpen(false)}
									className="block py-3 text-base font-medium text-[#1d1d1f]"
								>
									{link.label}
								</Link>
							</li>
						))}
						{product ? (
							<li className="mt-2 border-t border-black/[0.06] pt-2">
								<Link
									href={product.href}
									onClick={() => setOpen(false)}
									className="flex items-center justify-between py-3 text-base font-medium text-[#1d1d1f]"
								>
									<span>
										{product.label}
										<span className="ml-2 text-sm font-normal text-[#71717a]">para restaurantes</span>
									</span>
									<ArrowUpRight className="h-4 w-4 text-[#71717a]" aria-hidden />
								</Link>
							</li>
						) : null}
						<li className="pt-3">
							<Link
								href={ctaHref}
								onClick={() => setOpen(false)}
								className="inline-flex items-center gap-2 rounded-full bg-[#1d1d1f] px-5 py-3 text-sm font-semibold text-white"
							>
								{ctaLabel}
								<ArrowRight className="h-4 w-4" aria-hidden />
							</Link>
						</li>
					</ul>
				</div>
			) : null}
		</header>
	);
}
