import { describe, expect, it } from "vitest";

import {
	buildLocalPatch,
	initialLocalForm,
	instagramHandle,
	localFormAfterSave,
	whatsappExample,
} from "@/lib/owner-setup/local-form";
import type { OwnerSetupBranch } from "@/lib/owner-setup/types";
import { emptyBusinessHoursWeek } from "@/lib/tenant/business-hours";

const weekdays = (() => {
	const week = emptyBusinessHoursWeek();
	for (const day of [1, 2, 3, 4, 5] as const) week[day] = [{ open: "09:00", close: "18:00" }];
	return week;
})();

function branch(overrides: Partial<OwnerSetupBranch> = {}): OwnerSetupBranch {
	return {
		id: "b1",
		name: "Centro",
		whatsappUrl: "https://wa.me/56912345678",
		instagramUrl: "https://instagram.com/ricapizza",
		address: "Av. Siempre Viva 742",
		schedule: null,
		businessHours: null,
		...overrides,
	};
}

describe("formulario de «Tu local»", () => {
	it("se arma desde la sucursal como lo escribe el dueño", () => {
		const form = initialLocalForm({ branch: branch() });
		expect(form.whatsapp).toBe("+56912345678");
		expect(form.instagram).toBe("@ricapizza");
		expect(form.address).toBe("Av. Siempre Viva 742");
		expect(form.hoursStored).toBe(false);
		expect(form.legacyParsed).toBe(false);
	});

	it("propone días desde el texto de antes y avisa si no pudo", () => {
		expect(initialLocalForm({ branch: branch({ schedule: "Lun a Vie: 09:00 a 18:00" }) }).legacyParsed).toBe(true);
		const unparsed = initialLocalForm({ branch: branch({ schedule: "Abrimos en la tarde" }) });
		expect(unparsed.legacyParsed).toBe(false);
		expect(unparsed.legacySchedule).toBe("Abrimos en la tarde");
	});

	it("el ejemplo de WhatsApp sale del país con el criterio único de Venezuela", () => {
		expect(whatsappExample("VE")).toBe("+58 412 123 4567");
		expect(whatsappExample("República Bolivariana de Venezuela")).toBe("+58 412 123 4567");
		expect(whatsappExample("Chile")).toBe("+56 9 1234 5678");
		expect(whatsappExample(null)).toBe("+56 9 1234 5678");
	});

	it("lee el usuario de Instagram de un enlace", () => {
		expect(instagramHandle("https://www.instagram.com/la.parada_ok/")).toBe("@la.parada_ok");
		expect(instagramHandle(null)).toBe("");
	});
});

describe("qué se guarda del horario", () => {
	const base = { branchId: "b1", whatsappUrl: "https://wa.me/56912345678" };

	it("con días manda el horario completo", () => {
		const form = { ...initialLocalForm({ branch: branch() }), hoursWeek: weekdays, hoursEnabled: false };
		const patch = buildLocalPatch({ ...base, form, hoursTouched: true });
		expect(patch.business_hours).toEqual({ enabled: false, timezone: null, week: weekdays });
		expect(patch).not.toHaveProperty("schedule");
		expect(patch.instagram_url).toBe("https://instagram.com/ricapizza");
	});

	it("si el dueño quita todos los días, lo borra junto con el texto que muestra la tienda", () => {
		const stored = initialLocalForm({ branch: branch({ businessHours: { enabled: true, timezone: "America/Santiago", week: weekdays } }) });
		const patch = buildLocalPatch({ ...base, form: { ...stored, hoursWeek: emptyBusinessHoursWeek() }, hoursTouched: true });
		expect(patch.business_hours).toBeNull();
		expect(patch.schedule).toBe("");
	});

	it("borrar un horario que salió del texto viejo también borra ese texto", () => {
		const legacy = initialLocalForm({ branch: branch({ schedule: "Lun a Vie: 09:00 a 18:00" }) });
		const patch = buildLocalPatch({ ...base, form: { ...legacy, hoursWeek: emptyBusinessHoursWeek() }, hoursTouched: true });
		expect(patch.business_hours).toBeNull();
		expect(patch.schedule).toBe("");
	});

	it("no borra un texto viejo que no se pudo pasar a días", () => {
		const unparsed = initialLocalForm({ branch: branch({ schedule: "Abrimos en la tarde" }) });
		const patch = buildLocalPatch({ ...base, form: { ...unparsed, hoursEnabled: false }, hoursTouched: true });
		expect(patch.business_hours).toBeNull();
		expect(patch).not.toHaveProperty("schedule");
	});

	it("sin tocar el horario y sin días no manda nada del horario", () => {
		const patch = buildLocalPatch({ ...base, form: initialLocalForm({ branch: branch() }), hoursTouched: false });
		expect(patch).not.toHaveProperty("business_hours");
		expect(patch).not.toHaveProperty("schedule");
	});

	it("después de guardar, un segundo borrado parte de lo que quedó en la base", () => {
		const fresh = initialLocalForm({ branch: branch() });
		const saved = buildLocalPatch({ ...base, form: { ...fresh, hoursWeek: weekdays }, hoursTouched: true });
		const afterSave = localFormAfterSave({ ...fresh, hoursWeek: weekdays }, saved);
		expect(afterSave.hoursStored).toBe(true);

		const cleared = buildLocalPatch({ ...base, form: { ...afterSave, hoursWeek: emptyBusinessHoursWeek() }, hoursTouched: true });
		expect(cleared).toMatchObject({ business_hours: null, schedule: "" });
		expect(localFormAfterSave(afterSave, cleared)).toMatchObject({ hoursStored: false, legacySchedule: null, legacyParsed: false });
	});
});
