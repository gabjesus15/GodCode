import "server-only";

import type { CompanyDetail, CompanyPayment, CompanyPlanOption } from "@/components/super-admin/companies/detail/company-detail-types";
import { listCompanyDeliveries } from "@/lib/email/deliveries";
import { remainingPaidDays, resolveSubscriptionPhase } from "@/lib/billing/portal-pricing";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { isTenantExternalDeliveryAllowed } from "@/lib/integrations/company-integration-policy";
import { parseCompanyIntegrationSettingsJson } from "@/lib/integrations/company-integration-json";
import { sanitizeBranchPaymentConfig } from "@/lib/payments/branch-payment-config";
import { resolveStorefrontThemeAssets } from "@/lib/storage/storefront-branding";
import { normalizeStoreThemeConfig } from "@/lib/store-theme/theme-config";
import { companySubscriptionStatus } from "@/lib/super-admin/status-maps";
import { resolveSalesPanelUrl } from "@/lib/tenant/panel-url";
import { getTenantMenuUrl } from "@/utils/tenant-url";

/** @service-role layout-guard
 *
 * Todo lo que muestra la ventana de gestión de una empresa, sobre el Inicio.
 * La lectura del cambio de plan programado usa service role (la tabla no tiene políticas
 * para usuarios); quien llama ya exige super admin con `requireSuperAdminSession`.
 */
export async function loadCompanyDetail(id: string) {
	const [companyRes, businessRes, branchesRes, plansRes, paymentsRes, scheduleRes, deliveries] = await Promise.all([
		supabaseAdmin
			.from("companies")
			.select(
				"id,name,legal_rut,email,phone,address,public_slug,custom_domain,plan_id,subscription_status,subscription_ends_at,updated_at,theme_config,country,currency,integration_settings,created_at",
			)
			.eq("id", id)
			.maybeSingle(),
		supabaseAdmin.from("business_info").select("name,phone,address,instagram,schedule").eq("company_id", id).maybeSingle(),
		supabaseAdmin
			.from("branches")
			.select(
				"id,name,slug,address,phone,is_active,country,currency,instagram,schedule,payment_methods,pago_movil,zelle,transferencia_bancaria,stripe,mercadopago,efectivo,tarjeta,paypal,company_id,delivery_settings",
			)
			.eq("company_id", id)
			.order("created_at", { ascending: false }),
		supabaseAdmin.from("plans").select("id,name,price,max_branches,features,is_active,is_public").order("price", { ascending: true }),
		supabaseAdmin
			.from("payments_history")
			.select("id,amount_paid,payment_method,status,payment_date,payment_reference,months_paid,plan_id,reference_file_url")
			.eq("company_id", id)
			.order("payment_date", { ascending: false, nullsFirst: false })
			.limit(15),
		supabaseAdmin
			.from("company_plan_change_schedules")
			.select("effective_at,plan:plans!company_plan_change_schedules_target_plan_id_fkey(name)")
			.eq("company_id", id)
			.eq("status", "scheduled")
			.maybeSingle(),
		// null si todavía no existe la tabla del registro de correos.
		listCompanyDeliveries(id, 8),
	]);

	const loadError = companyRes.error ?? businessRes.error ?? branchesRes.error ?? plansRes.error ?? paymentsRes.error;
	if (loadError) return { status: "error" as const, error: loadError };
	if (!companyRes.data) return { status: "not_found" as const };

	const raw = companyRes.data;
	const company = raw as unknown as CompanyDetail;
	const plans = (plansRes.data ?? []) as CompanyPlanOption[];
	const payments = (paymentsRes.data ?? []) as CompanyPayment[];
	const plan = plans.find((item) => item.id === company.plan_id) ?? null;
	const schedule = scheduleRes.data as {
		effective_at: string;
		plan?: { name?: string | null } | Array<{ name?: string | null }> | null;
	} | null;
	const schedulePlan = Array.isArray(schedule?.plan) ? schedule?.plan[0] : schedule?.plan;
	const scheduledChange = schedule ? { targetPlanName: schedulePlan?.name ?? null, effectiveAt: schedule.effective_at } : null;

	const phase = resolveSubscriptionPhase(company.subscription_status, company.subscription_ends_at);
	const statusBadge =
		phase === "expired" && company.subscription_status !== "suspended"
			? { label: "Vencida", variant: "danger" as const }
			: companySubscriptionStatus(company.subscription_status);
	const daysLeft = remainingPaidDays(company.subscription_ends_at);
	const menuUrl = company.public_slug ? getTenantMenuUrl(company.public_slug, company.custom_domain) : "";
	const panelUrl = resolveSalesPanelUrl(company.public_slug);

	const integ = parseCompanyIntegrationSettingsJson(raw.integration_settings);
	const resolvedAssets = await resolveStorefrontThemeAssets(
		normalizeStoreThemeConfig(company.theme_config, company.name ?? ""),
		company.id,
	);

	return {
		status: "ok" as const,
		company,
		createdAt: (raw as { created_at?: string | null }).created_at ?? null,
		businessInfo: businessRes.data ?? null,
		branches: (branchesRes.data ?? []).map(sanitizeBranchPaymentConfig),
		plans,
		payments,
		plan,
		scheduledChange,
		deliveries,
		statusBadge,
		daysLeft,
		menuUrl,
		panelUrl,
		integ,
		allowTenantExternalDelivery: isTenantExternalDeliveryAllowed(raw.integration_settings),
		resolvedAssets,
	};
}
