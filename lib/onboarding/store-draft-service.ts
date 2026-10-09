import type { SupabaseClient } from "@supabase/supabase-js";

import { resolvePlanProductMode } from "@/lib/plans/plan-product-mode";
import { buildPlanProductModePatch } from "@/lib/super-admin/sync-company-panel-access";
import { getAppUrl } from "@/lib/tenant/app-url";
import { isStoreDraftPending, readStoreDraft, withStoreDraft, withStoreDraftOpened } from "@/lib/tenant/store-draft";
import { initialStoreTheme, resolveCompanyCreatorId } from "./checkout-service";
import { findAvailableStoreSlug } from "./store-slug";

/**
 * Lado servidor de «Arma y paga»: crear la tienda en vista previa al registrarse y
 * abrirla al público cuando se confirma el pago. Lo usan el servicio de alta y el cron.
 */

// La regla del link vive en store-slug.ts (sin imports de servidor, la usa también el
// formulario); se reexporta para quien ya la importaba desde aquí.
export {
	isReservedStoreSlug,
	isStoreSlugTaken,
	normalizeStoreSlug,
	STORE_SLUG_MAX,
	STORE_SLUG_MIN,
	storeSlugProblem,
} from "./store-slug";

/** Primer link libre a partir de un nombre (`rica-pizza`, `rica-pizza-2`…). */
export async function suggestStoreSlug(supabaseAdmin: SupabaseClient, name: string): Promise<string> {
	return findAvailableStoreSlug(supabaseAdmin, name);
}

/**
 * Con «solo panel CEO» no hay tienda que armar en vista previa: ese plan sigue con el alta
 * de siempre (elegir plan y pagar) y al pagar entra a su cuenta y al panel.
 */
export async function isPanelOnlyPlan(supabaseAdmin: SupabaseClient, planId: string | null | undefined): Promise<boolean> {
	const id = String(planId ?? "").trim();
	if (!id || id === "custom") return false;
	const { data } = await supabaseAdmin.from("plans").select("features").eq("id", id).maybeSingle();
	return resolvePlanProductMode(data?.features) === "panel_only";
}

/** Ids de los planes «solo panel CEO», para decidir de una vez el paso de muchas altas. */
export async function loadPanelOnlyPlanIds(supabaseAdmin: SupabaseClient): Promise<Set<string>> {
	const { data } = await supabaseAdmin.from("plans").select("id,features");
	const ids = new Set<string>();
	for (const plan of (data ?? []) as Array<{ id: string; features?: unknown }>) {
		if (resolvePlanProductMode(plan.features) === "panel_only") ids.add(String(plan.id));
	}
	return ids;
}

export type StoreDraftApplication = {
	id: string;
	email: string;
	business_name: string;
	responsible_name?: string | null;
	plan_id?: string | null;
	logo_url?: string | null;
	sector?: string | null;
};

export type CreateStoreDraftResult =
	| { ok: true; companyId: string; slug: string }
	| { ok: false; status: number; code: "slug_taken" | "error"; error: string };

/** Lo que ve el dueño si la tienda no se pudo crear entera: no quedó nada, puede reintentar. */
export const STORE_DRAFT_CREATE_FAILED = "No pudimos crear tu tienda. Intenta de nuevo en un momento.";

/**
 * Crea la empresa en vista previa: `trial` sin vencimiento (la RLS pública deja leer su
 * menú, así la vista previa es la tienda real) y `storeDraft` en el tema, que la oculta a
 * todos menos al dueño. Sin acceso al panel de caja: eso llega con el plan pagado.
 *
 * La sucursal «Principal» y `business_info` son parte de la tienda: sin sucursal el menú no
 * tiene dónde cargar productos. Si alguna falla se borra lo creado y se devuelve el error,
 * para que el dueño reintente con el mismo link en vez de quedar con una tienda rota.
 */
export async function createStoreDraftCompany(
	supabaseAdmin: SupabaseClient,
	params: { app: StoreDraftApplication; businessName: string; slug: string; sector: string | null; now?: Date },
): Promise<CreateStoreDraftResult> {
	const { app, businessName, slug, sector } = params;
	const createdBy = await resolveCompanyCreatorId(supabaseAdmin);
	if (!createdBy) {
		console.error("store draft: no hay usuario interno para companies.created_by");
		return { ok: false, status: 503, code: "error", error: STORE_DRAFT_CREATE_FAILED };
	}

	const theme = withStoreDraft(
		{ ...initialStoreTheme({ business_name: businessName, logo_url: app.logo_url ?? null, sector }), panelAccess: [] },
		params.now,
	);

	const { data: inserted, error } = await supabaseAdmin
		.from("companies")
		.insert({
			name: businessName,
			created_by: createdBy,
			email: app.email,
			public_slug: slug,
			plan_id: app.plan_id ?? null,
			subscription_status: "trial",
			subscription_ends_at: null,
			theme_config: theme,
		})
		.select("id")
		.single();

	if (error || !inserted) {
		if (error?.code === "23505") return { ok: false, status: 409, code: "slug_taken", error: "Ese link ya lo tiene otra tienda. Prueba con otro." };
		console.error("store draft company insert:", error);
		return { ok: false, status: 500, code: "error", error: STORE_DRAFT_CREATE_FAILED };
	}

	const companyId = String(inserted.id);
	const { error: branchError } = await supabaseAdmin.from("branches").insert({
		company_id: companyId,
		name: "Principal",
		slug: "principal",
		is_active: true,
	});
	const { error: infoError } = branchError
		? { error: null }
		: await supabaseAdmin.from("business_info").insert({ company_id: companyId, name: businessName, schedule: null });

	if (branchError || infoError) {
		console.error("store draft incompleta, se deshace:", { companyId, branch: branchError?.message, businessInfo: infoError?.message });
		await discardStoreDraftCompany(supabaseAdmin, companyId);
		return { ok: false, status: 500, code: "error", error: STORE_DRAFT_CREATE_FAILED };
	}

	return { ok: true, companyId, slug };
}

