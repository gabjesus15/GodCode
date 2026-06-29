"use client";

import React from "react";

export interface ActivityRing {
	label: string;
	value: string | number;
	percentage: number;
	color: string;
	backgroundColor: string;
}

interface ActivityRingsProps {
	rings: ActivityRing[];
	size?: number;
	strokeWidth?: number;
	gap?: number;
}

export function ActivityRings({
	rings,
	size = 180,
	strokeWidth = 12,
	gap = 4,
}: ActivityRingsProps) {
	const center = size / 2;
	const average = Math.round(rings.reduce((acc, r) => acc + r.percentage, 0) / rings.length);

	return (
		<div className="w-full min-w-0 max-w-full">
			<div className="flex w-full min-w-0 flex-col items-center gap-5">
				<div className="relative shrink-0" style={{ width: size, height: size }}>
					<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
						{rings.map((ring, idx) => {
							const radius = center - strokeWidth / 2 - idx * (strokeWidth + gap);
							const circumference = 2 * Math.PI * radius;
							const safePct = Math.max(0, Math.min(100, ring.percentage));
							const strokeDashoffset = circumference - (safePct / 100) * circumference;

							return (
								<g key={idx}>
									{safePct > 0 ? (
										<circle
											cx={center}
											cy={center}
											r={radius}
											fill="transparent"
											stroke={ring.backgroundColor}
											strokeWidth={strokeWidth}
										/>
									) : null}
									{safePct > 0 ? (
										<circle
											cx={center}
											cy={center}
											r={radius}
											fill="transparent"
											stroke={ring.color}
											strokeWidth={strokeWidth}
											strokeDasharray={circumference}
											strokeDashoffset={strokeDashoffset}
											strokeLinecap="round"
											className="transition-all duration-1000 ease-out"
										/>
									) : null}
								</g>
							);
						})}
					</svg>

					<div className="absolute inset-0 flex flex-col items-center justify-center text-center">
						<span className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50">{average}%</span>
						<span className="text-[10px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
							Promedio
						</span>
					</div>
				</div>

				<div className="flex w-full min-w-0 flex-col gap-3">
					{rings.map((ring, idx) => (
						<div key={idx} className="flex min-w-0 items-start gap-2.5">
							<span
								className="mt-0.5 h-3 w-3 shrink-0 rounded-full"
								style={{ backgroundColor: ring.color }}
							/>
							<div className="min-w-0 flex-1">
								<p className="text-[11px] font-semibold leading-snug text-zinc-500 dark:text-zinc-400">
									{ring.label}
								</p>
								<p className="mt-0.5 text-sm font-bold leading-snug text-zinc-800 dark:text-zinc-200">
									{ring.value}{" "}
									<span className="text-xs font-medium text-zinc-400">
										({Math.round(ring.percentage)}%)
									</span>
								</p>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
