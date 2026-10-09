import "server-only";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { resolveTenantPublicView } from "@/lib/plans/tenant-subscription";
import { getSuperAdminRoleByEmail } from "@/lib/super-admin/account-access";
import { getAppUrl } from "@/lib/tenant/app-url";
import { createSupabaseServerClient } from "@/utils/supabase/server";

/**
 * ¿Quien abre la tienda en vista previa puede verla? Su dueño (o alguien de su equipo)
 * con la sesión de /cuenta, y el equipo de Gcode. La tienda vive en el mismo dominio que
 * /cuenta (`dominio.com/negocio`), así que la cookie de la sesión llega aquí.
 *
 * Solo se llama para tiendas en vista previa: las abiertas no pagan esta consulta.
 */
export async function canViewStoreDraft(companyId: string): Promise<boolean> {
	try {
		const supabase = await createSupabaseServerClient("super-admin");
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return false;

		const email = String(user.email ?? "").trim().toLowerCase();
		if (email) {
			const role = await getSuperAdminRoleByEmail(email);
			if (role === "super_admin" || role === "support") return true;
		}

		const { data } = await supabaseAdmin
			.from("users")
			.select("id,is_active")
			.eq("auth_user_id", user.id)
			.eq("company_id", companyId)
			.limit(5);
		return ((data ?? []) as Array<{ is_active: boolean | null }>).some((row) => row.is_active !== false);
	} catch {
		return false;
	}
}

/** `open`/`closed` como siempre; una tienda en vista previa es `preview` para su dueño y `coming-soon` para el resto. */
export type StorefrontAccess = "open" | "closed" | "preview" | "coming-soon";

export async function resolveStorefrontAccess(
	company: Parameters<typeof resolveTenantPublicView>[0] & { id?: string | number | null },
): Promise<StorefrontAccess> {
	const view = resolveTenantPublicView(company);
	if (view !== "draft") return view;
	return company?.id != null && (await canViewStoreDraft(String(company.id))) ? "preview" : "coming-soon";
}

/** A dónde lleva «Publicar mi tienda» desde la vista previa. */
export function storeDraftPublishHref(): string {
	return `${getAppUrl()}/cuenta/publicar`;
}
