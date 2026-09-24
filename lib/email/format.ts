import { getCountryConfig } from "@/lib/geo/country-registry";

/** Zona horaria con la que se cuentan los días y se escriben las fechas de un negocio. */
export const DEFAULT_EMAIL_TIME_ZONE = "America/Santiago";

export function timeZoneForCountry(country: string | null | undefined): string {
	return getCountryConfig(country)?.timezone ?? DEFAULT_EMAIL_TIME_ZONE;
}

/** «30 de septiembre de 2026», en la zona del negocio. */
export function formatEmailDate(iso: string | Date | null | undefined, timeZone = DEFAULT_EMAIL_TIME_ZONE): string {
	if (!iso) return "";
	const date = iso instanceof Date ? iso : new Date(iso);
	if (!Number.isFinite(date.getTime())) return "";
	try {
		return new Intl.DateTimeFormat("es", { dateStyle: "long", timeZone }).format(date);
	} catch {
		return new Intl.DateTimeFormat("es", { dateStyle: "long", timeZone: DEFAULT_EMAIL_TIME_ZONE }).format(date);
	}
}

/** Fecha de calendario (AAAA-MM-DD) de un instante en una zona horaria. */
export function calendarDay(date: Date, timeZone = DEFAULT_EMAIL_TIME_ZONE): string {
	try {
		return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
	} catch {
		return date.toISOString().slice(0, 10);
	}
}

/**
 * Días de calendario desde hoy hasta `target` en la zona del negocio: 0 = hoy, 1 = mañana,
 * negativo = ya pasó. Se cuentan días y no horas para que «vence mañana» sea verdad aunque
 * el cron corra de madrugada.
 */
export function calendarDaysUntil(target: string | Date, now: Date, timeZone = DEFAULT_EMAIL_TIME_ZONE): number {
	const targetDate = target instanceof Date ? target : new Date(target);
	const a = Date.parse(`${calendarDay(now, timeZone)}T00:00:00Z`);
	const b = Date.parse(`${calendarDay(targetDate, timeZone)}T00:00:00Z`);
	return Math.round((b - a) / 86_400_000);
}

export function plural(count: number, singular: string, pluralForm: string): string {
	return `${count} ${count === 1 ? singular : pluralForm}`;
}

/** «hoy», «mañana», «en 3 días». */
export function relativeDays(days: number): string {
	if (days <= 0) return "hoy";
	if (days === 1) return "mañana";
	return `en ${days} días`;
}
