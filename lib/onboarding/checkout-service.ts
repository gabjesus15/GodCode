import type { SupabaseClient } from "@supabase/supabase-js";

import { buildCompanyPanelAccessFromPlanFeatures } from "@/lib/super-admin/company-panel-access";
import { slugify as slugifyBase } from "../../utils/slugify";
import { isSingleInstanceAddon, resolveAddonUnitPrice } from "../plans/addon-pricing";
import { resolveAddonOfferForPlan, type PlanOfferSnapshot } from "../plans/plan-offer-rules";
import { resolveRegionalPlanPrice } from "../plans/plan-regional-pricing";

function slugifyCompanyPublicSlug(value: string): string {
	return slugifyBase(value, { maxLength: 80, emptyFallback: "negocio" });
}

export type OnboardingApplication = {
	id: string;
	business_name: string;
	responsible_name?: string | null;
	email: string;
	country?: string | null;
	billing_rut?: string | null;
	fiscal_address?: string | null;
	logo_url?: string | null;
	social_instagram?: string | null;
	custom_domain?: string | null;
	custom_plan_name?: string | null;
	custom_plan_price?: number | string | null;
	plan_id: string;
	company_id?: string | null;
	subscription_payment_method?: string | null;
	payment_reference?: string | null;
	payment_status?: string | null;
	payment_reference_url?: string | null;
	payment_months?: number | null;
	payment_amount?: number | null;
};

export type CheckoutPlan = {
	id: string;
	name: string;
	price: number;
	max_branches: number | null;
	max_users: number | null;
	prices_by_continent?: Record<string, { price: number; currency: string }> | null;
	features?: unknown;
};

/** Métodos que cobran en línea. Todo lo demás (transferencia, Pago Móvil, Zelle…) es manual. */
const ONLINE_METHOD_SLUGS = new Set(["paypal"]);
/** Ya no se cobra con ellos: si alguien los reactiva en el panel, el checkout los rechaza. */
const RETIRED_METHOD_SLUGS = new Set(["stripe"]);

export function isOnlineMethod(method: string): boolean {
	return ONLINE_METHOD_SLUGS.has(method);
}

export function isRetiredMethod(method: string): boolean {
	return RETIRED_METHOD_SLUGS.has(method);
}

export function isManualMethod(method: string): boolean {
	return Boolean(method) && !isOnlineMethod(method) && !isRetiredMethod(method);
}

export async function resolveCheckoutPlan(
	supabaseAdmin: SupabaseClient,
	app: OnboardingApplication,
): Promise<{ plan: CheckoutPlan | null; error?: string; status?: number }> {
	if (!app.plan_id) {
		return { plan: null, error: "Debes seleccionar un plan antes de pagar", status: 400 };
	}

	const { data: planData, error: planError } = await supabaseAdmin
		.from("plans")
		.select("id,name,price,prices_by_continent,features,max_branches,max_users,is_active,is_public")
		.eq("id", app.plan_id)
		.maybeSingle();

	if (planError || !planData) {
		return { plan: null, error: "Plan no encontrado", status: 404 };
	}
	// Solo planes a la venta: los internos (dev, promos) no se contratan por el onboarding.
	if (planData.is_active === false || planData.is_public !== true) {
		return { plan: null, error: "Ese plan ya no está disponible. Elige otro.", status: 409 };
	}

	return { plan: planData as CheckoutPlan };
}

export function resolveCheckoutPlanPrice(plan: CheckoutPlan, country: string | null | undefined): {
	price: number;
	currency: string;
	continent: string;
	source: "regional" | "fallback";
} {
	return resolveRegionalPlanPrice(plan, country);
}

type AddonCatalogRow = {
	id: string;
	slug: string | null;
	name: string;
	type: string | null;
	description?: string | null;
	price_monthly: number | null;
	price_one_time: number | null;
	is_active: boolean | null;
};

export type PricedApplicationAddon = {
	addon_id: string;
	quantity: number;
	/** Precio unitario vigente (0 si el plan lo incluye). */
	unit_price: number;
	is_monthly: boolean;
};

/**
 * Extras elegidos, con el precio de la tabla `addons` y la política del plan. Nunca se usa
 * un precio que venga del navegador: antes el formulario mandaba `price_snapshot` y con
 * un 0 o un negativo el extra salía gratis o abarataba el total.
 * - inactivo o bloqueado por el plan: se descarta;
 * - incluido en el plan: precio 0;
 * - de instancia única (dominio): cantidad 1.
 */
