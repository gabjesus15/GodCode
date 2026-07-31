"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import { cn } from "@/utils/cn";

const navLinks = [
	{ label: "Funciones", href: "#funciones" },
	{ label: "Precios", href: "#precios" },
	{ label: "Sobre Gcode", href: "/sobre-godcode" },
	{ label: "Contacto", href: "#contacto" },
];

/** Al superar este scroll la navbar pasa a modo sólido blanco. */
const SCROLL_THRESHOLD = 32;

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
		document.body.style.overflow = open ? "hidden" : "";
		return () => {
			document.body.style.overflow = "";
		};
	}, [open]);

	const solid = scrolled;

	return (
		<header
			className={cn(
				"fixed left-0 right-0 top-0 z-50 transition-[background-color,box-shadow,border-color,backdrop-filter] duration-500 ease-out",
				solid
					? "border-b border-black/[0.06] bg-white shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08)]"
					: "border-b border-white/[0.06] bg-[#080808]/40 backdrop-blur-md"
			)}
		>
			<nav className="v3-container flex h-20 items-center justify-between">
				<Link href="/" className="relative z-50 flex items-center gap-2">
					<Image
						src="/gcode-logo.svg"
						alt="Gcode"
						width={36}
						height={36}
						className="h-9 w-9 rounded-lg"
					/>
					<span
						className={cn(
							"font-display text-2xl tracking-wide transition-colors duration-500",
							solid ? "text-[#0d0d0d]" : "text-[#f4f4f5]"
						)}
					>
						CODE
					</span>
				</Link>

				<div className="hidden items-center gap-10 md:flex">
					{navLinks.map((link) => (
						<Link
							key={link.label}
							href={link.href}
							className={cn(
								"text-sm font-medium tracking-wide transition-colors duration-500",
								solid
									? "text-[#52525b] hover:text-[#0d0d0d]"
									: "text-[#a1a1aa] hover:text-[#f4f4f5]"
							)}
						>
							{link.label}
						</Link>
					))}
				</div>

				<div className="flex items-center gap-4">
					<Link
						href="/login"
						className="hidden rounded-full bg-[#7c3aed] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#6d28d9] md:inline-flex"
					>
						Iniciar sesión
					</Link>
					<button
						type="button"
						onClick={() => setOpen(true)}
						className={cn(
							"relative z-50 inline-flex h-10 w-10 items-center justify-center transition-colors duration-500 md:hidden",
							solid ? "text-[#0d0d0d]" : "text-[#f4f4f5]"
						)}
						aria-label="Abrir menú"
					>
						<Menu className="h-6 w-6" />
					</button>
				</div>
			</nav>

			{/* Mobile menu */}
			<div
				className={cn(
					"fixed inset-0 z-40 transition-transform duration-300 ease-in-out md:hidden",
					solid ? "bg-white" : "bg-[#080808]",
					open ? "translate-x-0" : "translate-x-full"
				)}
			>
				<div className="v3-container flex h-20 items-center justify-end">
					<button
						type="button"
						onClick={() => setOpen(false)}
						className={cn(
							"inline-flex h-10 w-10 items-center justify-center transition-colors duration-500",
							solid ? "text-[#0d0d0d]" : "text-[#f4f4f5]"
						)}
						aria-label="Cerrar menú"
					>
						<X className="h-6 w-6" />
					</button>
				</div>
				<div className="v3-container flex flex-col gap-8 pt-12">
					{navLinks.map((link) => (
						<Link
							key={link.label}
							href={link.href}
							onClick={() => setOpen(false)}
							className={cn(
								"font-display text-5xl tracking-wide transition-colors duration-500",
								solid
									? "text-[#0d0d0d] hover:text-[#7c3aed]"
									: "text-[#f4f4f5] hover:text-[#7c3aed]"
							)}
						>
							{link.label}
						</Link>
					))}
					<Link
						href="/login"
						onClick={() => setOpen(false)}
						className="mt-6 inline-flex w-fit rounded-full bg-[#7c3aed] px-8 py-4 text-sm font-semibold text-white"
					>
						Iniciar sesión
					</Link>
				</div>
			</div>
		</header>
	);
}
