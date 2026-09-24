import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { sessionNeedsMfa } from "@/lib/auth/mfa-server";
import { getCustomerMembership, getSuperAdminRoleByEmail } from "@/lib/super-admin/account-access";
import { createSupabaseServerClient } from "@/utils/supabase/server";

/**
 * Sesión del dueño (rol `ceo`) para /cuenta, o redirección a donde corresponde.
 *
 * - sin sesión → login; sesión sin el segundo factor → login en el paso del código;
 * - super admin o soporte → su panel;
 * - administrador o cajero → /post-login, que lo manda al panel de su local;
 * - sin empresa → login con el aviso de "sin acceso".
 *
 * La usan el layout y la página (`cache` la resuelve una vez por petición).
 */
export const requireCustomerPortalSession = cache(async () => {
	const supabase = await createSupabaseServerClient("super-admin");
	const {
		data: { user },
		error,
	} = await supabase.auth.getUser();

	if (error || !user?.email) redirect("/login");
	if (await sessionNeedsMfa(supabase)) redirect("/login?mfa=1");

	const email = user.email.trim().toLowerCase();
	const superAdminRole = await getSuperAdminRoleByEmail(email);
	if (superAdminRole === "super_admin" || superAdminRole === "support") redirect("/dashboard");

	const membership = await getCustomerMembership({ authUserId: user.id, email });
	if (!membership) redirect("/login?error=no-access");
	if (membership.role !== "ceo") redirect("/post-login");

	return { authUserId: user.id, email, membership };
});
