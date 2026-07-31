import { buildCompanyPanelAccessFromPlanFeatures } from "@/lib/super-admin/company-panel-access";
import { mergeThemeConfig } from "@/lib/store-theme/merge-theme-config";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";

/** Recalcula theme_config.panelAccess desde las features del plan y lo mergea. */
export async function syncCompanyPanelAccessFromPlanId(
	companyId: string,
	planId: string | null | undefined,
): Promise<void> {
	const id = String(companyId ?? "").trim();
	if (!id) return;

	const plan = String(planId ?? "").trim();
	let panelAccess: string[] = [];
	if (plan) {
		const { data: planRow } = await supabaseAdmin
			.from("plans")
			.select("features")
			.eq("id", plan)
			.maybeSingle();
		panelAccess = buildCompanyPanelAccessFromPlanFeatures(planRow?.features);
	}

	const { data: company } = await supabaseAdmin
		.from("companies")
		.select("theme_config")
		.eq("id", id)
		.maybeSingle();

	const nextTheme = mergeThemeConfig(company?.theme_config, { panelAccess });
	await supabaseAdmin
		.from("companies")
		.update({
			theme_config: nextTheme,
			updated_at: new Date().toISOString(),
		})
		.eq("id", id);
}
