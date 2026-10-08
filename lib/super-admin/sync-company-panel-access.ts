import { buildCompanyPanelAccessFromPlanFeatures } from "@/lib/super-admin/company-panel-access";
import { mergeThemeConfig } from "@/lib/store-theme/merge-theme-config";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { resolvePlanProductMode } from "@/lib/plans/plan-product-mode";
import { mergeMenuSettingsIntoIntegration } from "@/lib/tenant/menu-settings";

/**
 * Recalcula theme_config.panelAccess desde las features del plan y lo mergea.
 *
 * Al entrar a «solo menú digital» además deja guardado el canal «solo WhatsApp». Así, si
 * después sube a un plan completo, el menú sigue recibiendo pedidos por WhatsApp en vez de
 * pasar a exigir una caja abierta que el dueño todavía no usa; lo cambia él en /cuenta.
 */
export async function syncCompanyPanelAccessFromPlanId(
	companyId: string,
	planId: string | null | undefined,
): Promise<void> {
	const id = String(companyId ?? "").trim();
	if (!id) return;

	const plan = String(planId ?? "").trim();
	let panelAccess: string[] = [];
	let planFeatures: unknown = null;
	if (plan) {
		const { data: planRow } = await supabaseAdmin
			.from("plans")
			.select("features")
			.eq("id", plan)
			.maybeSingle();
		planFeatures = planRow?.features ?? null;
		panelAccess = buildCompanyPanelAccessFromPlanFeatures(planFeatures);
	}

	const { data: company } = await supabaseAdmin
		.from("companies")
		.select("theme_config, integration_settings")
		.eq("id", id)
		.maybeSingle();

	const nextTheme = mergeThemeConfig(company?.theme_config, { panelAccess });
	const menuOnly = resolvePlanProductMode(planFeatures) === "menu_only";
	await supabaseAdmin
		.from("companies")
		.update({
			theme_config: nextTheme,
			...(menuOnly
				? {
						integration_settings: mergeMenuSettingsIntoIntegration(company?.integration_settings, {
							orderChannel: "whatsapp_only",
						}),
					}
				: {}),
			updated_at: new Date().toISOString(),
		})
		.eq("id", id);
}
