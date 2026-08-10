import Image from "next/image";

import { cn } from "@/utils/cn";

type LandingBrandMarkProps = {
	/** onDark: C blanca (fondos oscuros). onLight: C negra (fondos claros). */
	variant?: "onDark" | "onLight";
	className?: string;
	priority?: boolean;
};

const MARK = {
	onDark: "/gcode-mark-c-white.png",
	onLight: "/gcode-mark-c-black.png",
} as const;

/** Mark GC — dos PNG según contraste del fondo. Altura vía className (`h-*`). */
export function LandingBrandMark({
	variant = "onDark",
	className,
	priority = false,
}: LandingBrandMarkProps) {
	return (
		<span
			className={cn(
				"relative inline-block aspect-[792/612] h-10 shrink-0",
				className,
			)}
		>
			<Image
				src={MARK.onDark}
				alt="Gcode"
				width={792}
				height={612}
				priority={priority}
				className={cn(
					"absolute inset-0 h-full w-full object-contain transition-opacity duration-500",
					variant === "onDark" ? "opacity-100" : "opacity-0",
				)}
			/>
			<Image
				src={MARK.onLight}
				alt=""
				aria-hidden
				width={792}
				height={612}
				priority={priority}
				className={cn(
					"absolute inset-0 h-full w-full object-contain transition-opacity duration-500",
					variant === "onLight" ? "opacity-100" : "opacity-0",
				)}
			/>
		</span>
	);
}
