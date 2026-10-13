import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { createCatalogAddonFromPanelModule, fetchPanelAddonModules, type PanelAddonCatalogFields } from "@/lib/plans/panel-addon-modules";
import { logAdminAudit } from "@/lib/super-admin/admin-audit";
import { SAAS_MUTATE_ROLES, SAAS_READ_ROLES, validateAdminRolesOnServer } from "../../../../utils/admin/server-auth";

/** @service-role super-admin
 *
 * El catálogo de «Servicios extra». Además de lo que ya está en `addons`, devuelve los extras
 * que hay en el panel de caja (`GodCode-Panel/src/addons/`) y todavía no se publicaron. No se
 * crean extras sueltos a mano: se publican los del panel (POST) y los a medida salen al cotizar
 * un pedido (`addon-requests`).
 */

/**
 * `?scope=private`: los hechos a medida (de una empresa), con el nombre de la empresa.
 * - `panelModules`: los del panel sin publicar (solo en el alcance de todos).
 * - `panelModuleIds`: todos los que tiene el panel, para avisar si uno del catálogo no está.
 * - `panelError`: si no se pudo leer la lista del panel.
 */
export async function GET(req: NextRequest) {
	const permission = await validateAdminRolesOnServer([...SAAS_READ_ROLES]);
	if (!permission.ok) {
		return NextResponse.json({ error: permission.error ?? "No autorizado" }, { status: permission.status ?? 403 });
	}

	const scopePrivate = req.nextUrl.searchParams.get("scope") === "private";
	const fields =
		"id,slug,name,description,price_one_time,price_monthly,type,is_active,sort_order,unlocks_tabs,panel_module,company_id,created_at,updated_at,company:companies(id,name)";
	const base = supabaseAdmin.from("addons").select(fields);
	const [{ data, error }, publicModules, panel] = await Promise.all([
		(scopePrivate ? base.not("company_id", "is", null) : base.is("company_id", null)).order("sort_order", { ascending: true }),
		supabaseAdmin.from("addons").select("panel_module").is("company_id", null).not("panel_module", "is", null),
		fetchPanelAddonModules(),
	]);

	if (error) {
		console.error("[addons/list] DB error:", error.message);
		return NextResponse.json({ error: "Error al cargar add-ons" }, { status: 500 });
	}
	const published = new Set((publicModules.data ?? []).map((row) => row.panel_module));
	return NextResponse.json({
		data: data ?? [],
		panelModules: scopePrivate ? [] : panel.modules.filter((item) => !published.has(item.id)),
		panelModuleIds: panel.error ? null : panel.modules.map((item) => item.id),
		panelError: panel.error,
	});
}

type PublishBody = PanelAddonCatalogFields & { panel_module?: string };

/** Publica en el catálogo (para todos) un extra del panel, con su nombre, precio y si se ofrece. */
export async function POST(req: NextRequest) {
	const permission = await validateAdminRolesOnServer([...SAAS_MUTATE_ROLES]);
	if (!permission.ok) {
		return NextResponse.json({ error: permission.error ?? "No autorizado" }, { status: permission.status ?? 403 });
	}

	const body = (await req.json().catch(() => ({}))) as PublishBody;
	if (!String(body.name ?? "").trim()) return NextResponse.json({ error: "Ponle un nombre." }, { status: 400 });

	const result = await createCatalogAddonFromPanelModule(body.panel_module, {
		name: body.name,
		description: body.description ?? null,
		type: body.type,
		price_monthly: body.price_monthly,
		price_one_time: body.price_one_time,
		is_active: body.is_active,
		unlocks_tabs: body.unlocks_tabs,
		sort_order: body.sort_order,
	});
	if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
	if (!result.created) return NextResponse.json({ error: "Ese extra ya está publicado. Edítalo en la lista." }, { status: 409 });

	await logAdminAudit({
		actorEmail: permission.email ?? "",
		actorRole: permission.role,
		action: "addon.publish_from_panel",
		resourceType: "addon",
		resourceId: result.addonId,
		metadata: { panelModule: body.panel_module, name: body.name },
	});
	return NextResponse.json({ ok: true, id: result.addonId });
}
