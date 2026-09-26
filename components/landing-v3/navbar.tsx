"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import { cn } from "@/utils/cn";

import { LandingBrandMark } from "./landing-brand-mark";

const navLinks = [
	{ label: "Cómo funciona", href: "#como-funciona" },
	{ label: "Precios", href: "#precios" },
	{ label: "Negocios", href: "/onboarding/negocios" },
	{ label: "Preguntas", href: "#faq" },
] as const;

/** Al superar este scroll la navbar pasa a vidrio oscuro con filete. */
const SCROLL_THRESHOLD = 32;

function scrollToHash(href: string) {
	const id = href.slice(1);
	const el = document.getElementById(id);
	if (!el) {
		// Fuera de la home (p. ej. la calculadora) la sección no existe: se va a la home con el ancla.
		window.location.assign(`/${href}`);
		return false;
	}
	el.scrollIntoView({ behavior: "smooth", block: "start" });
	window.history.pushState(null, "", href);
	return true;
}

export function Navbar() {
	const [open, setOpen] = useState(false);
	const [scrolled, setScrolled] = useState(false);

	useEffect(() => {
		const onScroll = () => {
			setScrolled(window.scrollY > SCROLL_THRESHOLD);
		};

		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	useEffect(() => {
		if (!open) return;

		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") setOpen(false);
		};

		window.addEventListener("keydown", onKeyDown);
		return () => {
			document.body.style.overflow = previousOverflow;
			window.removeEventListener("keydown", onKeyDown);
		};
	}, [open]);

	const solid = scrolled && !open;

	const onHashClick = (
		event: React.MouseEvent<HTMLAnchorElement>,
		href: string,
	) => {
		if (!href.startsWith("#")) return;
		event.preventDefault();
		setOpen(false);
		// Esperar a que el body deje de estar bloqueado antes de scrollear.
		requestAnimationFrame(() => {
			scrollToHash(href);
		});
	};

	return (
		<>
			<header
				className={cn(
					"fixed left-0 right-0 top-0 z-[70] transition-[background-color,box-shadow,border-color,backdrop-filter] duration-500 ease-out",
					solid
						? "border-b border-white/[0.08] bg-[#0d0d0d]/85 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.6)] backdrop-blur-xl"
						: "border-b border-transparent bg-transparent",
					open && "border-b border-white/[0.06] bg-[#080808]",
				)}
			>
				<nav className="v3-container relative flex h-20 items-center justify-between">
					<Link href="/" className="relative z-50 flex items-center" aria-label="Gcode">
						<LandingBrandMark variant="onDark" priority />
					</Link>

					{/* Centrado al viewport (no al hueco entre logo y CTA). */}
					<div className="pointer-events-none absolute inset-y-0 left-1/2 hidden -translate-x-1/2 items-center lg:flex">
						<div className="pointer-events-auto flex items-center gap-8 xl:gap-10">
							{navLinks.map((link) =>
								link.href.startsWith("#") ? (
									<a
										key={link.label}
										href={link.href}
										onClick={(event) => onHashClick(event, link.href)}
										className="whitespace-nowrap text-sm font-medium text-[#a1a1aa] transition-colors duration-200 hover:text-[#f4f4f5]"
									>
										{link.label}
									</a>
								) : (
									<Link
										key={link.label}
										href={link.href}
										className="whitespace-nowrap text-sm font-medium text-[#a1a1aa] transition-colors duration-200 hover:text-[#f4f4f5]"
									>
										{link.label}
									</Link>
								),
							)}
						</div>
					</div>

					<div className="relative z-50 flex items-center gap-2 sm:gap-4">
						<Link
							href="/login"
							className="hidden text-sm font-medium text-[#a1a1aa] transition-colors hover:text-[#f4f4f5] lg:inline-flex"
						>
							Iniciar sesión
						</Link>
						<Link
							href="/onboarding"
							className="hidden rounded-full bg-[#4f5bff] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#3d47e6] sm:inline-flex"
						>
							Crear mi tienda
						</Link>
						<button
							type="button"
							onClick={() => setOpen((prev) => !prev)}
							className={cn(
								"inline-flex h-11 w-11 items-center justify-center rounded-full text-[#f4f4f5] transition-colors hover:bg-white/[0.06] lg:hidden",
							)}
							aria-label={open ? "Cerrar menú" : "Abrir menú"}
							aria-expanded={open}
							aria-controls="landing-mobile-menu"
						>
							{open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
						</button>
					</div>
				</nav>
			</header>

			{/* Overlay fuera del header: backdrop-filter crea containing block y rompía el fixed inset-0 */}
			<div
				id="landing-mobile-menu"
				className={cn(
					"fixed inset-0 z-[60] lg:hidden",
					open ? "pointer-events-auto" : "pointer-events-none",
				)}
				aria-hidden={!open}
				{...(!open ? { inert: true } : {})}
			>
				<div
					className={cn(
						"absolute inset-0 bg-[#080808]/70 transition-opacity duration-300",
						open ? "opacity-100" : "opacity-0",
					)}
					onClick={() => setOpen(false)}
				/>

				<div
					className={cn(
						"absolute inset-y-0 right-0 flex w-full flex-col bg-[#080808] transition-[translate,opacity] duration-300 ease-in-out",
						open ? "translate-x-0 opacity-100" : "translate-x-full opacity-0",
					)}
					role="dialog"
					aria-modal={open}
					aria-label="Menú de navegación"
				>
					{/* Espacio para la barra fija */}
					<div className="h-20 shrink-0" aria-hidden />

					<nav className="v3-container flex flex-1 flex-col gap-6 overflow-y-auto overscroll-contain pb-10 pt-6">
						{navLinks.map((link) =>
							link.href.startsWith("#") ? (
								<a
									key={link.label}
									href={link.href}
									onClick={(event) => onHashClick(event, link.href)}
									className="font-display text-4xl tracking-wide text-[#f4f4f5] transition-colors hover:text-[#4f5bff] sm:text-5xl"
								>
									{link.label}
								</a>
							) : (
								<Link
									key={link.label}
									href={link.href}
									onClick={() => setOpen(false)}
									className="font-display text-4xl tracking-wide text-[#f4f4f5] transition-colors hover:text-[#4f5bff] sm:text-5xl"
								>
									{link.label}
								</Link>
							),
						)}
						<div className="mt-4 flex flex-col gap-3 sm:flex-row">
							<Link
								href="/onboarding"
								onClick={() => setOpen(false)}
								className="inline-flex justify-center rounded-full bg-[#4f5bff] px-8 py-4 text-sm font-semibold text-white transition-colors hover:bg-[#3d47e6]"
							>
								Crear mi tienda
							</Link>
							<Link
								href="/login"
								onClick={() => setOpen(false)}
								className="inline-flex justify-center rounded-full border border-white/15 px-8 py-4 text-sm font-semibold text-white transition-colors hover:border-white/40"
							>
								Iniciar sesión
							</Link>
						</div>
					</nav>
				</div>
			</div>
		</>
	);
}
