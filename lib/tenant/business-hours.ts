import { getCountryConfig } from "@/lib/geo/country-registry";

import { parseScheduleRules } from "./business-closed-message";

/**
 * Horario de atención de una sucursal (`branches.business_hours`).
 *
 * Con `enabled`, fuera de horario el menú deja de recibir pedidos aunque la caja siga
 * abierta: la caja no se toca (cerrarla sola descuadraría el turno). La base aplica la
 * misma regla en `create_order_transaction` con `branch_business_hours_open`; cualquier
 * cambio aquí va también allí.
 */

/** 0 = domingo, igual que `Date#getDay` y `extract(dow)` de Postgres. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Horas "HH:MM". Si `close` ≤ `open` el turno cruza la medianoche; iguales = 24 horas. */
export type BusinessHoursInterval = { open: string; close: string };

export type BusinessHoursWeek = Record<Weekday, BusinessHoursInterval[]>;

export type BusinessHours = {
	enabled: boolean;
	/** Zona IANA; la fija el servidor al guardar según el país de la sucursal. */
	timezone: string | null;
	week: BusinessHoursWeek;
};

export type BusinessHoursStatus =
	| { enforced: false }
	| { enforced: true; open: true }
	| {
			enforced: true;
			open: false;
			/** Próxima apertura; `dayOffset` 0 = hoy, 1 = mañana… */
			nextOpen: { dayOffset: number; weekday: Weekday; time: string } | null;
	  };

