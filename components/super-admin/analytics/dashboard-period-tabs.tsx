"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import type { DashboardPeriod } from "@/lib/super-admin/super-admin-dashboard-shared";
import { DASHBOARD_PERIODS } from "@/lib/super-admin/super-admin-dashboard-shared";
import {
	adminSegmentedTabActive,
	adminSegmentedTabBase,
	adminSegmentedTabInactive,
} from "@/components/super-admin/shell/admin-tab-styles";

export function DashboardPeriodTabs({ current }: { current: DashboardPeriod }) {
	const searchParams = useSearchParams();

	function hrefFor(p: DashboardPeriod): string {
		const other = new URLSearchParams(searchParams?.toString() ?? "");
		other.set("period", p);
		return `/dashboard?${other.toString()}`;
	}

	return (
		<div className="flex flex-wrap gap-2">
			{DASHBOARD_PERIODS.map(({ value, label }) => (
				<Link
					key={value}
					href={hrefFor(value)}
					className={`${adminSegmentedTabBase} ${
						current === value ? adminSegmentedTabActive : adminSegmentedTabInactive
					}`}
				>
					{label}
				</Link>
			))}
		</div>
	);
}
