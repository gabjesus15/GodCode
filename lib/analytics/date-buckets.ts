/** Día UTC `YYYY-MM-DD` a partir de un ISO timestamptz. */
export function utcDateKey(iso: string): string {
	const raw = String(iso ?? "").trim();
	if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
	const d = new Date(raw);
	if (Number.isNaN(d.getTime())) return "";
	return d.toISOString().slice(0, 10);
}

/** Lista inclusiva de días UTC desde `fromIso` hasta hoy (o `toIso`). */
export function eachUtcDayKeys(fromIso: string, toIso?: string): string[] {
	const start = utcDateKey(fromIso);
	const end = utcDateKey(toIso ?? new Date().toISOString());
	if (!start || !end || start > end) return start ? [start] : [];

	const days: string[] = [];
	let cur = start;
	while (cur <= end) {
		days.push(cur);
		const [y, m, d] = cur.split("-").map(Number);
		cur = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
		if (days.length > 800) break;
	}
	return days;
}
