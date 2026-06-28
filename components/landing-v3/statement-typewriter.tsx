"use client";

import { useEffect, useRef, useState } from "react";

import {
	LANDING_STATEMENT_ACCENT_START,
	LANDING_STATEMENT_TEXT,
} from "@/lib/landing/statement";

type StatementTypewriterProps = {
	className?: string;
};

export function StatementTypewriter({ className }: StatementTypewriterProps) {
	const [visibleCount, setVisibleCount] = useState(LANDING_STATEMENT_TEXT.length);
	const [started, setStarted] = useState(false);
	const [done, setDone] = useState(true);
	const rootRef = useRef<HTMLParagraphElement>(null);
	const playedRef = useRef(false);

	useEffect(() => {
		const node = rootRef.current;
		if (!node || playedRef.current) return;

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
				setDone(false);
				setVisibleCount(0);
				observer.disconnect();
			},
			{ threshold: 0.35 },
		);

		observer.observe(node);
		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		if (!started || done) return;

		if (visibleCount >= LANDING_STATEMENT_TEXT.length) {
			setDone(true);
			return;
		}

		const delay =
			visibleCount === 0 ? 280 : LANDING_STATEMENT_TEXT[visibleCount - 1] === " " ? 28 : 22;
		const timer = window.setTimeout(() => {
			setVisibleCount((count) => count + 1);
		}, delay);

		return () => window.clearTimeout(timer);
	}, [started, visibleCount, done]);

	const plain = LANDING_STATEMENT_TEXT.slice(0, Math.min(visibleCount, LANDING_STATEMENT_ACCENT_START));
	const accent = LANDING_STATEMENT_TEXT.slice(
		LANDING_STATEMENT_ACCENT_START,
		Math.min(visibleCount, LANDING_STATEMENT_TEXT.length),
	);

	const staticPlain = LANDING_STATEMENT_TEXT.slice(0, LANDING_STATEMENT_ACCENT_START);
	const staticAccent = LANDING_STATEMENT_TEXT.slice(LANDING_STATEMENT_ACCENT_START);
	const showAnimationLayer = started && !done;

	return (
		<p
			ref={rootRef}
			className={`relative ${className ?? ""}`}
			aria-live={showAnimationLayer ? "polite" : undefined}
		>
			<span className={showAnimationLayer ? "sr-only" : undefined}>
				{staticPlain}
				<span className="text-[#7c3aed]">{staticAccent}</span>
			</span>

			{showAnimationLayer ? (
				<span className="absolute inset-0">
					{plain}
					{accent ? <span className="text-[#7c3aed]">{accent}</span> : null}
					<span
						className="ml-0.5 inline-block w-[2px] motion-safe:animate-pulse bg-[#7c3aed] align-middle"
						style={{ height: "0.85em" }}
						aria-hidden
					/>
				</span>
			) : null}
		</p>
	);
}
