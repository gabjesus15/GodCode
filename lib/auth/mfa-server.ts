import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * ¿La sesión todavía tiene que pasar el segundo factor?
 *
 * Con la contraseña correcta Supabase ya escribe en las cookies una sesión `aal1`, antes
 * de que el login pida el código TOTP. Si el usuario tiene un factor verificado
 * (`nextLevel = aal2`) y la sesión sigue en `aal1`, el servidor no debe dejarlo pasar:
 * antes bastaba con escribir la URL del panel para saltarse el código.
 *
 * Llamar después de `getUser()` (que valida el token contra Auth). Ante un error responde
 * `true`: mejor pedir el código de nuevo que abrir el panel sin él.
 */
export async function sessionNeedsMfa(supabase: SupabaseClient): Promise<boolean> {
	const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
	if (error || !data) return true;
	return data.nextLevel === "aal2" && data.currentLevel !== "aal2";
}
