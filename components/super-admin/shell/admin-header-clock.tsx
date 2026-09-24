"use client";

import { useSyncExternalStore } from "react";

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

// El minuto actual como "tienda externa": el servidor no pinta hora (la suya no es la del
// navegador y rompía la hidratación); el navegador la pinta y la actualiza cada 20 s.
function subscribe(onChange: () => void) {
	const id = window.setInterval(onChange, 20_000);
	return () => window.clearInterval(id);
}
const currentMinute = () => Math.floor(Date.now() / 60_000);
const noMinute = () => null;

export function AdminHeaderClock() {
	const minute = useSyncExternalStore(subscribe, currentMinute, noMinute);
	if (minute == null) return <div className="mr-1 hidden w-20 sm:mr-2 sm:block" aria-hidden />;

	const { time, dateShort, tz } = formatClockParts(new Date(minute * 60_000));

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
