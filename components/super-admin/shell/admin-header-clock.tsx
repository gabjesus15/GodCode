"use client";

import { useEffect, useState } from "react";

function formatClockParts(d: Date) {
	const time = d.toLocaleTimeString("es-CL", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});
	const dateShort = d
		.toLocaleDateString("es-CL", {
			weekday: "short",
			day: "numeric",
			month: "short",
		})
		.replace(/\.$/, "");
	const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
	return { time, dateShort, tz };
}

export function AdminHeaderClock() {
	const [, setTick] = useState(0);

	useEffect(() => {
		const id = setInterval(() => setTick((t) => t + 1), 60_000);
		return () => clearInterval(id);
	}, []);

	const { time, dateShort, tz } = formatClockParts(new Date());

	return (
		<div
			className="mr-1 hidden min-w-0 text-right sm:mr-2 sm:block"
			title={tz ? `Zona horaria: ${tz}` : undefined}
		>
			<p className="tabular-nums text-sm font-semibold leading-tight text-zinc-900 dark:text-zinc-100">{time}</p>
			<p className="mt-0.5 text-[11px] capitalize leading-tight text-zinc-500 dark:text-zinc-400 sm:text-xs">
				{dateShort}
			</p>
		</div>
	);
}
