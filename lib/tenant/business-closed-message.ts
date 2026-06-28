const DAY_ALIASES: Array<{ day: number; keys: string[] }> = [
	{ day: 1, keys: ["lunes", "lun"] },
	{ day: 2, keys: ["martes", "mar"] },
	{ day: 3, keys: ["miercoles", "miércoles", "mie", "mié"] },
	{ day: 4, keys: ["jueves", "jue"] },
	{ day: 5, keys: ["viernes", "vie"] },
	{ day: 6, keys: ["sabado", "sábado", "sab", "sáb"] },
	{ day: 0, keys: ["domingo", "dom"] },
];

type ScheduleRule = {
	days: number[];
	openMinutes: number;
	closeMinutes: number;
};

function normalizeText(value: string): string {
	return value
		.normalize("NFD")
		.replace(/\p{M}/gu, "")
		.toLowerCase()
		.trim();
}

export function cleanBranchDisplayName(rawName: string | null | undefined): string {
	const value = String(rawName ?? "").trim();
	if (!value) return "Este local";
	return value.replace(/\s*(ABIERTO|CERRADO|OPEN|CLOSED)\s*$/i, "").trim() || "Este local";
}

function resolveDayToken(token: string): number | null {
	const normalized = normalizeText(token);
	for (const entry of DAY_ALIASES) {
		if (entry.keys.some((key) => normalized === key || normalized.startsWith(key))) {
			return entry.day;
		}
	}
	return null;
}

function expandDayRange(startDay: number, endDay: number): number[] {
	const days: number[] = [];
	let current = startDay;
	for (let guard = 0; guard < 7; guard += 1) {
		days.push(current);
		if (current === endDay) break;
		current = (current + 1) % 7;
	}
	return days;
}

function parseTimeToMinutes(raw: string): number | null {
	const match = raw.trim().match(/^(\d{1,2}):(\d{2})/);
	if (!match) return null;
	const hours = Number(match[1]);
	const minutes = Number(match[2]);
	if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
	if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
	return hours * 60 + minutes;
}

function parseDayList(segment: string): number[] {
	const normalized = normalizeText(segment);
	if (!normalized) return [];

	const rangeMatch = normalized.match(
		/^([a-záéíóúñ]+)\s*(?:-|a|hasta)\s*([a-záéíóúñ]+)$/i,
	);
	if (rangeMatch) {
		const start = resolveDayToken(rangeMatch[1]);
		const end = resolveDayToken(rangeMatch[2]);
		if (start != null && end != null) {
			return expandDayRange(start, end);
		}
	}

	const single = resolveDayToken(normalized);
	return single == null ? [] : [single];
}

export function parseScheduleRules(schedule: string | null | undefined): ScheduleRule[] {
	const raw = String(schedule ?? "").trim();
	if (!raw) return [];

	const rules: ScheduleRule[] = [];
	const lines = raw.split(/\n|;|\.(?=\s*[A-Za-zÁÉÍÓÚáéíóú])/).map((line) => line.trim()).filter(Boolean);

	for (const line of lines) {
		const timeMatch = line.match(/(\d{1,2}:\d{2})\s*(?:-|a|hasta)\s*(\d{1,2}:\d{2})/i);
		if (!timeMatch) continue;

		const openMinutes = parseTimeToMinutes(timeMatch[1]);
		const closeMinutes = parseTimeToMinutes(timeMatch[2]);
		if (openMinutes == null || closeMinutes == null) continue;

		const dayPart = line.slice(0, timeMatch.index).replace(/[:,\s]+$/g, "").trim();
		const days = parseDayList(dayPart);
		if (days.length === 0) {
			rules.push({
				days: [0, 1, 2, 3, 4, 5, 6],
				openMinutes,
				closeMinutes,
			});
			continue;
		}

		rules.push({ days, openMinutes, closeMinutes });
	}

	return rules;
}

function formatMinutesAsTime(minutes: number, locale: string): string {
	const hours = Math.floor(minutes / 60);
	const mins = minutes % 60;
	const date = new Date(2000, 0, 1, hours, mins, 0, 0);
	return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

function zonedParts(date: Date, timeZone: string) {
	const formatter = new Intl.DateTimeFormat("en-US", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
		weekday: "short",
	});
	const parts = formatter.formatToParts(date);
	const read = (type: Intl.DateTimeFormatPartTypes) =>
		Number(parts.find((part) => part.type === type)?.value ?? "0");
	return {
		year: read("year"),
		month: read("month"),
		day: read("day"),
		hour: read("hour"),
		minute: read("minute"),
		weekday: parts.find((part) => part.type === "weekday")?.value ?? "",
	};
}

