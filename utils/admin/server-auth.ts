import { supabaseAdmin } from "@/lib/infra/supabase-admin";

const FALLBACK_ALLOWED_ROLES = new Set(["super_admin"]);

/** Lectura (GET) en APIs super-admin: incluye soporte. */
export const SAAS_READ_ROLES = ["super_admin", "support"] as const;

/** Mutaciones (POST/PATCH/DELETE): solo super_admin. */
export const SAAS_MUTATE_ROLES = ["super_admin"] as const;

export interface ServerAdminPermissionResult {
	ok: boolean;
	status: number;
	email?: string;
	role?: string;
	error?: string;
}

export async function validateAdminRolesOnServer(
	allowedRoles: string[] = Array.from(FALLBACK_ALLOWED_ROLES)
): Promise<ServerAdminPermissionResult> {
	try {
		// Importar dinámicamente para evitar problemas de SSR
		const { createSupabaseServerClient } = await import("../supabase/server");
		const supabase = await createSupabaseServerClient();
		
		const {
			data: { user },
			error: userError,
		} = await supabase.auth.getUser();

		if (userError || !user?.email) {
			return { ok: false, status: 401, error: "No autenticado" };
		}

		const email = user.email.trim().toLowerCase();
		const normalizedAllowedRoles = allowedRoles.map((role) => String(role).toLowerCase());

		// Usar service role para bypass RLS
		const { data: adminUser, error: adminError } = await supabaseAdmin
			.from("admin_users")
			.select("role")
			.ilike("email", email)
			.maybeSingle();

		if (adminError) {
			return { ok: false, status: 500, error: "No se pudo validar permisos" };
		}

		const role = String(adminUser?.role ?? "").toLowerCase() || null;

		if (!role) {
			return { ok: false, status: 403, error: "No tienes permisos SaaS asignados." };
		}

		if (!normalizedAllowedRoles.includes(role)) {
			return { ok: false, status: 403, error: "No tienes permisos para esta accion." };
		}

		return { ok: true, status: 200, email, role };
	} catch {
		return { ok: false, status: 500, error: "Error al validar sesion" };
	}
}

