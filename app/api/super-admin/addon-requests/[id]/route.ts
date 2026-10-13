import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import {
	nextStatusForAdminAction,
	parseAddonQuote,
	privateAddonSlug,
	type AdminAddonRequestAction,
} from "@/lib/billing/addon-requests";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { sanitizeAddonUnlockTabs, sanitizePanelModule } from "@/lib/plans/addon-unlocks";
import { logAdminAudit } from "@/lib/super-admin/admin-audit";
import { SAAS_MUTATE_ROLES, validateAdminRolesOnServer } from "@/utils/admin/server-auth";

/** @service-role super-admin
 *
 * Mover un pedido a medida:
 * - `quote`: precio (pago único o mensual), nota y pestañas que desbloquea. Crea el extra
 *   privado de la empresa (o lo actualiza si se recotiza) y deja el pedido «Cotizado».
 * - `reject`: rechazado; el extra privado, si había, deja de ofrecerse.
 * - `deliver`: un pedido pagado queda «Entregado». Puede ajustar las pestañas que desbloquea y
 *   el módulo del panel de caja que abre (`src/addons/<modulo>`).
 */

type Context = { params: Promise<{ id: string }> };

type Body = {
	action?: "quote" | AdminAddonRequestAction;
	amount?: number;
	billing?: string;
	note?: string;
	unlocks_tabs?: string[];
	/** Carpeta en GodCode-Panel/src/addons/ que abre el extra al entregarlo. */
	panel_module?: string | null;
};

export async function PATCH(req: NextRequest, context: Context) {
	const permission = await validateAdminRolesOnServer([...SAAS_MUTATE_ROLES]);
	if (!permission.ok) return NextResponse.json({ error: permission.error ?? "No autorizado" }, { status: permission.status ?? 403 });
	const { id } = await context.params;
	const body = (await req.json().catch(() => ({}))) as Body;

	const { data: request } = await supabaseAdmin
		.from("addon_requests")
		.select("id,company_id,title,description,status,addon_id")
		.eq("id", id)
		.maybeSingle();
	if (!request) return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });

	const nowIso = new Date().toISOString();
	const audit = (action: string, metadata: Record<string, unknown>) =>
		logAdminAudit({
			actorEmail: permission.email ?? "",
			actorRole: permission.role,
			action,
			resourceType: "addon_request",
			resourceId: id,
			companyId: request.company_id,
			metadata,
		});

	if (body.action === "quote") {
		if (request.status !== "submitted" && request.status !== "quoted") {
			return NextResponse.json({ error: "Solo se cotiza un pedido enviado o ya cotizado." }, { status: 409 });
		}
		const parsed = parseAddonQuote(body);
		if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
		const { amount, billing, note } = parsed.quote;
		const addonFields = {
			name: request.title.slice(0, 120),
			description: (note ?? request.description).slice(0, 500),
			type: billing,
			price_monthly: billing === "monthly" ? amount : null,
			price_one_time: billing === "one_time" ? amount : null,
			unlocks_tabs: sanitizeAddonUnlockTabs(body.unlocks_tabs),
			is_active: true,
			updated_at: nowIso,
		};

		let addonId = request.addon_id;
		if (addonId) {
			const { error } = await supabaseAdmin.from("addons").update(addonFields).eq("id", addonId).eq("company_id", request.company_id);
			if (error) return NextResponse.json({ error: "No se pudo actualizar el extra." }, { status: 500 });
		} else {
			const { data: created, error } = await supabaseAdmin
				.from("addons")
				.insert({ ...addonFields, slug: privateAddonSlug(request.id), company_id: request.company_id, sort_order: 1000 })
				.select("id")
				.single();
			if (error || !created) return NextResponse.json({ error: "No se pudo crear el extra." }, { status: 500 });
			addonId = created.id;
		}

		const { error } = await supabaseAdmin
			.from("addon_requests")
			.update({ status: "quoted", quote_amount: amount, quote_billing: billing, quote_note: note, addon_id: addonId, quoted_at: nowIso })
			.eq("id", id)
			.eq("status", request.status);
		if (error) return NextResponse.json({ error: "No se pudo guardar la cotización." }, { status: 500 });

		await audit("addon_request.quote", { amount, billing, addonId });
		revalidateTag("tag:addons", "max");
		return NextResponse.json({ ok: true });
	}

	if (body.action !== "reject" && body.action !== "deliver") {
		return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
	}
	const next = nextStatusForAdminAction(request.status, body.action);
	if (!next.ok) return NextResponse.json({ error: next.error }, { status: 409 });

	if (body.action === "reject" && request.addon_id) {
		await supabaseAdmin.from("addons").update({ is_active: false, updated_at: nowIso }).eq("id", request.addon_id).eq("company_id", request.company_id);
	}
	if (body.action === "deliver" && request.addon_id) {
		const panelModule = sanitizePanelModule(body.panel_module);
		if (body.panel_module && !panelModule) {
			return NextResponse.json({ error: "El módulo del panel va en minúsculas, números y guiones (p. ej. cuadre-caja)." }, { status: 400 });
		}
		const { error: addonError } = await supabaseAdmin
			.from("addons")
			.update({
				...(body.unlocks_tabs !== undefined ? { unlocks_tabs: sanitizeAddonUnlockTabs(body.unlocks_tabs) } : {}),
				...(body.panel_module !== undefined ? { panel_module: panelModule } : {}),
				updated_at: nowIso,
			})
			.eq("id", request.addon_id)
			.eq("company_id", request.company_id);
		if (addonError) return NextResponse.json({ error: "No se pudo actualizar el extra." }, { status: 500 });
	}

	const { error } = await supabaseAdmin
		.from("addon_requests")
		.update({ status: next.status, ...(next.status === "delivered" ? { delivered_at: nowIso } : {}) })
		.eq("id", id)
		.eq("status", request.status);
	if (error) return NextResponse.json({ error: "No se pudo actualizar el pedido." }, { status: 500 });

	await audit(`addon_request.${body.action}`, {});
	return NextResponse.json({ ok: true });
}
