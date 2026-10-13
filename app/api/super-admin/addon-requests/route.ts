import { NextRequest, NextResponse } from "next/server";

import { ADDON_REQUEST_FIELDS, isAddonRequestStatus } from "@/lib/billing/addon-requests";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { SAAS_READ_ROLES, validateAdminRolesOnServer } from "@/utils/admin/server-auth";

/** @service-role super-admin
 *
 * Pedidos de extras a medida de todas las empresas (los hacen los dueños en /cuenta).
 * `?status=` filtra por estado; sin filtro, los más recientes primero.
 */

export async function GET(req: NextRequest) {
	const permission = await validateAdminRolesOnServer([...SAAS_READ_ROLES]);
	if (!permission.ok) return NextResponse.json({ error: permission.error ?? "No autorizado" }, { status: permission.status ?? 403 });

	const status = req.nextUrl.searchParams.get("status");
	let query = supabaseAdmin
		.from("addon_requests")
		.select(`${ADDON_REQUEST_FIELDS},company:companies(id,name,public_slug),addon:addons(id,unlocks_tabs,panel_module)`)
		.order("created_at", { ascending: false })
		.limit(200);
	if (isAddonRequestStatus(status)) query = query.eq("status", status);

	const { data, error } = await query;
	if (error) {
		console.error("[addon-requests/list] DB error:", error.message);
		return NextResponse.json({ error: "No se pudieron cargar los pedidos." }, { status: 500 });
	}
	return NextResponse.json({ data: data ?? [] });
}
