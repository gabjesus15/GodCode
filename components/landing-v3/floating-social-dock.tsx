"use client";

import { useEffect, useState } from "react";

import type { LandingSocialLink } from "@/lib/landing/contact";
import { cn } from "@/utils/cn";

import { LandingInstagramIcon, LandingWhatsAppIcon } from "./social-icons";

type FloatingSocialDockProps = {
	links: LandingSocialLink[];
};

function FloatingSocialButton({ link }: { link: LandingSocialLink }) {
	const isInstagram = link.kind === "instagram";

	return (
		<a
			href={link.href}
			target="_blank"
			rel="noopener noreferrer"
			aria-label={link.label}
			className={cn(
				"group relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-[rgba(244,244,245,0.12)] bg-[#1a1a1a] text-[#a1a1aa] transition-all duration-300",
				isInstagram
					? "hover:border-[#e1306c]/45 hover:bg-[#e1306c]/10 hover:text-[#f472b6]"
					: "hover:border-[#25d366]/45 hover:bg-[#25d366]/10 hover:text-[#4ade80]",
			)}
		>
			<span
				className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
				aria-hidden
				style={{
					background: isInstagram
						? "radial-gradient(circle at center, rgba(225,48,108,0.18) 0%, transparent 70%)"
						: "radial-gradient(circle at center, rgba(37,211,102,0.18) 0%, transparent 70%)",
				}}
			/>
			{isInstagram ? (
				<LandingInstagramIcon size={16} className="relative transition-transform duration-300 group-hover:scale-105" />
			) : (
				<LandingWhatsAppIcon size={16} className="relative transition-transform duration-300 group-hover:scale-105" />
			)}
		</a>
	);
}

export function FloatingSocialDock({ links }: FloatingSocialDockProps) {
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		const hero = document.querySelector("[data-landing-hero]");
		if (!hero) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				setVisible(!entry?.isIntersecting);
			},
			{ threshold: 0 },
		);

		observer.observe(hero);
		return () => observer.disconnect();
	}, []);

	if (links.length === 0) return null;

	return (
		<aside
			className={cn(
				"pointer-events-none fixed right-3 top-1/2 z-40 -translate-y-1/2 transition-all duration-500 ease-out md:right-4",
				visible ? "translate-x-0 opacity-100" : "translate-x-3 opacity-0",
			)}
			aria-label="Contacto rápido"
			aria-hidden={!visible}
		>
			<div
				className={cn(
					"relative overflow-hidden rounded-2xl border border-[rgba(244,244,245,0.12)] bg-[#141414]/95 p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md",
					visible ? "pointer-events-auto" : "pointer-events-none",
				)}
			>
				<div
					className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full bg-[#4f5bff]/15 blur-2xl"
					aria-hidden
				/>
				<div className="relative flex flex-col gap-1.5">
					{links.map((link) => (
						<FloatingSocialButton key={link.kind} link={link} />
					))}
				</div>
			</div>
		</aside>
	);
}
