import type { SupabaseClient } from "@supabase/supabase-js";

import { buildCompanyPanelAccessFromPlanFeatures } from "@/lib/super-admin/company-panel-access";
import type { TenantAdminTabId } from "@/lib/super-admin/tenant-admin-tabs";
import { mergeThemeConfig } from "@/lib/store-theme/merge-theme-config";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { resolvePlanProductMode } from "@/lib/plans/plan-product-mode";
import { mergeMenuSettingsIntoIntegration } from "@/lib/tenant/menu-settings";
import { isStoreDraftPending } from "@/lib/tenant/store-draft";

/**
 * Lo que un plan deja guardado en la empresa. Un solo lugar para todos los que asignan un
 * plan (alta, apertura de la vista previa, super admin al cambiar el plan de una empresa o
 * las features de un plan, cambios de plan programados): antes cada uno copiaba una parte y
 * el canal de «solo menú digital» se perdía según por dónde llegara el plan.
 */

export type PlanProductModeCompany = {
	theme_config?: unknown;
	integration_settings?: unknown;
	subscription_status?: string | null;
};

export type PlanProductModePatch = {
	panelAccess: TenantAdminTabId[];
	theme_config: Record<string, unknown>;
	/** Solo con «solo menú digital». */
	integration_settings?: Record<string, unknown>;
};

/**
 * - `panelAccess`: las pestañas del panel que trae el plan (sin plan, ninguna). Una tienda
 *   todavía en vista previa («Arma y paga») queda sin panel: eso llega al pagar
 *   (`openStoreDraft`), aunque el plan sugerido cambie antes.
 * - «Solo menú digital»: deja guardado el canal «solo WhatsApp». Si después sube a un plan
 *   completo, el menú sigue mandando los pedidos por WhatsApp en vez de pasar a exigir una
 *   caja abierta que el dueño todavía no usa; lo cambia él en /cuenta. Por eso al pasar a
 *   otro modo el canal no se toca.
 */
export function buildPlanProductModePatch(company: PlanProductModeCompany, planFeatures: unknown): PlanProductModePatch {
	const panelAccess = isStoreDraftPending(company) ? [] : buildCompanyPanelAccessFromPlanFeatures(planFeatures);
	const patch: PlanProductModePatch = {
		panelAccess,
		theme_config: mergeThemeConfig(company.theme_config, { panelAccess }),
	};
	if (resolvePlanProductMode(planFeatures) === "menu_only") {
		patch.integration_settings = mergeMenuSettingsIntoIntegration(company.integration_settings, {
			orderChannel: "whatsapp_only",
		});
	}
	return patch;
}

export type ApplyPlanProductModeResult = { ok: true } | { ok: false; error: string };

/**
 * Lee la empresa (o usa `options.company` si ya se leyó con `theme_config`,
 * `integration_settings` y `subscription_status`), calcula el cambio y lo guarda en una
 * sola escritura. No lanza: devuelve el error para que quien llama decida.
 */
export async function applyPlanProductModeToCompany(
	companyId: string,
	planFeatures: unknown,
	options: { client?: SupabaseClient; company?: PlanProductModeCompany } = {},
): Promise<ApplyPlanProductModeResult> {
	const id = String(companyId ?? "").trim();
	if (!id) return { ok: false, error: "Falta la empresa" };
	const client = options.client ?? supabaseAdmin;

	let company = options.company ?? null;
	if (!company) {
		const { data, error } = await client
			.from("companies")
			.select("theme_config,integration_settings,subscription_status")
			.eq("id", id)
			.maybeSingle();
		if (error) return { ok: false, error: error.message };
		if (!data) return { ok: false, error: "Empresa no encontrada" };
		company = data as PlanProductModeCompany;
	}

	const patch = buildPlanProductModePatch(company, planFeatures);
	const { error } = await client
		.from("companies")
		.update({
			theme_config: patch.theme_config,
			...(patch.integration_settings ? { integration_settings: patch.integration_settings } : {}),
			updated_at: new Date().toISOString(),
		})
		.eq("id", id);
	return error ? { ok: false, error: error.message } : { ok: true };
}

/** Lo mismo a partir del id del plan (cambios de plan programados, pagos validados). */
export async function syncCompanyPanelAccessFromPlanId(
	companyId: string,
	planId: string | null | undefined,
): Promise<void> {
	const id = String(companyId ?? "").trim();
	if (!id) return;

	const plan = String(planId ?? "").trim();
	let planFeatures: unknown = null;
	if (plan) {
		const { data: planRow, error } = await supabaseAdmin.from("plans").select("features").eq("id", plan).maybeSingle();
		if (error) {
			console.error("sync panel access: plan", { companyId: id, planId: plan, error: error.message });
			return;
		}
		planFeatures = planRow?.features ?? null;
	}

	const result = await applyPlanProductModeToCompany(id, planFeatures);
	if (!result.ok) console.error("sync panel access:", { companyId: id, planId: plan || null, error: result.error });
}
