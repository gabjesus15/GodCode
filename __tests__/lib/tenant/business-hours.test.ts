import { describe, expect, it } from "vitest";

import {
	businessHoursWeekFromScheduleText,
	emptyBusinessHoursWeek,
	filterOpenBranchIdsByHours,
	formatBusinessHoursSummary,
	getBusinessHoursStatus,
	normalizeBusinessHours,
	type BusinessHours,
} from "@/lib/tenant/business-hours";

// Caracas es UTC-4 todo el año (sin horario de verano): fácil de razonar.
const TZ = "America/Caracas";
/** Fecha UTC para una hora local de Caracas. 2026-09-28 es lunes. */
const caracas = (day: number, hhmm: string) => {
	const [h, m] = hhmm.split(":").map(Number);
	return new Date(Date.UTC(2026, 8, 28 + day, h + 4, m));
};

function hours(week: Partial<BusinessHours["week"]>, enabled = true): BusinessHours {
	return { enabled, timezone: TZ, week: { ...emptyBusinessHoursWeek(), ...week } };
}

describe("getBusinessHoursStatus", () => {
	const weekdays = hours({
		1: [{ open: "09:00", close: "23:00" }],
		2: [{ open: "09:00", close: "23:00" }],
	});

	it("no bloquea sin horario, desactivado o sin días cargados", () => {
		expect(getBusinessHoursStatus(null)).toEqual({ enforced: false });
		expect(getBusinessHoursStatus(hours({ 1: [{ open: "09:00", close: "23:00" }] }, false))).toEqual({ enforced: false });
		expect(getBusinessHoursStatus(hours({}))).toEqual({ enforced: false });
	});

	it("abre a la hora de apertura y cierra justo a la hora de cierre", () => {
		expect(getBusinessHoursStatus(weekdays, { now: caracas(0, "08:59") })).toMatchObject({ open: false });
		expect(getBusinessHoursStatus(weekdays, { now: caracas(0, "09:00") })).toMatchObject({ open: true });
		expect(getBusinessHoursStatus(weekdays, { now: caracas(0, "22:59") })).toMatchObject({ open: true });
		expect(getBusinessHoursStatus(weekdays, { now: caracas(0, "23:00") })).toMatchObject({ open: false });
	});

	it("dice cuándo vuelve a abrir: hoy, mañana o días después", () => {
		expect(getBusinessHoursStatus(weekdays, { now: caracas(0, "07:00") })).toEqual({
			enforced: true,
			open: false,
			nextOpen: { dayOffset: 0, weekday: 1, time: "09:00" },
		});
		expect(getBusinessHoursStatus(weekdays, { now: caracas(0, "23:30") })).toMatchObject({
			nextOpen: { dayOffset: 1, weekday: 2, time: "09:00" },
		});
		// Martes de noche → el próximo es el lunes siguiente.
		expect(getBusinessHoursStatus(weekdays, { now: caracas(1, "23:30") })).toMatchObject({
			nextOpen: { dayOffset: 6, weekday: 1, time: "09:00" },
		});
	});

	it("un turno que pasa la medianoche sigue abierto de madrugada al día siguiente", () => {
		const night = hours({ 5: [{ open: "18:00", close: "02:00" }] }); // viernes
		expect(getBusinessHoursStatus(night, { now: caracas(4, "23:00") })).toMatchObject({ open: true });
		expect(getBusinessHoursStatus(night, { now: caracas(5, "01:59") })).toMatchObject({ open: true });
		expect(getBusinessHoursStatus(night, { now: caracas(5, "02:00") })).toMatchObject({ open: false });
	});

	it("dos turnos en el día: cerrado entre medio", () => {
		const split = hours({ 1: [{ open: "12:00", close: "15:00" }, { open: "19:00", close: "23:00" }] });
		expect(getBusinessHoursStatus(split, { now: caracas(0, "16:00") })).toMatchObject({
			open: false,
			nextOpen: { dayOffset: 0, time: "19:00" },
		});
		expect(getBusinessHoursStatus(split, { now: caracas(0, "20:00") })).toMatchObject({ open: true });
	});

	it("misma hora de apertura y cierre = 24 horas", () => {
		const allDay = hours({ 1: [{ open: "00:00", close: "00:00" }] });
		expect(getBusinessHoursStatus(allDay, { now: caracas(0, "03:00") })).toMatchObject({ open: true });
	});

	it("usa la zona de respaldo si la guardada no sirve", () => {
		const broken = { ...weekdays, timezone: "Nada/Inventado" };
		expect(() => getBusinessHoursStatus(broken, { now: caracas(0, "12:00") })).not.toThrow();
	});
});

