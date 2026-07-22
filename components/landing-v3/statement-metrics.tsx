"use client";

import { useEffect, useRef, useState } from "react";

import {
	formatLandingMetricValue,
	LANDING_METRICS,
	type LandingMetricConfig,
} from "@/lib/landing/statement";

const DURATION_MS = 2000;

function easeOutCubic(t: number): number {
	return 1 - (1 - t) ** 3;
}

export function StatementMetrics() {
	const gridRef = useRef<HTMLDivElement>(null);
	const playedRef = useRef(false);
	const [progress, setProgress] = useState(1);
	const [started, setStarted] = useState(false);

	useEffect(() => {
		const node = gridRef.current;
		if (!node) return;

		const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		if (prefersReduced) {
			playedRef.current = true;
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				const entry = entries[0];
				if (!entry?.isIntersecting || playedRef.current) return;

				playedRef.current = true;
				setStarted(true);
				setProgress(0);
				observer.disconnect();
			},
			{ threshold: 0.25 },
		);

		observer.observe(node);
		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		if (!started) return;

		const startTime = performance.now();
		let raf = 0;

		const tick = (now: number) => {
			const elapsed = now - startTime;
			const t = Math.min(elapsed / DURATION_MS, 1);
			setProgress(easeOutCubic(t));
			if (t < 1) raf = requestAnimationFrame(tick);
		};

		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, [started]);

	return (
		<div
			ref={gridRef}
			className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
		>
			{LANDING_METRICS.map((metric) => (
				<MetricCard key={metric.label} metric={metric} progress={progress} />
			))}
		</div>
	);
}

function MetricCard({
	metric,
	progress,
}: {
	metric: LandingMetricConfig;
	progress: number;
}) {
	const currentValue = metric.end * progress;
	const barWidth = Math.min(metric.fill * progress, 100);

	return (
		<div className="flex flex-col gap-5 border-t border-[rgba(244,244,245,0.12)] pt-6">
			<div className="flex items-baseline gap-2">
				<span className="font-display text-5xl text-[#7c3aed] md:text-6xl">
					{formatLandingMetricValue(currentValue, metric)}
				</span>
				<span className="text-sm font-medium text-[#a1a1aa]">{metric.label}</span>
			</div>
			<div className="h-1.5 w-full overflow-hidden bg-[#1a1a1a]">
				<div className="h-full bg-[#7c3aed]" style={{ width: `${barWidth}%` }} />
			</div>
		</div>
	);
}
