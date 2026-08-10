"use client";

import { LandingBrandMark } from "@/components/landing-v3/landing-brand-mark";

const MARK_CLASS = {
	sm: "h-7",
	md: "h-9",
	lg: "h-12",
} as const;

interface SaasLogoProps {
	size?: "sm" | "md" | "lg";
}

export function SaasLogo({ size = "md" }: SaasLogoProps) {
	return (
		<span className="inline-flex items-center" aria-label="Gcode">
			<LandingBrandMark
				variant="onLight"
				className={`shrink-0 ${MARK_CLASS[size]}`}
			/>
		</span>
	);
}
