import {
	emptyBusinessHoursWeek,
	WEEKDAYS_FROM_MONDAY,
	type BusinessHoursInterval,
	type BusinessHoursWeek,
	type Weekday,
} from "@/lib/tenant/business-hours";

/** El horario más común: los mismos días con el mismo turno. */
export type UniformHours = { days: Weekday[]; interval: BusinessHoursInterval };

export const DEFAULT_SETUP_INTERVAL: BusinessHoursInterval = { open: "12:00", close: "23:00" };

export type HoursPreset = { id: string; label: string; /** Para botones angostos. */ short: string; hours: UniformHours };

/** Atajos del asistente; el editor por día sigue disponible para todo lo demás. */
export const HOURS_PRESETS: readonly HoursPreset[] = [
	{ id: "todos", label: "Todos los días", short: "Lun a dom", hours: { days: [...WEEKDAYS_FROM_MONDAY], interval: { open: "12:00", close: "23:00" } } },
	{ id: "lun-sab", label: "Lunes a sábado", short: "Lun a sáb", hours: { days: [1, 2, 3, 4, 5, 6], interval: { open: "09:00", close: "18:00" } } },
	{ id: "noches", label: "Miércoles a domingo", short: "Mié a dom", hours: { days: [3, 4, 5, 6, 0], interval: { open: "19:00", close: "23:59" } } },
];

/**
 * El horario como «estos días, de tal a tal hora», o `null` si cada día es distinto o hay
 * días con dos turnos (entonces se edita día por día). Sin días abiertos vale como uniforme.
 */
export function uniformHours(week: BusinessHoursWeek): UniformHours | null {
	const days = WEEKDAYS_FROM_MONDAY.filter((day) => week[day].length > 0);
	if (days.length === 0) return { days: [], interval: { ...DEFAULT_SETUP_INTERVAL } };
	const first = week[days[0]];
	if (first.length !== 1) return null;
	const [interval] = first;
	const same = days.every((day) => week[day].length === 1 && week[day][0].open === interval.open && week[day][0].close === interval.close);
	return same ? { days, interval: { ...interval } } : null;
}

export function weekFromUniform(hours: UniformHours): BusinessHoursWeek {
	const week = emptyBusinessHoursWeek();
	for (const day of hours.days) week[day] = [{ ...hours.interval }];
	return week;
}

export function sameUniformHours(a: UniformHours | null, b: UniformHours): boolean {
	if (!a) return false;
	const days = (list: Weekday[]) => [...list].sort().join(",");
	return days(a.days) === days(b.days) && a.interval.open === b.interval.open && a.interval.close === b.interval.close;
}

const DAY_NAME: Record<Weekday, string> = { 1: "lunes", 2: "martes", 3: "miércoles", 4: "jueves", 5: "viernes", 6: "sábado", 0: "domingo" };
const DAY_SHORT: Record<Weekday, string> = { 1: "lun", 2: "mar", 3: "mié", 4: "jue", 5: "vie", 6: "sáb", 0: "dom" };
/** Letra de cada día para los botones redondos (X es miércoles, como en los calendarios). */
export const DAY_LETTER: Record<Weekday, string> = { 1: "L", 2: "M", 3: "X", 4: "J", 5: "V", 6: "S", 0: "D" };
export const DAY_LABEL: Record<Weekday, string> = { 1: "Lunes", 2: "Martes", 3: "Miércoles", 4: "Jueves", 5: "Viernes", 6: "Sábado", 0: "Domingo" };

/** «Todos los días», «Lunes a viernes» o «Lun, mié y vie». */
export function describeDays(days: readonly Weekday[]): string {
	const ordered = WEEKDAYS_FROM_MONDAY.filter((day) => days.includes(day));
	if (ordered.length === 0) return "";
	if (ordered.length === 7) return "Todos los días";
	const first = WEEKDAYS_FROM_MONDAY.indexOf(ordered[0]);
	const consecutive = ordered.every((day, index) => WEEKDAYS_FROM_MONDAY[first + index] === day);
	const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
	if (ordered.length === 1) return capital(DAY_NAME[ordered[0]]);
	if (consecutive && ordered.length >= 3) return `${capital(DAY_NAME[ordered[0]])} a ${DAY_NAME[ordered[ordered.length - 1]]}`;
	const names = ordered.map((day) => DAY_SHORT[day]);
	return capital(`${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`);
}

/** «Lunes a sábado, de 09:00 a 18:00», o `null` si el horario cambia según el día. */
export function describeUniformHours(hours: UniformHours | null): string | null {
	if (!hours || hours.days.length === 0) return null;
	return `${describeDays(hours.days)}, de ${hours.interval.open} a ${hours.interval.close}`;
}