/**
 * Borra una tienda en vista previa recién creada cuando el resto de «Crear mi tienda»
 * falló: la fila del dueño, `business_info`, la sucursal y la empresa, en ese orden (hijos
 * primero, por si las claves no borran en cascada). Sigue aunque un paso falle y devuelve
 * `false` si la empresa quedó: el error queda en el log para limpiarla a mano.
 */
export async function discardStoreDraftCompany(supabaseAdmin: SupabaseClient, companyId: string): Promise<boolean> {
	const problems: string[] = [];
	for (const table of ["users", "business_info", "branches"] as const) {
		const { error } = await supabaseAdmin.from(table).delete().eq("company_id", companyId);
		if (error) problems.push(`${table}: ${error.message}`);
	}
	const { error: companyError } = await supabaseAdmin.from("companies").delete().eq("id", companyId);
	if (companyError) problems.push(`companies: ${companyError.message}`);
	if (problems.length > 0) console.error("store draft discard:", { companyId, problems });
	return !companyError;
}

export type OpenStoreDraftResult = { opened: boolean; slug: string | null };

/**
 * Pago confirmado: la tienda en vista previa pasa a ser pública. Fija el plan pagado, le da
 * lo que trae ese plan (acceso al panel y, con «solo menú digital», el canal WhatsApp: ver
 * `buildPlanProductModePatch`) y cierra la marca con `openedAt`, todo en una escritura.
 * Idempotente: si la tienda no venía de un borrador o ya estaba abierta, no toca nada.
 *
 * La suscripción (`active` y vencimiento) la activa quien llama, antes de esto.
 */
export async function openStoreDraft(
	supabaseAdmin: SupabaseClient,
	params: { companyId: string; planId: string | null | undefined; now?: Date },
): Promise<OpenStoreDraftResult> {
	const { data: company } = await supabaseAdmin
		.from("companies")
		.select("id,public_slug,theme_config,integration_settings,subscription_status")
		.eq("id", params.companyId)
		.maybeSingle();
	if (!company) return { opened: false, slug: null };
	const slug = (company.public_slug as string | null) ?? null;
	const draft = readStoreDraft(company.theme_config);
	if (!draft || draft.openedAt) return { opened: false, slug };

	let planFeatures: unknown = null;
	if (params.planId && params.planId !== "custom") {
		const { data: plan, error: planError } = await supabaseAdmin.from("plans").select("features").eq("id", params.planId).maybeSingle();
		if (planError) {
			// Sin las features no se sabe qué panel darle: se reintenta (cierre del alta o el cron).
			console.error("open store draft: plan", { companyId: params.companyId, planId: params.planId, error: planError.message });
			return { opened: false, slug };
		}
		planFeatures = plan?.features ?? null;
	}

	// Con `openedAt` puesto la tienda ya no cuenta como vista previa y recibe el panel del plan.
	const productMode = buildPlanProductModePatch(
		{
			theme_config: withStoreDraftOpened(company.theme_config, params.now),
			integration_settings: company.integration_settings,
			subscription_status: company.subscription_status as string | null,
		},
		planFeatures,
	);

	const { error } = await supabaseAdmin
		.from("companies")
		.update({
			theme_config: productMode.theme_config,
			...(productMode.integration_settings ? { integration_settings: productMode.integration_settings } : {}),
			...(params.planId ? { plan_id: params.planId } : {}),
			updated_at: (params.now ?? new Date()).toISOString(),
		})
		.eq("id", params.companyId);
	if (error) {
		console.error("open store draft:", error);
		return { opened: false, slug };
	}

	await requestTenantRevalidation(params.companyId, slug);
	return { opened: true, slug };
}

/**
 * Pide a la app principal que borre su caché de la tienda (la página pública guarda la
 * empresa 5 minutos). El servicio de alta corre aparte y no puede hacerlo él mismo; si
 * esto falla, la tienda se ve igual al vencer esa caché.
 */
export async function requestTenantRevalidation(companyId: string, slug: string | null): Promise<void> {
	const secret = process.env.REVALIDATION_SECRET?.trim();
	if (!secret) return;
	try {
		await fetch(`${getAppUrl()}/api/revalidate-menu`, {
			method: "POST",
			headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
			body: JSON.stringify({ companyId, table: "companies", slug: slug ?? undefined }),
			signal: AbortSignal.timeout(5_000),
		});
	} catch (error) {
		console.error("tenant revalidation:", error);
	}
}

/** ¿La tienda de esta empresa sigue en vista previa? (lectura directa, sin caché). */
export async function loadStoreDraftState(
	supabaseAdmin: SupabaseClient,
	companyId: string,
): Promise<{ pending: boolean; fromDraft: boolean; slug: string | null }> {
	const { data } = await supabaseAdmin
		.from("companies")
		.select("public_slug,subscription_status,theme_config")
		.eq("id", companyId)
		.maybeSingle();
	if (!data) return { pending: false, fromDraft: false, slug: null };
	return {
		pending: isStoreDraftPending(data),
		fromDraft: Boolean(readStoreDraft(data.theme_config)),
		slug: (data.public_slug as string | null) ?? null,
	};
}
