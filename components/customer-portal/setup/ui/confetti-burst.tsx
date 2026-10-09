"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

/** Una sola ráfaga de papelitos al publicar. Con «reducir movimiento» no se dibuja. */
export function ConfettiBurst({ colors, pieces = 34 }: { colors: string[]; pieces?: number }) {
	const reduce = useReducedMotion();
	const bits = useMemo(
		() =>
			Array.from({ length: pieces }, (_, index) => {
				// Reparto fijo (sin Math.random) para que el render sea estable.
				const t = index / pieces;
				const angle = -Math.PI / 2 + (t - 0.5) * Math.PI * 1.25;
				const distance = 120 + ((index * 37) % 90);
				return {
					x: Math.cos(angle) * distance,
					y: Math.sin(angle) * distance,
					fall: 160 + ((index * 53) % 120),
					rotate: ((index * 97) % 540) - 270,
					delay: ((index * 13) % 10) / 100,
					color: colors[index % colors.length],
					round: index % 3 === 0,
					size: 6 + (index % 4) * 1.5,
				};
			}),
		[colors, pieces],
	);
	if (reduce) return null;
	return (
		<div className="pointer-events-none absolute left-1/2 top-8 z-10 h-0 w-0" aria-hidden>
			{bits.map((bit, index) => (
				<motion.span
					key={index}
					className="absolute block"
					style={{
						width: bit.size,
						height: bit.round ? bit.size : bit.size * 0.45,
						borderRadius: bit.round ? 999 : 2,
						background: bit.color,
					}}
					initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
					animate={{
						x: [0, bit.x, bit.x * 1.15],
						y: [0, bit.y, bit.y + bit.fall],
						opacity: [1, 1, 0],
						rotate: bit.rotate,
						scale: 1,
					}}
					transition={{ duration: 1.7, delay: bit.delay, ease: [0.16, 1, 0.3, 1], times: [0, 0.4, 1] }}
				/>
			))}
		</div>
	);
}
