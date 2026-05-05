"use client";
import dynamic from "next/dynamic";

const MetricCard = dynamic(() => import("../../../components/super-admin/analytics/metric-card").then(mod => mod.default), { ssr: false });

export function MetricCardClient({
	label,
	value,
	helper,
	href,
}: {
	label: string;
	value: string;
	helper: string;
	href?: string;
}) {
	return <MetricCard label={label} value={value} helper={helper} href={href} />;
}