function weekdayToNumber(weekday: string): number {
	const map: Record<string, number> = {
		Sun: 0,
		Mon: 1,
		Tue: 2,
		Wed: 3,
		Thu: 4,
		Fri: 5,
		Sat: 6,
	};
	return map[weekday.slice(0, 3)] ?? 0;
}

function makeZonedDate(
	year: number,
	month: number,
	day: number,
	minutes: number,
	timeZone: string,
): Date {
	const hours = Math.floor(minutes / 60);
	const mins = minutes % 60;
	const utcGuess = new Date(Date.UTC(year, month - 1, day, hours, mins, 0, 0));
	const parts = zonedParts(utcGuess, timeZone);
	const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
	const offset = asUtc - utcGuess.getTime();
	return new Date(utcGuess.getTime() - offset);
}

export function resolveNextOpeningLabel(params: {
	schedule?: string | null;
	now?: Date;
	timeZone?: string;
	locale?: string;
}): string | null {
	const rules = parseScheduleRules(params.schedule);
	if (rules.length === 0) return null;

	const now = params.now ?? new Date();
	const timeZone = params.timeZone ?? "America/Santiago";
	const locale = params.locale ?? "es-CL";
	const current = zonedParts(now, timeZone);
	const nowMinutes = current.hour * 60 + current.minute;
	const today = weekdayToNumber(current.weekday);

	let best: Date | null = null;

	for (let offset = 0; offset < 8; offset += 1) {
		const dayOffsetDate = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000);
		const dayParts = zonedParts(dayOffsetDate, timeZone);
		const dayNumber = weekdayToNumber(dayParts.weekday);

		for (const rule of rules) {
			if (!rule.days.includes(dayNumber)) continue;
			const openAt = makeZonedDate(
				dayParts.year,
				dayParts.month,
				dayParts.day,
				rule.openMinutes,
				timeZone,
			);
			if (openAt.getTime() <= now.getTime()) continue;
			if (!best || openAt.getTime() < best.getTime()) {
				best = openAt;
			}
		}

		if (best) break;

		if (offset === 0) {
			for (const rule of rules) {
				if (!rule.days.includes(today)) continue;
				if (nowMinutes < rule.openMinutes) {
					const openAt = makeZonedDate(
						current.year,
						current.month,
						current.day,
						rule.openMinutes,
						timeZone,
					);
					if (!best || openAt.getTime() < best.getTime()) {
						best = openAt;
					}
				}
			}
		}
	}

	if (!best) return null;

	const openParts = zonedParts(best, timeZone);
	const openTime = formatMinutesAsTime(openParts.hour * 60 + openParts.minute, locale);
	const todayParts = zonedParts(now, timeZone);
	const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
	const tomorrowParts = zonedParts(tomorrow, timeZone);

	if (
		openParts.year === todayParts.year &&
		openParts.month === todayParts.month &&
		openParts.day === todayParts.day
	) {
		return `hoy a las ${openTime}`;
	}

	if (
		openParts.year === tomorrowParts.year &&
		openParts.month === tomorrowParts.month &&
		openParts.day === tomorrowParts.day
	) {
		return `mañana a las ${openTime}`;
	}

	const dateLabel = best.toLocaleDateString(locale, {
		weekday: "long",
		day: "numeric",
		month: "long",
		timeZone,
	});
	return `${dateLabel} a las ${openTime}`;
}

export function buildBusinessClosedCustomerMessage(params: {
	businessName?: string | null;
	branchName?: string | null;
	schedule?: string | null;
	timeZone?: string;
	locale?: string;
}): string {
	const displayName = cleanBranchDisplayName(params.branchName ?? params.businessName ?? "Este negocio");
	const schedule = String(params.schedule ?? "").trim();
	const nextOpening = resolveNextOpeningLabel({
		schedule,
		timeZone: params.timeZone,
		locale: params.locale,
	});

	if (nextOpening) {
		return `${displayName} está cerrado. Vuelve a abrir ${nextOpening}.`;
	}

	if (schedule) {
		return `${displayName} está cerrado. Horario de atención: ${schedule}.`;
	}

	return `${displayName} está cerrado en este momento.`;
}
