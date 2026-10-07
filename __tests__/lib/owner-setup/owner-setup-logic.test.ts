import { describe, expect, it } from "vitest";

import { computeEffectiveTheme, initialBrandColor } from "@/lib/owner-setup/effective-theme";
import {
	describeDays,
	describeUniformHours,
	HOURS_PRESETS,
	sameUniformHours,
	uniformHours,
	weekFromUniform,
} from "@/lib/owner-setup/hours";
import { ownerSetupCompletion, ownerSetupStepDone } from "@/lib/owner-setup/progress";
import { nextOwnerSetupStep, OWNER_SETUP_STEP_META, OWNER_SETUP_STEPS, previousOwnerSetupStep } from "@/lib/owner-setup/steps";
import { applyMenuTemplate, findMenuTemplate, MENU_TEMPLATES } from "@/lib/store-theme/menu-templates";
import { normalizeStoreThemeConfig } from "@/lib/store-theme/theme-config";
import { emptyBusinessHoursWeek } from "@/lib/tenant/business-hours";

const baseTheme = normalizeStoreThemeConfig({ displayName: "Rica Pizza" });

describe("pasos del asistente", () => {
	it("cada paso tiene sus textos", () => {
		for (const step of OWNER_SETUP_STEPS) {
			expect(OWNER_SETUP_STEP_META[step].label).toBeTruthy();
			expect(OWNER_SETUP_STEP_META[step].title).toBeTruthy();
		}
	});

	it("avanza y retrocede en orden, sin salirse", () => {
		expect(nextOwnerSetupStep("marca")).toBe("diseno");
		expect(nextOwnerSetupStep("publicar")).toBeNull();
		expect(previousOwnerSetupStep("diseno")).toBe("marca");
		expect(previousOwnerSetupStep("marca")).toBeNull();
	});
});

describe("progreso", () => {
	const empty = { logoUrl: "", templateId: null, productCount: 0, whatsappUrl: null, address: "", published: false };

	it("sale de los datos reales", () => {
		expect(ownerSetupStepDone(empty)).toEqual({ marca: false, diseno: false, menu: false, local: false, publicar: false });
		expect(
			ownerSetupStepDone({ logoUrl: "logos/a.png", templateId: "sushi-night", productCount: 3, whatsappUrl: "https://wa.me/56912345678", address: "Av. Siempre Viva 742", published: true }),
		).toEqual({ marca: true, diseno: true, menu: true, local: true, publicar: true });
	});

	it("el local necesita WhatsApp válido y dirección", () => {
		expect(ownerSetupStepDone({ ...empty, whatsappUrl: "https://wa.me/1", address: "   " }).local).toBe(false);
		expect(ownerSetupStepDone({ ...empty, whatsappUrl: null, address: "Calle 1" }).local).toBe(false);
	});

	it("publicar no cuenta en el avance", () => {
		const done = { marca: true, diseno: true, menu: false, local: false, publicar: true };
		expect(ownerSetupCompletion(done)).toBe(0.5);
	});
});

describe("tema que se ve", () => {
	const template = MENU_TEMPLATES[0];

	it("aplica la plantilla elegida sin tocar nombre ni logo", () => {
		const theme = computeEffectiveTheme({ theme: { ...baseTheme, logoUrl: "logos/a.png" }, displayName: "  Pizza Nostra ", pickedTemplateId: template.id, brandColor: undefined });
		expect(theme.templateId).toBe(template.id);
		expect(theme.displayName).toBe("Pizza Nostra");
		expect(theme.logoUrl).toBe("logos/a.png");
		expect(theme.primaryColor).toBe(template.theme.primaryColor);
	});

	it("el color de la marca pisa el de la plantilla y se lee con texto blanco", () => {
		const theme = computeEffectiveTheme({ theme: baseTheme, displayName: "", pickedTemplateId: template.id, brandColor: "#ffd400" });
		expect(theme.primaryColor).not.toBe(template.theme.primaryColor);
		expect(theme.primaryColor).not.toBe("#ffd400");
		expect(theme.displayName).toBe("Rica Pizza");
	});

	it("«los del diseño» vuelve al color de la plantilla", () => {
		const branded = { ...applyMenuTemplate(baseTheme, template.id), primaryColor: "#123456" };
		const theme = computeEffectiveTheme({ theme: branded, displayName: "", pickedTemplateId: null, brandColor: null });
		expect(theme.primaryColor).toBe(template.theme.primaryColor);
	});

	it("recuerda un color de marca ya guardado", () => {
		const withTemplate = applyMenuTemplate(baseTheme, template.id);
		expect(initialBrandColor(withTemplate)).toBeUndefined();
		expect(initialBrandColor({ ...withTemplate, primaryColor: "#123456" })).toBe("#123456");
		expect(findMenuTemplate("no-existe")).toBeNull();
	});
});

describe("horario simple", () => {
	it("reconoce los mismos días con el mismo turno", () => {
		const week = weekFromUniform({ days: [1, 2, 3, 4, 5], interval: { open: "09:00", close: "18:00" } });
		expect(uniformHours(week)).toEqual({ days: [1, 2, 3, 4, 5], interval: { open: "09:00", close: "18:00" } });
		expect(week[6]).toEqual([]);
		expect(week[0]).toEqual([]);
	});

	it("con turnos distintos o dos turnos se edita por día", () => {
		const week = weekFromUniform({ days: [1, 2], interval: { open: "09:00", close: "18:00" } });
		week[2] = [{ open: "10:00", close: "18:00" }];
		expect(uniformHours(week)).toBeNull();
		const split = emptyBusinessHoursWeek();
		split[1] = [
			{ open: "12:00", close: "15:00" },
			{ open: "19:00", close: "23:00" },
		];
		expect(uniformHours(split)).toBeNull();
	});

	it("sin días abiertos vale como simple", () => {
		expect(uniformHours(emptyBusinessHoursWeek())?.days).toEqual([]);
	});

	it("los atajos se reconocen sin importar el orden de los días", () => {
		const preset = HOURS_PRESETS[2].hours;
		expect(sameUniformHours({ days: [...preset.days].reverse(), interval: { ...preset.interval } }, preset)).toBe(true);
		expect(sameUniformHours(null, preset)).toBe(false);
	});

	it("describe los días en palabras", () => {
		expect(describeDays([1, 2, 3, 4, 5, 6, 0])).toBe("Todos los días");
		expect(describeDays([5, 1, 2, 3, 4])).toBe("Lunes a viernes");
		expect(describeDays([1, 3, 5])).toBe("Lun, mié y vie");
		expect(describeDays([6, 0])).toBe("Sáb y dom");
		expect(describeDays([2])).toBe("Martes");
		expect(describeDays([])).toBe("");
		expect(describeUniformHours({ days: [1, 2, 3, 4, 5, 6], interval: { open: "09:00", close: "18:00" } })).toBe("Lunes a sábado, de 09:00 a 18:00");
		expect(describeUniformHours({ days: [], interval: { open: "09:00", close: "18:00" } })).toBeNull();
	});
});
