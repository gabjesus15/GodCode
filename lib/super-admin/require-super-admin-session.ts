import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { sessionNeedsMfa } from "@/lib/auth/mfa-server";
import { getSuperAdminRoleByEmail } from "@/lib/super-admin/account-access";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export type SuperAdminSession = {
	email: string;
	role: "super_admin" | "support";
};

/**
 * Sesión válida del panel super admin, o redirección al login.
 *
 * La llaman el layout y cada página que consulta con service role: en una navegación
 * Next puede renderizar solo el segmento de la página sin volver a pasar por el layout,
 * así que el layout no basta como guarda. `cache` la resuelve una vez por petición.
 */
export const requireSuperAdminSession = cache(async (): Promise<SuperAdminSession> => {
	const supabase = await createSupabaseServerClient();
	const {
		data: { user },
		error,
	} = await supabase.auth.getUser();

	if (error || !user?.email) redirect("/login");
	if (await sessionNeedsMfa(supabase)) redirect("/login?mfa=1");

	// Service role (igual que /post-login): un super_admin sin fila en public.users no
	// debe depender de la RLS de admin_users para entrar al panel.
	const role = (await getSuperAdminRoleByEmail(user.email)) ?? "";
	if (role !== "super_admin" && role !== "support") redirect("/login");

	return { email: user.email.trim().toLowerCase(), role };
});
