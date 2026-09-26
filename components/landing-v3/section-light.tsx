import type { CSSProperties } from "react";

import { cn } from "@/utils/cn";

type SectionGlowProps = {
	className?: string;
	/** Opacidad del azul en el centro del halo (0–1). */
	intensity?: number;
	/** Recorrido del parallax en px: el halo se mueve más lento que el contenido. */
	drift?: number;
};

/**
 * Halo de luz azul detrás de una sección. Sin blur (el degradado ya es suave),
 * así no cuesta nada al compositor. El parallax vive en CSS (`.v3-glow`).
 */
export function SectionGlow({ className, intensity = 0.16, drift = 80 }: SectionGlowProps) {
	return (
		<div
			aria-hidden
			className={cn("v3-glow", className)}
			style={{ "--glow-a": intensity, "--drift": `${drift}px` } as CSSProperties}
		/>
	);
}
