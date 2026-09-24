/**
 * Fechas del panel super admin. Con zona horaria fija: el servidor (UTC en producción) y el
 * navegador (Chile) formateaban distinto la misma fecha y React fallaba al hidratar.
 */
export const ADMIN_TIME_ZONE = "America/Santiago";

const dayFormatter = new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeZone: ADMIN_TIME_ZONE });
const dateTimeFormatter = new Intl.DateTimeFormat("es-CL", {
	day: "numeric",
	month: "short",
	hour: "2-digit",
	minute: "2-digit",
	timeZone: ADMIN_TIME_ZONE,
});

export function formatAdminDay(iso: string | null | undefined, empty = "—"): string {
	if (!iso) return empty;
	const date = new Date(iso);
	return Number.isNaN(date.getTime()) ? empty : dayFormatter.format(date);
}

export function formatAdminDateTime(iso: string | null | undefined, empty = "—"): string {
	if (!iso) return empty;
	const date = new Date(iso);
	return Number.isNaN(date.getTime()) ? empty : dateTimeFormatter.format(date);
}
