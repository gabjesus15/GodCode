/**
 * Solo tipos y constantes del dashboard super-admin (sin Supabase).
 * Importable desde componentes cliente sin arrastrar service role.
 */
export type DashboardPeriod = "7" | "30" | "90" | "365" | "all";

export const DASHBOARD_PERIODS: { value: DashboardPeriod; label: string }[] = [
	{ value: "7", label: "7 días" },
	{ value: "30", label: "30 días" },
	{ value: "90", label: "90 días" },
	{ value: "365", label: "12 meses" },
	{ value: "all", label: "Todo" },
];

export function periodStartIso(period: DashboardPeriod): string | null {
	if (period === "all") return null;
	const days = Number(period);
	if (!Number.isFinite(days) || days <= 0) return null;
	const d = new Date();
	d.setUTCDate(d.getUTCDate() - days);
	d.setUTCHours(0, 0, 0, 0);
	return d.toISOString();
}

export function parseDashboardPeriod(raw: string | undefined): DashboardPeriod {
	const allowed = new Set(DASHBOARD_PERIODS.map((p) => p.value));
	if (raw && allowed.has(raw as DashboardPeriod)) return raw as DashboardPeriod;
	return "30";
}