export async function priceApplicationAddons(
	supabaseAdmin: SupabaseClient,
	choices: Array<{ addon_id: string; quantity?: number | null }>,
	plan: PlanOfferSnapshot | null,
): Promise<PricedApplicationAddon[]> {
	const ids = [...new Set(choices.map((choice) => String(choice.addon_id ?? "").trim()).filter(Boolean))];
	if (ids.length === 0) return [];

	const { data } = await supabaseAdmin
		.from("addons")
		.select("id,slug,name,type,description,price_monthly,price_one_time,is_active")
		.in("id", ids);
	const catalog = new Map(((data ?? []) as AddonCatalogRow[]).map((row) => [row.id, row]));

	const priced: PricedApplicationAddon[] = [];
	for (const id of ids) {
		const addon = catalog.get(id);
		if (!addon || addon.is_active === false) continue;
		const offer = resolveAddonOfferForPlan(plan, addon);
		if (offer.status === "blocked") continue;
		const choice = choices.find((item) => String(item.addon_id).trim() === id);
		const quantity = isSingleInstanceAddon(addon) ? 1 : Math.max(1, Math.min(99, Number(choice?.quantity) || 1));
		const { isMonthly, unitPrice } = resolveAddonUnitPrice(addon);
		priced.push({
			addon_id: id,
			quantity,
			unit_price: offer.status === "included" ? 0 : unitPrice,
			is_monthly: isMonthly,
		});
	}
	return priced;
}

/** Total de los extras de la solicitud en USD, recalculado con los precios de la base. */
export async function calculateAddonsTotalUsd(
	supabaseAdmin: SupabaseClient,
	applicationId: string,
	months: number,
	plan: PlanOfferSnapshot | null,
): Promise<number> {
	const { data: applicationAddonsRows } = await supabaseAdmin
		.from("onboarding_application_addons")
		.select("addon_id,quantity")
		.eq("application_id", applicationId);

	const priced = await priceApplicationAddons(
		supabaseAdmin,
		(applicationAddonsRows ?? []) as Array<{ addon_id: string; quantity?: number | null }>,
		plan,
	);

	let total = 0;
	for (const addon of priced) {
		total += addon.unit_price * addon.quantity * (addon.is_monthly ? months : 1);
	}
	return Number(total.toFixed(2));
}

export type ProvisionCompanyResult =
	| { ok: true; company: { id: string } }
	| { ok: false; error: string; status: number };

function resolveCompanyInsertErrorMessage(err: { code?: string; message?: string } | null | undefined): {
	error: string;
	status: number;
} {
	if (!err) return { error: "Error al crear la empresa", status: 500 };

	if (err.code === "23505") {
		return { error: "Ya existe una empresa con datos similares", status: 409 };
	}

	if (err.code === "23503") {
		return {
			error: "No se pudo crear la empresa por una referencia interna invalida. Contacta soporte.",
			status: 500,
		};
	}

	if (err.code === "42501") {
		return {
			error: "No se pudo crear la empresa por permisos insuficientes del servicio.",
			status: 500,
		};
	}

	if ((err.message ?? "").toLowerCase().includes("created_by")) {
		return {
			error: "No se pudo crear la empresa por configuracion incompleta de usuarios internos.",
			status: 500,
		};
	}

	return { error: "Error al crear la empresa", status: 500 };
}

async function resolveCompanyCreatorId(supabaseAdmin: SupabaseClient): Promise<string | null> {
	const { data: existingCompany } = await supabaseAdmin
		.from("companies")
		.select("created_by")
		.not("created_by", "is", null)
		.order("created_at", { ascending: true })
		.limit(1)
		.maybeSingle();

	if (existingCompany?.created_by) return existingCompany.created_by;

	const { data: activeUser } = await supabaseAdmin
		.from("users")
		.select("id")
		.eq("is_active", true)
		.order("created_at", { ascending: true })
		.limit(1)
		.maybeSingle();

	return activeUser?.id ?? null;
}

