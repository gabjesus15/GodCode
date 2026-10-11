"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Menu, X } from "lucide-react";

import { LandingBrandMark } from "@/components/landing-v3/landing-brand-mark";
import { cn } from "@/utils/cn";

const SCROLL_THRESHOLD = 24;

/** Flechas con un rebote corto al pasar (dentro de un `group`), igual que en la home. */
const ARROW_NUDGE = "transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:translate-x-1";
const ARROW_OUT = "transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5";

/** Cada fila del menú del teléfono baja y aparece un poco después que la anterior; al cerrar, todas a la vez. */
const menuItem = (open: boolean) =>
	cn("transition-[opacity,translate] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]", open ? "translate-y-0 opacity-100" : "-translate-y-1.5 opacity-0");
const menuDelay = (open: boolean, index: number) => ({ transitionDelay: open ? `${60 + index * 40}ms` : "0ms" });

export type LabsNavLink = { label: string; href: string };

type LabsNavbarProps = {
	links: LabsNavLink[];
	homeHref: string;
	ctaHref: string;
	ctaLabel: string;
	companyName: string;
	/** Enlace al producto propio, siempre visible: mucha gente llega desde Instagram buscándolo. */
	product?: LabsNavLink;
};

/**
 * Barra de la home corporativa: logo, los enlaces de sección en una píldora centrada y
 * un solo CTA. Sobre la página clara va transparente; al hacer scroll pasa a blanco con sombra.
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
				"fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow] duration-300",
				solid ? "bg-white/90 shadow-[0_4px_24px_-12px_rgba(20,8,90,0.2)] backdrop-blur" : "bg-transparent",
			)}
		>
			<nav className="mx-auto flex h-18 max-w-7xl items-center justify-between px-6" aria-label="Principal">
				<Link
					href={homeHref}
					aria-label={`Inicio de ${companyName}`}
					className="relative z-50 inline-flex items-center rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4f5bff]"
				>
					<LandingBrandMark variant="onLight" priority />
				</Link>

				<ul className="hidden items-center gap-0.5 rounded-full border border-black/[0.06] bg-[#f4f4f8] p-1 lg:flex">
					{links.map((link) => (
						<li key={link.href}>
							<Link
								href={link.href}
								className="block rounded-full px-4 py-2 text-sm font-medium text-[#3a3a44] transition-[background-color,color,box-shadow] hover:bg-white hover:text-[#15151a] hover:shadow-sm"
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
							className="group inline-flex items-center gap-1 rounded-full bg-[#eef0ff] px-3.5 py-2 text-sm font-semibold text-[#4f5bff] transition-[background-color,color,scale] duration-200 hover:bg-[#4f5bff] hover:text-white active:scale-95"
						>
							{product.label}
							<ArrowUpRight className={cn("h-3.5 w-3.5", ARROW_OUT)} aria-hidden />
						</Link>
					) : null}
					<Link
						href={ctaHref}
						className="group hidden items-center gap-1.5 rounded-full bg-[#15151a] px-5 py-2.5 text-sm font-semibold text-white transition-[background-color,scale] duration-200 hover:bg-[#4f5bff] active:scale-95 sm:inline-flex"
					>
						{ctaLabel}
						<ArrowRight className={cn("h-3.5 w-3.5", ARROW_NUDGE)} aria-hidden />
					</Link>
					<button
						type="button"
						onClick={() => setOpen((value) => !value)}
						aria-expanded={open}
						aria-controls="labs-mobile-menu"
						aria-label={open ? "Cerrar menú" : "Abrir menú"}
						className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-[#15151a] transition-[scale] duration-200 active:scale-90 lg:hidden"
					>
						{/* Las dos figuras están siempre: una gira y se encoge mientras la otra aparece. */}
						<Menu
							className={cn("absolute h-5 w-5 transition-[opacity,rotate,scale] duration-300", open ? "rotate-90 scale-50 opacity-0" : "opacity-100")}
							aria-hidden
						/>
						<X
							className={cn("absolute h-5 w-5 transition-[opacity,rotate,scale] duration-300", open ? "opacity-100" : "-rotate-90 scale-50 opacity-0")}
							aria-hidden
						/>
					</button>
				</div>
			</nav>

			{/* El menú del teléfono se despliega (filas de la grilla de 0fr a 1fr) y los enlaces entran escalonados.
			    Cerrado sigue en la página, pero `inert`: ni el teclado ni los lectores de pantalla llegan a él. */}
			<div
				id="labs-mobile-menu"
				inert={!open}
				className={cn(
					"grid rounded-b-[1.75rem] transition-[grid-template-rows,opacity,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:hidden",
					open ? "grid-rows-[1fr] opacity-100 shadow-[0_28px_50px_-30px_rgba(20,8,90,0.45)]" : "grid-rows-[0fr] opacity-0",
				)}
			>
				<div className="overflow-hidden rounded-b-[1.75rem]">
					<ul className="mx-auto flex max-w-7xl flex-col border-t border-black/[0.06] bg-white px-6 py-4">
						{links.map((link, index) => (
							<li key={link.href} className={menuItem(open)} style={menuDelay(open, index)}>
								<Link
									href={link.href}
									onClick={() => setOpen(false)}
									className="block py-3 text-base font-medium text-[#15151a] transition-colors hover:text-[#4f5bff]"
								>
									{link.label}
								</Link>
							</li>
						))}
						{product ? (
							<li className={cn("mt-2 border-t border-black/[0.06] pt-2", menuItem(open))} style={menuDelay(open, links.length)}>
								<Link
									href={product.href}
									onClick={() => setOpen(false)}
									className="group flex items-center justify-between py-3 text-base font-medium text-[#15151a]"
								>
									<span>
										{product.label}
										<span className="ml-2 text-sm font-normal text-[#6b6b76]">para restaurantes</span>
									</span>
									<ArrowUpRight className={cn("h-4 w-4 text-[#6b6b76]", ARROW_OUT)} aria-hidden />
								</Link>
							</li>
						) : null}
						<li className={cn("pt-3", menuItem(open))} style={menuDelay(open, links.length + 1)}>
							<Link
								href={ctaHref}
								onClick={() => setOpen(false)}
								className="group inline-flex items-center gap-2 rounded-full bg-[#15151a] px-5 py-3 text-sm font-semibold text-white transition-[background-color,scale] duration-200 hover:bg-[#4f5bff] active:scale-95"
							>
								{ctaLabel}
								<ArrowRight className={cn("h-4 w-4", ARROW_NUDGE)} aria-hidden />
							</Link>
						</li>
					</ul>
				</div>
			</div>
		</header>
	);
}