export const WEEKDAYS_FROM_MONDAY: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 0];
export const MAX_INTERVALS_PER_DAY = 2;
export const DEFAULT_BUSINESS_TIME_ZONE = "America/Santiago";

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const SHORT_DAY: Record<Weekday, string> = { 0: "Dom", 1: "Lun", 2: "Mar", 3: "Mié", 4: "Jue", 5: "Vie", 6: "Sáb" };
const WEEKDAY_BY_SHORT_EN: Record<string, Weekday> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function emptyBusinessHoursWeek(): BusinessHoursWeek {
	return { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
}

export function isValidHoursTime(value: unknown): value is string {
	return typeof value === "string" && TIME_RE.test(value);
}

function toMinutes(hhmm: string): number {
	return Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
}

function minutesToTime(minutes: number): string {
	const h = Math.floor(minutes / 60) % 24;
	const m = minutes % 60;
	return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Lee la columna tal como venga (objeto o texto JSON); `null` si no hay horario. */
export function normalizeBusinessHours(input: unknown): BusinessHours | null {
	let raw = input;
	if (typeof raw === "string") {
		try {
			raw = JSON.parse(raw);
		} catch {
			return null;
		}
	}
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
	const record = raw as Record<string, unknown>;
	const weekRaw = record.week && typeof record.week === "object" ? (record.week as Record<string, unknown>) : {};
	const week = emptyBusinessHoursWeek();
	for (const day of WEEKDAYS_FROM_MONDAY) {
		const list = weekRaw[String(day)];
		if (!Array.isArray(list)) continue;
		week[day] = list
			.map((item) => {
				const entry = (item ?? {}) as Record<string, unknown>;
				return isValidHoursTime(entry.open) && isValidHoursTime(entry.close)
					? { open: entry.open, close: entry.close }
					: null;
			})
			.filter((item): item is BusinessHoursInterval => item !== null)
			.slice(0, MAX_INTERVALS_PER_DAY);
	}
	const timezone = typeof record.timezone === "string" && record.timezone.trim() ? record.timezone.trim() : null;
	return { enabled: record.enabled === true, timezone, week };
}

export function hasAnyBusinessHours(hours: BusinessHours | null | undefined): boolean {
	return Boolean(hours) && WEEKDAYS_FROM_MONDAY.some((day) => hours!.week[day].length > 0);
}

/** Zona del país de la sucursal (o del negocio) para quien todavía no la guardó. */
export function resolveBusinessTimeZone(country: string | null | undefined): string {
	return getCountryConfig(country)?.timezone ?? DEFAULT_BUSINESS_TIME_ZONE;
}

function zonedDayAndMinutes(now: Date, timeZone: string): { weekday: Weekday; minutes: number } {
	const read = (zone: string) => {
		const parts = new Intl.DateTimeFormat("en-US", {
			timeZone: zone,
			weekday: "short",
			hour: "2-digit",
			minute: "2-digit",
			hourCycle: "h23",
		}).formatToParts(now);
		const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
		return {
			weekday: WEEKDAY_BY_SHORT_EN[get("weekday").slice(0, 3)] ?? 0,
			minutes: (Number(get("hour")) % 24) * 60 + Number(get("minute")),
		};
	};
	try {
		return read(timeZone);
	} catch {
		// Zona inválida guardada a mano: mejor la de por defecto que romper el menú.
		return read(DEFAULT_BUSINESS_TIME_ZONE);
	}
}

function isOpenAt(week: BusinessHoursWeek, weekday: Weekday, minutes: number): boolean {
	for (const interval of week[weekday]) {
		const open = toMinutes(interval.open);
		const close = toMinutes(interval.close);
		if (open === close) return true;
		if (open < close ? minutes >= open && minutes < close : minutes >= open) return true;
	}
	// Turnos de ayer que pasan la medianoche (p. ej. 18:00 a 02:00).
	const previous = ((weekday + 6) % 7) as Weekday;
	for (const interval of week[previous]) {
		const open = toMinutes(interval.open);
		const close = toMinutes(interval.close);
		if (close < open && minutes < close) return true;
	}
	return false;
}

function findNextOpen(week: BusinessHoursWeek, weekday: Weekday, minutes: number) {
	for (let dayOffset = 0; dayOffset <= 7; dayOffset += 1) {
		const day = ((weekday + dayOffset) % 7) as Weekday;
		const opens = week[day]
			.map((interval) => toMinutes(interval.open))
			.filter((open) => dayOffset > 0 || open > minutes)
			.sort((a, b) => a - b);
		if (opens.length > 0) return { dayOffset, weekday: day, time: minutesToTime(opens[0]) };
	}
	return null;
}

/**
 * Si el menú puede recibir pedidos a esta hora según el horario. Sin horario activo, o
 * activo pero sin ningún día cargado (mal configurado), no bloquea nada.
 */
export function getBusinessHoursStatus(
	hours: BusinessHours | null | undefined,
	options: { now?: Date; fallbackTimeZone?: string } = {},
): BusinessHoursStatus {
	if (!hours?.enabled || !hasAnyBusinessHours(hours)) return { enforced: false };
	const timeZone = hours.timezone || options.fallbackTimeZone || DEFAULT_BUSINESS_TIME_ZONE;
	const { weekday, minutes } = zonedDayAndMinutes(options.now ?? new Date(), timeZone);
	if (isOpenAt(hours.week, weekday, minutes)) return { enforced: true, open: true };
	return { enforced: true, open: false, nextOpen: findNextOpen(hours.week, weekday, minutes) };
}

/** Sucursales con caja abierta que además están dentro de su horario. */
export function filterOpenBranchIdsByHours(
	openBranchIds: string[],
	branches: Array<{ id: string | number; business_hours?: unknown; country?: string | null }>,
	now = new Date(),
): string[] {
	const byId = new Map(branches.map((branch) => [String(branch.id), branch]));
	return openBranchIds.filter((id) => {
		const branch = byId.get(id);
		if (!branch) return true;
		const status = getBusinessHoursStatus(normalizeBusinessHours(branch.business_hours), {
			now,
			fallbackTimeZone: resolveBusinessTimeZone(branch.country),
		});
		return !status.enforced || status.open;
	});
}

function formatIntervals(intervals: BusinessHoursInterval[]): string {
	return intervals
		.map((interval) => (interval.open === interval.close ? "24 horas" : `${interval.open} a ${interval.close}`))
		.join(" y ");
}

/**
 * Texto para `branches.schedule` (lo que ya muestran la portada, el carrito y el
 * selector de sucursal): días seguidos con el mismo horario van juntos, una línea por
 * grupo, p. ej. "Lun a Vie: 09:00 a 19:00". Los días cerrados no salen.
 */
export function formatBusinessHoursSummary(week: BusinessHoursWeek): string {
	const lines: string[] = [];
	let start = 0;
	while (start < WEEKDAYS_FROM_MONDAY.length) {
		const day = WEEKDAYS_FROM_MONDAY[start];
		const label = formatIntervals(week[day]);
		let end = start;
		while (
			end + 1 < WEEKDAYS_FROM_MONDAY.length &&
			formatIntervals(week[WEEKDAYS_FROM_MONDAY[end + 1]]) === label
		) {
			end += 1;
		}
		if (label) {
			const first = SHORT_DAY[day];
			const last = SHORT_DAY[WEEKDAYS_FROM_MONDAY[end]];
			const days = end === start ? first : end === start + 1 ? `${first} y ${last}` : `${first} a ${last}`;
			lines.push(`${days}: ${label}`);
		}
		start = end + 1;
	}
	return lines.join("\n");
}

/** Arma la semana desde el texto libre de antes, para no empezar de cero al editar. */
export function businessHoursWeekFromScheduleText(text: string | null | undefined): BusinessHoursWeek {
	const week = emptyBusinessHoursWeek();
	for (const rule of parseScheduleRules(text)) {
		const interval = { open: minutesToTime(rule.openMinutes), close: minutesToTime(rule.closeMinutes) };
		for (const day of rule.days as Weekday[]) {
			if (week[day].length < MAX_INTERVALS_PER_DAY) week[day].push(interval);
		}
	}
	return week;
}
