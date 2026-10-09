import type { SupabaseClient } from "@supabase/supabase-js";

import { formatBusinessHoursSummary, hasAnyBusinessHours, resolveBusinessTimeZone, type BusinessHours } from "./business-hours";

/**
 * País de una sucursal para las rutas de /cuenta que guardan su horario o su tasa de
 * cambio: el de la sucursal o, si no lo tiene guardado, el del negocio. El negocio se
 * consulta una sola vez y solo si alguien lo pide.
 */
export function branchCountryResolver(
	client: SupabaseClient,
	input: { branchCountry: string | null | undefined; companyId: string },
): () => Promise<string | null> {
	let pending: Promise<string | null> | null = null;
	const load = async (): Promise<string | null> => {
		if (input.branchCountry) return input.branchCountry;
		const { data } = await client.from("companies").select("country").eq("id", input.companyId).maybeSingle();
		return ((data as { country?: string | null } | null)?.country ?? null) || null;
	};
	return () => (pending ??= load());
}

/**
 * El horario listo para guardar en `branches`. La zona la fija el servidor con el país del
 * local, no la del navegador de quien edita; con días, `schedule` pasa a ser el resumen que
 * ya muestran la portada y el carrito. Sin días queda `business_hours: null` (lo borra) y el
 * país ni se consulta.
 */
export async function branchBusinessHoursUpdate(
	hours: BusinessHours | null,
	resolveCountry: () => Promise<string | null>,
): Promise<{ business_hours: BusinessHours | null; schedule?: string }> {
	if (!hours || !hasAnyBusinessHours(hours)) return { business_hours: null };
	const withZone = { ...hours, timezone: resolveBusinessTimeZone(await resolveCountry()) };
	return { business_hours: withZone, schedule: formatBusinessHoursSummary(withZone.week) };
}
