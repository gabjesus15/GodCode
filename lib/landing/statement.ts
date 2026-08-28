export const LANDING_STATEMENT_TEXT =
	"Gcode Pos convierte cada pedido en una relación directa entre tu restaurante y tu cliente — sin intermediarios ni comisiones.";

export const LANDING_STATEMENT_ACCENT_START = LANDING_STATEMENT_TEXT.indexOf("sin intermediarios");

export type LandingMetricConfig = {
	label: string;
	end: number;
	fill: number;
	decimals?: number;
	suffix?: string;
	useGrouping?: boolean;
};

export const LANDING_METRICS: LandingMetricConfig[] = [
	{ label: "Uptime", end: 99.9, fill: 99.9, decimals: 1, suffix: "%" },
	{ label: "Menús creados", end: 320, fill: 78, suffix: "+" },
	{ label: "Tenants activos", end: 1200, fill: 65, suffix: "+", useGrouping: true },
	{ label: "Pedidos procesados", end: 4.8, fill: 92, decimals: 1, suffix: "M" },
];

export function formatLandingMetricValue(value: number, metric: LandingMetricConfig): string {
	if (metric.decimals != null) {
		return `${value.toFixed(metric.decimals)}${metric.suffix ?? ""}`;
	}

	const rounded = Math.round(value);
	const formatted = metric.useGrouping
		? rounded.toLocaleString("es-CL")
		: String(rounded);
	return `${formatted}${metric.suffix ?? ""}`;
}
