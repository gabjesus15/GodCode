"use client";

import dynamic from "next/dynamic";

export const AnalyticsCountryMapLazy = dynamic(
	() =>
		import("./analytics-country-map").then((m) => m.AnalyticsCountryMap),
	{
		ssr: false,
		loading: () => (
			<div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
				Cargando mapa…
			</div>
		),
	},
);
