import "server-only";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";

/** @service-role super-admin — llamar solo después de `requireSuperAdminSession()`. */

export type CancellationRequest = {
	/** Lo que escribió el dueño; `null` si no dejó motivo. */
	reason: string | null;
	/** Cuándo la pidió (fecha del ticket). */
	requestedAt: string | null;
};

/**
 * Cuando el dueño cancela desde su Cuenta queda un ticket de sistema "Cancelación programada ·
 * <empresa>" con el motivo (ver `app/api/customer-account/cancel-subscription`). Devuelve la
 * solicitud más reciente por empresa; sin ticket, la empresa no aparece en el mapa.
 */
export async function fetchCancellationRequests(companyIds: string[]): Promise<Map<string, CancellationRequest>> {
	const out = new Map<string, CancellationRequest>();
	if (companyIds.length === 0) return out;

	const { data, error } = await supabaseAdmin
		.from("saas_tickets")
		.select("company_id,description,created_at")
		.in("company_id", companyIds)
		.eq("source", "system")
		.ilike("subject", "Cancelación programada%")
		.order("created_at", { ascending: false })
		.limit(companyIds.length * 3);
	if (error || !data) return out;

	for (const row of data as Array<{ company_id: string | null; description: string | null; created_at: string | null }>) {
		if (!row.company_id || out.has(row.company_id)) continue;
		out.set(row.company_id, { reason: parseCancellationReason(row.description), requestedAt: row.created_at });
	}
	return out;
}

/** "Motivo: …" del ticket; `null` si no lo indicó. */
export function parseCancellationReason(description: string | null | undefined): string | null {
	const line = String(description ?? "")
		.split(/\r?\n/)
		.find((l) => l.trim().toLowerCase().startsWith("motivo:"));
	const reason = line?.slice(line.indexOf(":") + 1).trim() ?? "";
	return reason && reason.toLowerCase() !== "no indicado" ? reason : null;
}
