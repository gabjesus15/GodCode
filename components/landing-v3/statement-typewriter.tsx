"use client";

import { useEffect, useRef, useState } from "react";

import {
	LANDING_STATEMENT_ACCENT_START,
	LANDING_STATEMENT_TEXT,
} from "@/lib/landing/statement";

type StatementTypewriterProps = {
	className?: string;
};

type Phase = "idle" | "typing" | "done";

function renderStatementText(count: number) {
	const plain = LANDING_STATEMENT_TEXT.slice(0, Math.min(count, LANDING_STATEMENT_ACCENT_START));
	const accent = LANDING_STATEMENT_TEXT.slice(
		LANDING_STATEMENT_ACCENT_START,
		Math.min(count, LANDING_STATEMENT_TEXT.length),
	);

	return (
		<>
			{plain}
			{accent ? <span className="text-[#7c3aed]">{accent}</span> : null}
		</>
	);
}

function TypewriterCursor() {
	return (
		<span
			className="ml-0.5 inline-block w-[2px] motion-safe:animate-pulse bg-[#7c3aed] align-middle"
			style={{ height: "0.85em" }}
			aria-hidden
		/>
	);
}

export function StatementTypewriter({ className }: StatementTypewriterProps) {
	const [visibleCount, setVisibleCount] = useState(0);
	const [phase, setPhase] = useState<Phase>("idle");
	const rootRef = useRef<HTMLParagraphElement>(null);
	const playedRef = useRef(false);

	const staticPlain = LANDING_STATEMENT_TEXT.slice(0, LANDING_STATEMENT_ACCENT_START);
	const staticAccent = LANDING_STATEMENT_TEXT.slice(LANDING_STATEMENT_ACCENT_START);

	useEffect(() => {
		const node = rootRef.current;
		if (!node || playedRef.current) return;

		const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		if (prefersReduced) {
			playedRef.current = true;
			const timer = window.setTimeout(() => {
				setVisibleCount(LANDING_STATEMENT_TEXT.length);
				setPhase("done");
			}, 0);
			return () => window.clearTimeout(timer);
		}

		const observer = new IntersectionObserver(
			(entries) => {
				const entry = entries[0];
				if (!entry?.isIntersecting || playedRef.current) return;

				playedRef.current = true;
				setPhase("typing");
				setVisibleCount(0);
				observer.disconnect();
			},
			{ threshold: 0.35 },
		);

		observer.observe(node);
		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		if (phase !== "typing") return;

		if (visibleCount >= LANDING_STATEMENT_TEXT.length) {
			const timer = window.setTimeout(() => setPhase("done"), 0);
			return () => window.clearTimeout(timer);
		}

		const delay =
			visibleCount === 0 ? 280 : LANDING_STATEMENT_TEXT[visibleCount - 1] === " " ? 28 : 22;
		const timer = window.setTimeout(() => {
			setVisibleCount((count) => count + 1);
		}, delay);

		return () => window.clearTimeout(timer);
	}, [phase, visibleCount]);

	return (
		<p ref={rootRef} className={className} aria-label={LANDING_STATEMENT_TEXT}>
			{phase === "idle" ? (
				<span aria-hidden className="invisible">
					{staticPlain}
					<span className="text-[#7c3aed]">{staticAccent}</span>
				</span>
			) : (
				<span aria-live={phase === "typing" ? "polite" : undefined}>
					{renderStatementText(phase === "done" ? LANDING_STATEMENT_TEXT.length : visibleCount)}
					{phase === "typing" ? <TypewriterCursor /> : null}
				</span>
			)}
		</p>
	);
}
