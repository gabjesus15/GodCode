"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/utils/cn";

/** Al superar este scroll la navbar pasa a modo sólido blanco. */
const SCROLL_THRESHOLD = 32;

type AboutNavbarProps = {
	ctaLabel: string;
	homeAriaLabel: string;
};

export function AboutNavbar({ ctaLabel, homeAriaLabel }: AboutNavbarProps) {
	const [scrolled, setScrolled] = useState(false);

	useEffect(() => {
		const onScroll = () => {
			setScrolled(window.scrollY > SCROLL_THRESHOLD);
		};

		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	const solid = scrolled;

	return (
		<header
			className={cn(
				"fixed left-0 right-0 top-0 z-50 transition-[background-color,box-shadow,border-color,backdrop-filter] duration-500 ease-out",
				solid
					? "border-b border-black/[0.06] bg-white shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08)]"
					: "border-b border-white/[0.06] bg-[#080808]/40 backdrop-blur-md",
			)}
		>
			<nav className="mx-auto flex h-20 max-w-5xl items-center justify-between px-6">
				<Link
					href="/"
					aria-label={homeAriaLabel}
					title={homeAriaLabel}
					className="relative z-50 inline-flex items-center gap-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7c3aed]"
				>
					<Image
						src="/gcode-logo.svg"
						alt="Gcode"
						width={36}
						height={36}
						className="h-9 w-9 rounded-lg"
					/>
					<span
						className={cn(
							"text-2xl font-bold tracking-wide transition-colors duration-500",
							solid ? "text-[#0d0d0d]" : "text-[#f4f4f5]",
						)}
						style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
					>
						CODE
					</span>
				</Link>

				<Link
					href="/onboarding"
					className="inline-flex items-center gap-1.5 rounded-full bg-[#7c3aed] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#6d28d9]"
				>
					{ctaLabel}
					<ArrowRight className="h-3.5 w-3.5" aria-hidden />
				</Link>
			</nav>
		</header>
	);
}
