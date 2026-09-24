import Link from "next/link";
import { Building2, ClipboardList, LifeBuoy, UserMinus, type LucideIcon } from "lucide-react";

import type { HomeKpi, HomeKpiKey } from "@/lib/super-admin/home-overview-types";
import { cn } from "@/utils/cn";

import { HomeSparkline } from "./home-sparkline";

const KPI_STYLE: Record<HomeKpiKey, { icon: LucideIcon; line: string }> = {
	active: { icon: Building2, line: "text-indigo-400" },
	churned: { icon: UserMinus, line: "text-rose-400" },
	applications: { icon: ClipboardList, line: "text-violet-400" },
	tickets: { icon: LifeBuoy, line: "text-sky-400" },
};

function DeltaChip({ delta, goodWhenUp }: { delta: number; goodWhenUp: boolean }) {
	const tone =
		delta === 0
			? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
			: (delta > 0) === goodWhenUp
				? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
				: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300";
	return (
		<span className={cn("inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums", tone)}>
			{delta > 0 ? `+${delta}` : delta}
		</span>
	);
}

export function HomeKpiCard({ kpi, periodLabel }: { kpi: HomeKpi; periodLabel: string }) {
	const { icon: Icon, line } = KPI_STYLE[kpi.key];
	return (
		<CardShell href={kpi.href}>
			<div className="flex min-w-0 items-center gap-2">
				<Icon className="h-4 w-4 shrink-0 text-zinc-400" strokeWidth={1.75} aria-hidden />
				<p className="truncate text-[13px] text-zinc-500 dark:text-zinc-400">{kpi.label}</p>
			</div>
			<div className="flex items-end justify-between gap-3">
				<div className="flex min-w-0 items-center gap-2">
					<p className="text-xl font-semibold tabular-nums leading-none tracking-tight text-zinc-950 dark:text-zinc-50">
						{kpi.value.toLocaleString("es-CL")}
					</p>
					<span title={`Cambio ${periodLabel}`}>
						<DeltaChip delta={kpi.delta} goodWhenUp={kpi.goodWhenUp} />
					</span>
				</div>
				<HomeSparkline values={kpi.series} className={line} />
			</div>
			<p className="truncate text-[11px] text-zinc-400 dark:text-zinc-500">{kpi.helper}</p>
		</CardShell>
	);
}

const CARD_CLASS = "flex min-w-0 flex-col gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900";

function CardShell({ href, children }: { href: string | null; children: React.ReactNode }) {
	if (!href) return <div className={CARD_CLASS}>{children}</div>;
	return (
		<Link
			href={href}
			className={`${CARD_CLASS} transition hover:border-zinc-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 dark:hover:border-zinc-700`}
		>
			{children}
		</Link>
	);
}
