import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { sanitizePanelModule } from "@/lib/plans/addon-unlocks";
import {
	createCatalogAddonFromPanelModule,
	fetchPanelAddonModules,
	findCatalogAddonForPanelModule,
} from "@/lib/plans/panel-addon-modules";
import { logAdminAudit } from "@/lib/super-admin/admin-audit";
import { SAAS_MUTATE_ROLES, SAAS_READ_ROLES, validateAdminRolesOnServer } from "@/utils/admin/server-auth";

/** @service-role super-admin
 *
 * Extras de una empresa activados a mano (regalos, tratos especiales, lo cotizado y
 * entregado). Lo normal es que se activen al validar el pago; esto es para lo demás.
 * Quitar no borra la fila: la deja `cancelled`, y el panel deja de sumar sus pestañas.
 *
 * También lista los extras que existen en el panel de caja (`/addons-manifest.json`) y todavía
 * no están en el catálogo. Activar uno (`panelModule`) lo agrega al catálogo sin precio y sin
 * ofrecerse en /cuenta, y se lo activa a la empresa.
 */

type Context = { params: Promise<{ id: string }> };

const ADDON_FIELDS = "id,slug,name,description,type,price_monthly,price_one_time,unlocks_tabs,panel_module,company_id,is_active";

export async function GET(_req: NextRequest, context: Context) {
	const permission = await validateAdminRolesOnServer([...SAAS_READ_ROLES]);
	if (!permission.ok) return NextResponse.json({ error: permission.error ?? "No autorizado" }, { status: permission.status });
	const { id: companyId } = await context.params;

	const [owned, catalog, panel] = await Promise.all([
		supabaseAdmin
			.from("company_addons")
			.select(`id,addon_id,status,price_paid,expires_at,created_at,updated_at,addon:addons(${ADDON_FIELDS})`)
			.eq("company_id", companyId)
			.order("created_at", { ascending: false }),
		supabaseAdmin
			.from("addons")
			.select(ADDON_FIELDS)
			.or(`company_id.is.null,company_id.eq.${companyId}`)
			.order("sort_order", { ascending: true }),
		fetchPanelAddonModules(),
	]);
	if (owned.error || catalog.error) {
		return NextResponse.json({ error: (owned.error ?? catalog.error)?.message ?? "No se pudo leer" }, { status: 500 });
	}
	const inCatalog = new Set((catalog.data ?? []).map((addon) => addon.panel_module).filter(Boolean));
	return NextResponse.json({
		owned: owned.data ?? [],
		catalog: catalog.data ?? [],
		panelModules: panel.modules.filter((item) => !inCatalog.has(item.id)),
		panelError: panel.error,
	});
}

export async function POST(req: NextRequest, context: Context) {
	const permission = await validateAdminRolesOnServer([...SAAS_MUTATE_ROLES]);
	if (!permission.ok) return NextResponse.json({ error: permission.error ?? "No autorizado" }, { status: permission.status });
	const { id: companyId } = await context.params;

	const body = (await req.json().catch(() => ({}))) as { addonId?: string; panelModule?: string; expiresAt?: string | null };
	let addonId = String(body.addonId ?? "").trim();
	if (!addonId && !body.panelModule) return NextResponse.json({ error: "Elige un extra." }, { status: 400 });

	let expiresAt: string | null = null;
	if (body.expiresAt) {
		const date = new Date(body.expiresAt);
		if (Number.isNaN(date.getTime())) return NextResponse.json({ error: "Fecha de vencimiento inválida." }, { status: 400 });
		if (date.getTime() <= Date.now()) return NextResponse.json({ error: "El vencimiento tiene que ser a futuro." }, { status: 400 });
		expiresAt = date.toISOString();
	}

	if (!addonId) {
		const panelModule = sanitizePanelModule(body.panelModule);
		if (!panelModule) return NextResponse.json({ error: "Módulo del panel inválido." }, { status: 400 });
		// El de la empresa o el de todos; si no hay, se agrega al catálogo sin precio.
		const found = await findCatalogAddonForPanelModule(panelModule, companyId);
		const resolved = found ? { addonId: found, created: false } : await createCatalogAddonFromPanelModule(panelModule);
		if ("error" in resolved) return NextResponse.json({ error: resolved.error }, { status: resolved.status });
		addonId = resolved.addonId;
		if (resolved.created) {
			await logAdminAudit({
				actorEmail: permission.email ?? "",
				actorRole: permission.role,
				action: "addon.create_from_panel",
				resourceType: "addon",
				resourceId: addonId,
				companyId,
				metadata: { panelModule: body.panelModule },
			});
		}
	}

	const { data: addon } = await supabaseAdmin.from("addons").select("id,name,company_id").eq("id", addonId).maybeSingle();
	if (!addon || (addon.company_id && addon.company_id !== companyId)) {
		return NextResponse.json({ error: "Ese extra no es para esta empresa." }, { status: 400 });
	}

	const { error } = await supabaseAdmin.from("company_addons").upsert(
		{
			company_id: companyId,
			addon_id: addonId,
			status: "active",
			expires_at: expiresAt,
			updated_at: new Date().toISOString(),
		},
		{ onConflict: "company_id,addon_id" },
	);
	if (error) return NextResponse.json({ error: "No se pudo activar el extra." }, { status: 500 });

	await logAdminAudit({
		actorEmail: permission.email ?? "",
		actorRole: permission.role,
		action: "company.addon.activate",
		resourceType: "company",
		resourceId: companyId,
		companyId,
		metadata: { addonId, addonName: addon.name, expiresAt },
	});
	return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, context: Context) {
	const permission = await validateAdminRolesOnServer([...SAAS_MUTATE_ROLES]);
	if (!permission.ok) return NextResponse.json({ error: permission.error ?? "No autorizado" }, { status: permission.status });
	const { id: companyId } = await context.params;

	const addonId = String(req.nextUrl.searchParams.get("addonId") ?? "").trim();
	if (!addonId) return NextResponse.json({ error: "Elige un extra." }, { status: 400 });

	const { error } = await supabaseAdmin
		.from("company_addons")
		.update({ status: "cancelled", updated_at: new Date().toISOString() })
		.eq("company_id", companyId)
		.eq("addon_id", addonId);
	if (error) return NextResponse.json({ error: "No se pudo quitar el extra." }, { status: 500 });

	await logAdminAudit({
		actorEmail: permission.email ?? "",
		actorRole: permission.role,
		action: "company.addon.cancel",
		resourceType: "company",
		resourceId: companyId,
		companyId,
		metadata: { addonId },
	});
	return NextResponse.json({ ok: true });
}

