"use client";

import { useEffect, useRef, useState } from "react";

import { LANDING_SHOWCASE_TENANT } from "@/lib/landing/showcase";

const DURATION_MS = 1400;

function easeOutCubic(t: number): number {
	return 1 - (1 - t) ** 3;
}

/**
 * Métrica del caso Oishi: al entrar en viewport cuenta una sola vez de 0 al objetivo.
 * Respeta prefers-reduced-motion.
 */
export function BentoShowcaseMetric() {
	const { metricEnd, metricSuffix, metricLabel } = LANDING_SHOWCASE_TENANT;
	const nodeRef = useRef<HTMLDivElement>(null);
	const playedRef = useRef(false);
	const [value, setValue] = useState<number>(metricEnd);
	const [started, setStarted] = useState(false);

	useEffect(() => {
		const node = nodeRef.current;
		if (!node) return;

		const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		if (prefersReduced) {
			playedRef.current = true;
			setValue(metricEnd);
			return;
		}

		// Parte en 0 y espera a entrar en vista.
		setValue(0);

		const observer = new IntersectionObserver(
			(entries) => {
				const entry = entries[0];
				if (!entry?.isIntersecting || playedRef.current) return;
				playedRef.current = true;
				setStarted(true);
				observer.disconnect();
			},
			{ threshold: 0.45 },
		);

		observer.observe(node);
		return () => observer.disconnect();
	}, [metricEnd]);

	useEffect(() => {
		if (!started) return;

		const startTime = performance.now();
		let raf = 0;

		const tick = (now: number) => {
			const t = Math.min((now - startTime) / DURATION_MS, 1);
			setValue(Math.round(metricEnd * easeOutCubic(t)));
			if (t < 1) raf = requestAnimationFrame(tick);
		};

		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, [started, metricEnd]);

	return (
		<div
			ref={nodeRef}
			className="mt-5 rounded-xl border border-[rgba(244,244,245,0.08)] bg-[#0d0d0d]/50 px-4 py-3"
			aria-label={`${metricEnd}${metricSuffix} ${metricLabel}`}
		>
			<p className="font-display text-2xl leading-none text-[#4f5bff] tabular-nums">
				{value}
				{metricSuffix}
			</p>
			<p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-[#71717a]">
				{metricLabel}
			</p>
		</div>
	);
}
