/** Horas de SLA (primera respuesta y resolución) según la prioridad del ticket. */
export const TICKET_SLA_HOURS: Record<"low" | "medium" | "high" | "critical", { firstResponse: number; resolution: number }> = {
	low: { firstResponse: 24, resolution: 120 },
	medium: { firstResponse: 12, resolution: 48 },
	high: { firstResponse: 4, resolution: 24 },
	critical: { firstResponse: 2, resolution: 8 },
};

/** Suma horas a un instante ISO; si la fecha no es válida devuelve el texto tal cual. */
export function addHours(iso: string, hours: number): string {
	const base = new Date(iso);
	if (Number.isNaN(base.getTime())) return iso;
	return new Date(base.getTime() + hours * 60 * 60 * 1000).toISOString();
}
