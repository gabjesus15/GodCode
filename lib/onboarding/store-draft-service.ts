import type { SupabaseClient } from "@supabase/supabase-js";

import { buildCompanyPanelAccessFromPlanFeatures } from "@/lib/super-admin/company-panel-access";
import { getAppUrl } from "@/lib/tenant/app-url";
import { MAIN_DOMAIN_RESERVED_PATH_SEGMENTS } from "@/lib/tenant/reserved-path-segments";
import { isStoreDraftPending, readStoreDraft, withStoreDraft, withStoreDraftOpened } from "@/lib/tenant/store-draft";
import { slugify } from "../../utils/slugify";
import { initialStoreTheme } from "./checkout-service";

/**
 * Lado servidor de «Arma y paga»: crear la tienda en vista previa al registrarse y
 * abrirla al público cuando se confirma el pago. Lo usan el servicio de alta y el cron.
 */

export const STORE_SLUG_MIN = 3;
export const STORE_SLUG_MAX = 48;

/** Además de las rutas del sitio: nombres que confundirían si fueran una tienda. */
const EXTRA_RESERVED_SLUGS = new Set(["www", "app", "admin", "menu", "mi-cuenta", "soporte", "ayuda", "gcode", "godcode", "super-admin", "negocios", "precios", "demo", "blog"]);

export function normalizeStoreSlug(raw: string | null | undefined): string {
	return slugify(String(raw ?? ""), { maxLength: STORE_SLUG_MAX }).replace(/^-+|-+$/g, "");
}

export function isReservedStoreSlug(slug: string): boolean {
	return MAIN_DOMAIN_RESERVED_PATH_SEGMENTS.has(slug) || EXTRA_RESERVED_SLUGS.has(slug);
}

/** Motivo por el que el link no sirve (sin mirar la base), o `null` si el formato está bien. */
export function storeSlugProblem(slug: string): "short" | "reserved" | null {
	if (slug.length < STORE_SLUG_MIN) return "short";
	if (isReservedStoreSlug(slug)) return "reserved";
	return null;
}

export async function isStoreSlugTaken(supabaseAdmin: SupabaseClient, slug: string): Promise<boolean> {
	const { data } = await supabaseAdmin.from("companies").select("id").eq("public_slug", slug).maybeSingle();
	return Boolean(data);
}

/** Primer link libre a partir de un nombre (`rica-pizza`, `rica-pizza-2`…). */
export async function suggestStoreSlug(supabaseAdmin: SupabaseClient, name: string): Promise<string> {
	const base = normalizeStoreSlug(name) || "mi-tienda";
	const root = base.length < STORE_SLUG_MIN ? `${base}-tienda` : base;
	for (let n = 1; n < 50; n += 1) {
		const candidate = n === 1 ? root : `${root.slice(0, STORE_SLUG_MAX - 4)}-${n}`;
		if (isReservedStoreSlug(candidate)) continue;
		if (!(await isStoreSlugTaken(supabaseAdmin, candidate))) return candidate;
	}
	return `${root.slice(0, STORE_SLUG_MAX - 7)}-${Date.now().toString(36).slice(-6)}`;
}

async function resolveCompanyCreatorId(supabaseAdmin: SupabaseClient): Promise<string | null> {
	const { data } = await supabaseAdmin
		.from("companies")
		.select("created_by")
		.not("created_by", "is", null)
		.order("created_at", { ascending: true })
		.limit(1)
		.maybeSingle();
	return (data?.created_by as string | undefined) ?? null;
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

/**
 * Crea la empresa en vista previa: `trial` sin vencimiento (la RLS pública deja leer su
 * menú, así la vista previa es la tienda real) y `storeDraft` en el tema, que la oculta a
 * todos menos al dueño. Sin acceso al panel de caja: eso llega con el plan pagado.
 */
export async function createStoreDraftCompany(
	supabaseAdmin: SupabaseClient,
	params: { app: StoreDraftApplication; businessName: string; slug: string; sector: string | null; now?: Date },
): Promise<CreateStoreDraftResult> {
	const { app, businessName, slug, sector } = params;
	const createdBy = await resolveCompanyCreatorId(supabaseAdmin);
	if (!createdBy) return { ok: false, status: 503, code: "error", error: "No pudimos crear tu tienda. Intenta en unos minutos." };

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
		return { ok: false, status: 500, code: "error", error: "No pudimos crear tu tienda. Intenta de nuevo." };
	}

	const companyId = String(inserted.id);
	const { error: branchError } = await supabaseAdmin.from("branches").insert({
		company_id: companyId,
		name: "Principal",
		slug: "principal",
		is_active: true,
	});
	if (branchError) console.error("store draft branch insert:", branchError);

	const { error: infoError } = await supabaseAdmin.from("business_info").insert({ company_id: companyId, name: businessName, schedule: null });
	if (infoError) console.error("store draft business_info insert:", infoError);

	return { ok: true, companyId, slug };
}

/** Borra una tienda en vista previa recién creada cuando el resto del alta falló. */
export async function discardStoreDraftCompany(supabaseAdmin: SupabaseClient, companyId: string): Promise<void> {
	await supabaseAdmin.from("business_info").delete().eq("company_id", companyId);
	await supabaseAdmin.from("branches").delete().eq("company_id", companyId);
	await supabaseAdmin.from("companies").delete().eq("id", companyId);
}

export type OpenStoreDraftResult = { opened: boolean; slug: string | null };

/**
 * Pago confirmado: la tienda en vista previa pasa a ser pública. Fija el plan pagado, le da
 * el acceso al panel que trae ese plan y cierra la marca con `openedAt`. Idempotente: si la
 * tienda no venía de un borrador o ya estaba abierta, no toca nada.
 *
 * La suscripción (`active` y vencimiento) la activa quien llama, antes de esto.
 */
export async function openStoreDraft(
	supabaseAdmin: SupabaseClient,
	params: { companyId: string; planId: string | null | undefined; now?: Date },
): Promise<OpenStoreDraftResult> {
	const { data: company } = await supabaseAdmin
		.from("companies")
		.select("id,public_slug,theme_config")
		.eq("id", params.companyId)
		.maybeSingle();
	if (!company) return { opened: false, slug: null };
	const slug = (company.public_slug as string | null) ?? null;
	const draft = readStoreDraft(company.theme_config);
	if (!draft || draft.openedAt) return { opened: false, slug };

	let planFeatures: unknown = null;
	if (params.planId && params.planId !== "custom") {
		const { data: plan } = await supabaseAdmin.from("plans").select("features").eq("id", params.planId).maybeSingle();
		planFeatures = plan?.features ?? null;
	}

	const theme = withStoreDraftOpened(company.theme_config, params.now);
	theme.panelAccess = buildCompanyPanelAccessFromPlanFeatures(planFeatures);

	const { error } = await supabaseAdmin
		.from("companies")
		.update({
			theme_config: theme,
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
