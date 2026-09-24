"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { type DashboardPeriod, DASHBOARD_PERIODS } from "@/lib/super-admin/super-admin-dashboard-shared";
import { cn } from "@/utils/cn";

export function HomePeriodSelect({ current }: { current: DashboardPeriod }) {
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const hrefFor = (p: DashboardPeriod) => {
		const next = new URLSearchParams(searchParams?.toString() ?? "");
		next.set("period", p);
		return `${pathname}?${next.toString()}`;
	};

	return (
		<nav aria-label="Periodo" className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
			{DASHBOARD_PERIODS.map(({ value, label }) => {
				const active = value === current;
				return (
					<Link
						key={value}
						href={hrefFor(value)}
						scroll={false}
						aria-current={active ? "page" : undefined}
						className={cn(
							"rounded-md px-2.5 py-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20",
							active
								? "bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
								: "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
						)}
					>
						{label}
					</Link>
				);
			})}
		</nav>
	);
}