export async function provisionCompanyFromApplication(
	supabaseAdmin: SupabaseClient,
	app: OnboardingApplication,
	isManualPayment: boolean,
): Promise<ProvisionCompanyResult> {
	if (app.company_id) {
		const { data: existing } = await supabaseAdmin
			.from("companies")
			.select("id")
			.eq("id", app.company_id)
			.maybeSingle();
		if (existing) return { ok: true, company: existing };
	}

	const baseSlug = slugifyCompanyPublicSlug(app.business_name);
	let publicSlug = baseSlug;
	let suffix = 0;
	while (true) {
		const { data: existing } = await supabaseAdmin
			.from("companies")
			.select("id")
			.eq("public_slug", publicSlug)
			.maybeSingle();
		if (!existing) break;
		suffix += 1;
		publicSlug = `${baseSlug}-${suffix}`;
	}

	const createdBy = await resolveCompanyCreatorId(supabaseAdmin);
	if (!createdBy) {
		return { ok: false, error: "No hay usuario activo para crear la empresa", status: 503 };
	}

	let planFeatures: unknown = null;
	if (app.plan_id && app.plan_id !== "custom") {
		const { data: planRow } = await supabaseAdmin
			.from("plans")
			.select("features")
			.eq("id", app.plan_id)
			.maybeSingle();
		planFeatures = planRow?.features ?? null;
	}

	const panelAccess = buildCompanyPanelAccessFromPlanFeatures(planFeatures);

	const companyPayload = {
		name: app.business_name,
		created_by: createdBy,
		legal_rut: app.billing_rut ?? null,
		email: app.email,
		phone: null,
		address: app.fiscal_address ?? null,
		public_slug: publicSlug,
		plan_id: app.plan_id,
		subscription_status: isManualPayment ? "payment_pending" : "trial",
		custom_domain: app.custom_domain ?? null,
		theme_config: {
			displayName: app.business_name,
			logoUrl: app.logo_url ?? null,
			primaryColor: "#111827",
			secondaryColor: "#111827",
			panelAccess,
		},
	};

	const { data: inserted, error: companyError } = await supabaseAdmin
		.from("companies")
		.insert(companyPayload)
		.select("id")
		.single();

	if (companyError || !inserted) {
		console.error("onboarding checkout company insert:", companyError);
		const mapped = resolveCompanyInsertErrorMessage(companyError);
		return { ok: false, error: mapped.error, status: mapped.status };
	}

	const { error: branchError } = await supabaseAdmin.from("branches").insert({
		company_id: inserted.id,
		name: "Principal",
		slug: "principal",
		address: app.fiscal_address ?? null,
		is_active: true,
	});
	if (branchError) console.error("onboarding checkout branch insert:", branchError);

	await supabaseAdmin.from("business_info").insert({
		company_id: inserted.id,
		name: app.business_name,
		address: app.fiscal_address ?? null,
		instagram: app.social_instagram ?? null,
		schedule: null,
	}).then(() => {});

	await supabaseAdmin
		.from("onboarding_applications")
		.update({
			company_id: inserted.id,
			status: "payment_pending",
			updated_at: new Date().toISOString(),
		})
		.eq("id", app.id);

	return { ok: true, company: inserted };
}

export async function updateApplicationPaymentState(
	supabaseAdmin: SupabaseClient,
	applicationId: string,
	params: {
		applicationStatus?: string | null;
		paymentReference?: string | null;
		paymentStatus?: string | null;
		paymentReferenceUrl?: string | null;
		paymentMonths?: number | null;
		paymentAmount?: number | null;
		updatedAt?: string;
	}
): Promise<void> {
	const payload: {
		status?: string | null;
		payment_reference?: string | null;
		payment_status?: string | null;
		payment_reference_url?: string | null;
		payment_months?: number | null;
		payment_amount?: number | null;
		updated_at: string;
	} = {
		updated_at: params.updatedAt ?? new Date().toISOString(),
	};

	if (params.applicationStatus !== undefined) payload.status = params.applicationStatus;
	if (params.paymentReference !== undefined) payload.payment_reference = params.paymentReference;
	if (params.paymentStatus !== undefined) payload.payment_status = params.paymentStatus;
	if (params.paymentReferenceUrl !== undefined) payload.payment_reference_url = params.paymentReferenceUrl;
	if (params.paymentMonths !== undefined) payload.payment_months = params.paymentMonths;
	if (params.paymentAmount !== undefined) payload.payment_amount = params.paymentAmount;

	const { error } = await supabaseAdmin.from("onboarding_applications").update(payload).eq("id", applicationId);
	// La captura de PayPal solo acepta la orden guardada aquí: si no se guardó, cobrar
	// después fallaría con el dinero ya pagado. Mejor cortar antes de mandar al cliente a pagar.
	if (error) throw new Error(`No se pudo guardar el estado del pago: ${error.message}`);
}

export async function getManualMethodConfig(
	supabaseAdmin: SupabaseClient,
	methodSlug: string,
): Promise<Record<string, string>> {
	const config: Record<string, string> = {};
	const { data: methodRow } = await supabaseAdmin
		.from("plan_payment_methods")
		.select("id")
		.eq("slug", methodSlug)
		.maybeSingle();

	if (methodRow) {
		const { data: configRows } = await supabaseAdmin
			.from("plan_payment_method_config")
			.select("key,value")
			.eq("method_id", methodRow.id);
		for (const row of (configRows ?? []) as { key?: string; value?: string }[]) {
			if (row.key) config[row.key] = row.value ?? "";
		}
	}

	return config;
}
