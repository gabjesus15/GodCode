import type { SupabaseClient } from "@supabase/supabase-js";

/** Días que una solicitud puede esperar la verificación del correo antes de borrarse. */
export const UNVERIFIED_EXPIRATION_DAYS = 7;

/**
 * Borra las solicitudes de alta que nunca verificaron el correo. Idempotente: corre
 * igual una o dos veces el mismo día, solo toca `pending_verification` más viejas
 * que el plazo.
 */
export async function expireUnverifiedApplications(
	client: SupabaseClient,
	now: Date = new Date(),
): Promise<{ ok: true } | { ok: false; error: string }> {
	const cutoff = new Date(now.getTime() - UNVERIFIED_EXPIRATION_DAYS * 24 * 60 * 60 * 1000);
	const { error } = await client
		.from("onboarding_applications")
		.delete()
		.lt("created_at", cutoff.toISOString())
		.eq("status", "pending_verification");
	return error ? { ok: false, error: error.message } : { ok: true };
}
