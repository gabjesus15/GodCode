import { getTenantMenuUrl } from "@/utils/tenant-url";

/** Caso público destacado en landing (Oishi Sushi). */
export const LANDING_SHOWCASE_TENANT = {
	slug: "oishisushi",
	name: "Oishi Sushi",
	location: "Chile",
	quote:
		"Dejamos de depender de las apps de delivery. Ahora el menú y los pedidos viven en nuestro canal, sin comisión por venta.",
	metricLabel: "Visitas semanales al menú",
	metricEnd: 450,
	metricSuffix: "+",
	metricValue: "450+",
	role: "Restaurante en Gcode",
} as const;

export function getLandingShowcaseMenuUrl(): string {
	return "https://oishisushi.shop";
}