describe("normalizeBusinessHours", () => {
	it("descarta horas inválidas y acepta JSON en texto", () => {
		const parsed = normalizeBusinessHours(
			JSON.stringify({ enabled: true, timezone: TZ, week: { 1: [{ open: "9:00", close: "18:00" }, { open: "10:00", close: "18:00" }] } }),
		);
		expect(parsed?.week[1]).toEqual([{ open: "10:00", close: "18:00" }]);
		expect(normalizeBusinessHours("no es json")).toBeNull();
		expect(normalizeBusinessHours(null)).toBeNull();
	});
});

describe("formatBusinessHoursSummary", () => {
	it("agrupa días seguidos con el mismo horario y omite los cerrados", () => {
		const range = { open: "09:00", close: "19:00" };
		const week = { ...emptyBusinessHoursWeek(), 1: [range], 2: [range], 3: [range], 4: [range], 5: [range], 6: [{ open: "10:00", close: "14:00" }] };
		expect(formatBusinessHoursSummary(week)).toBe("Lun a Vie: 09:00 a 19:00\nSáb: 10:00 a 14:00");
	});

	it("dos turnos y dos días seguidos", () => {
		const split = [{ open: "12:00", close: "15:00" }, { open: "19:00", close: "23:00" }];
		expect(formatBusinessHoursSummary({ ...emptyBusinessHoursWeek(), 6: split, 0: split })).toBe(
			"Sáb y Dom: 12:00 a 15:00 y 19:00 a 23:00",
		);
	});
});

describe("businessHoursWeekFromScheduleText", () => {
	it("convierte el texto libre de antes en días", () => {
		const week = businessHoursWeekFromScheduleText("Lunes a Viernes 09:00 a 19:00, Sábados 10:00 a 14:00");
		expect(week[1]).toEqual([{ open: "09:00", close: "19:00" }]);
		expect(week[5]).toEqual([{ open: "09:00", close: "19:00" }]);
		expect(week[6]).toEqual([{ open: "10:00", close: "14:00" }]);
		expect(week[0]).toEqual([]);
	});

	it("lee de vuelta el resumen que genera (listas y dos turnos)", () => {
		const split = [{ open: "12:00", close: "15:00" }, { open: "19:00", close: "23:00" }];
		const range = [{ open: "09:00", close: "19:00" }];
		const original = { ...emptyBusinessHoursWeek(), 1: range, 2: range, 3: range, 6: split, 0: split };
		expect(businessHoursWeekFromScheduleText(formatBusinessHoursSummary(original))).toEqual(original);
	});

	it("entiende 'de' antes de la hora", () => {
		const week = businessHoursWeekFromScheduleText("Lunes a Viernes de 09:00 a 19:00");
		expect(week[3]).toEqual([{ open: "09:00", close: "19:00" }]);
	});
});

describe("filterOpenBranchIdsByHours", () => {
	it("saca las sucursales con caja abierta pero fuera de horario", () => {
		const branches = [
			{ id: "a", business_hours: hours({ 1: [{ open: "09:00", close: "23:00" }] }) },
			{ id: "b", business_hours: null },
		];
		expect(filterOpenBranchIdsByHours(["a", "b"], branches, caracas(0, "23:30"))).toEqual(["b"]);
		expect(filterOpenBranchIdsByHours(["a", "b"], branches, caracas(0, "12:00"))).toEqual(["a", "b"]);
	});
});
