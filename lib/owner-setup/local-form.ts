import type { OwnerSetupLocalPatch } from "./api";
import type { LocalForm, OwnerSetupInitial } from "./types";

import { isVenezuelaCountry } from "@/lib/geo/venezuela";
import { businessHoursWeekFromScheduleText, hasAnyBusinessHours, type BusinessHoursWeek } from "@/lib/tenant/business-hours";
import { socialInputToUrl } from "@/lib/tenant/home-page/home-page-config";
import { phoneFromWhatsappUrl } from "@/lib/tenant/whatsapp-url";

/**
 * El paso «Tu local» del asistente sin nada de React: cómo se arma el formulario desde la
 * sucursal y qué se manda a `branches/contact` al guardar. Vive aparte del hook para
 * poder probarlo y para que la página de publicar lea Instagram igual que el asistente.
 */

/** Ejemplo de WhatsApp según el país: el del campo y el del aviso de número incompleto. */
export function whatsappExample(country: string | null | undefined): string {
	return isVenezuelaCountry(country) ? "+58 412 123 4567" : "+56 9 1234 5678";
}

/** `https://instagram.com/tulocal` → `@tulocal`, como lo escribe el dueño. */
export function instagramHandle(url: string | null | undefined): string {
	const match = /instagram\.com\/([A-Za-z0-9._]+)/i.exec(url ?? "");
	return match ? `@${match[1]}` : (url ?? "");
}

export function hasHoursDays(week: BusinessHoursWeek): boolean {
	return Object.values(week).some((intervals) => intervals.length > 0);
}

export function initialLocalForm(initial: Pick<OwnerSetupInitial, "branch">): LocalForm {
	const branch = initial.branch;
	const stored = branch?.businessHours ?? null;
	const hasStored = hasAnyBusinessHours(stored);
	const legacyWeek = hasStored ? null : businessHoursWeekFromScheduleText(branch?.schedule);
	return {
		whatsapp: phoneFromWhatsappUrl(branch?.whatsappUrl),
		instagram: instagramHandle(branch?.instagramUrl ?? null),
		address: branch?.address ?? "",
		hoursWeek: hasStored ? stored!.week : legacyWeek!,
		hoursEnabled: hasStored ? stored!.enabled : true,
		hoursStored: hasStored,
		legacySchedule: branch?.schedule?.trim() || null,
		legacyParsed: legacyWeek != null && hasHoursDays(legacyWeek),
		timeZone: stored?.timezone ?? null,
	};
}

/**
 * Lo que se guarda del paso «Tu local». El horario con días va siempre (también el que se
 * propuso desde el texto de antes). Sin días va solo si el dueño tocó el horario, y como
 * `null`: antes no se mandaba nada y el horario borrado volvía a aparecer. Con él se borra
 * `schedule`, el texto que muestra la tienda, salvo un texto viejo que no se pudo pasar a
 * días: ese no lo borró el dueño y se conserva.
 */
export function buildLocalPatch(input: {
	branchId: string;
	form: LocalForm;
	/** El WhatsApp ya convertido en enlace; `null` si no hay número. */
	whatsappUrl: string | null;
	hoursTouched: boolean;
}): OwnerSetupLocalPatch {
	const { form } = input;
	const patch: OwnerSetupLocalPatch = {
		id: input.branchId,
		whatsapp_url: input.whatsappUrl ?? "",
		instagram_url: form.instagram.trim() ? socialInputToUrl("instagram", form.instagram) : "",
		address: form.address,
	};
	if (hasHoursDays(form.hoursWeek)) {
		patch.business_hours = { enabled: form.hoursEnabled, timezone: form.timeZone, week: form.hoursWeek };
	} else if (input.hoursTouched) {
		patch.business_hours = null;
		const unparsedText = Boolean(form.legacySchedule) && !form.legacyParsed && !form.hoursStored;
		if (!unparsedText) patch.schedule = "";
	}
	return patch;
}

/** El formulario después de guardar, para que un segundo guardado parta de lo que quedó en la base. */
export function localFormAfterSave(form: LocalForm, patch: OwnerSetupLocalPatch): LocalForm {
	if (patch.business_hours === undefined) return form;
	if (patch.business_hours) return { ...form, hoursStored: true };
	if (patch.schedule === "") return { ...form, hoursStored: false, legacySchedule: null, legacyParsed: false };
	return { ...form, hoursStored: false };
}
