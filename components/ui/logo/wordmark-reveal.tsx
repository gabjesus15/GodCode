"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

import { cn } from "@/utils/cn";

const WORD = "code";

interface WordmarkRevealProps {
	ink: string;
	panelBg: string;
	markClassName?: string;
	wordSize?: string;
	/** C negra en claro, C blanca en oscuro. */
	markVariant?: "onDark" | "onLight";
}

const MARK = {
	onDark: "/gcode-mark-c-white.png",
	onLight: "/gcode-mark-c-black.png",
} as const;

/** Mark GC + typewriter "code". */
export function WordmarkReveal({
	ink,
	panelBg: _panelBg,
	markClassName = "h-24 w-auto shrink-0 sm:h-28",
	wordSize = "clamp(56px, 7.5vw, 80px)",
	markVariant = "onLight",
}: WordmarkRevealProps) {
	const [count, setCount] = useState(0);

	useEffect(() => {
		let t: ReturnType<typeof setTimeout>;
		let i = 0;
		let dir = 1;
		const tick = () => {
			i += dir;
			setCount(i);
			let delay: number;
			if (dir === 1 && i >= WORD.length) {
				dir = -1;
				delay = 1600;
			} else if (dir === -1 && i <= 0) {
				dir = 1;
				delay = 700;
			} else {
				delay = dir === 1 ? 135 : 75;
			}
			t = setTimeout(tick, delay);
		};
		t = setTimeout(tick, 900);
		return () => clearTimeout(t);
	}, []);

	return (
		<div className="flex items-center gap-2 sm:gap-3">
			<motion.span
				className={cn(
					"relative inline-block aspect-[792/612] shrink-0",
					markClassName,
				)}
				aria-label="Gcode mark"
				initial={{ opacity: 0, scale: 0.92 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 0.5, ease: "easeOut" }}
			>
				<Image
					src={MARK[markVariant]}
					alt=""
					aria-hidden
					width={792}
					height={612}
					className="h-full w-full object-contain"
					priority
				/>
			</motion.span>
			<span
				className="relative inline-flex items-center font-bold tracking-tight"
				style={{
					color: ink,
					fontFamily: "var(--font-space-grotesk), sans-serif",
					fontSize: wordSize,
					lineHeight: 1,
					minWidth: `calc(${wordSize} * 2.4)`,
				}}
				aria-label="code"
			>
				<span aria-hidden="true">{WORD.slice(0, count)}</span>
				<span
					aria-hidden="true"
					className="ml-[0.06em] inline-block w-[0.08em] animate-pulse self-stretch rounded-sm"
					style={{ backgroundColor: ink, minHeight: "0.85em" }}
				/>
			</span>
		</div>
	);
}
