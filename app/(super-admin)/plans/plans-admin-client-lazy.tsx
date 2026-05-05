"use client";

import dynamic from "next/dynamic";

export const PlansAdminClientLazy = dynamic(
	() => import("./PlansAdminClient").then((m) => m.PlansAdminClient),
	{
		ssr: false,
		loading: () => (
			<div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
				Cargando panel de planes…
			</div>
		),
	},
);
