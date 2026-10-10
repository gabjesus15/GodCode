import type { SupabaseClient } from "@supabase/supabase-js";

import { isStoreDraftPending, readStoreDraft, STORE_DRAFT_PURGE_DAY, storeDraftAgeDays } from "@/lib/tenant/store-draft";

import { openStoreDraft, requestTenantRevalidation } from "./store-draft-service";

/**
 * Lo que el cron diario hace con las tiendas en vista previa («Arma y paga»):
 * - Cerrar la marca de las que ya se pagaron y quedaron a medias (activas sin `openedAt`):
 *   sin eso el dueño no recibe el acceso al panel que trae su plan.
 * - Borrar las que llevan 30 días sin publicarse, para liberar el link: catálogo, empresa,
 *   dueño y archivos en Storage (`purgeStoreDraft`). Antes se avisa a los 23 días
 *   (`lifecycle-plan`). Una con el pago en revisión no se borra.
 *
 * STORE_DRAFT_PURGE: `dry-run` (por defecto: solo cuenta lo que borraría), `on` u `off`.
 * El aviso de los 23 días sale solo con `on`: no se avisa de un borrado que no va a pasar.
 */

export type StoreDraftPurgeMode = "on" | "dry-run" | "off";

export function storeDraftPurgeMode(): StoreDraftPurgeMode {
	const raw = String(process.env.STORE_DRAFT_PURGE ?? "").trim().toLowerCase();
	if (["on", "true", "1", "yes"].includes(raw)) return "on";
	if (["off", "false", "0", "no"].includes(raw)) return "off";
	return "dry-run";
}

export type PendingStoreDraft = {
	companyId: string;
	slug: string | null;
	country: string | null;
	since: string;
	/** Comprobante del alta en revisión (Venezuela, transferencia): se publica sola al validarlo. */
	paymentInReview: boolean;
};

const MAX_DRAFTS = 1000;
const ID_CHUNK = 100;

/** Tiendas en vista previa sin publicar, con lo que hace falta para avisar o borrar. */
export async function loadPendingStoreDrafts(client: SupabaseClient): Promise<{ drafts: PendingStoreDraft[]; error?: string }> {
	const { data, error } = await client
		.from("companies")
		.select("id,public_slug,country,subscription_status,store_draft:theme_config->storeDraft")
		.eq("subscription_status", "trial")
		.is("subscription_ends_at", null)
		.not("theme_config->storeDraft", "is", null)
		.limit(MAX_DRAFTS);
	if (error) return { drafts: [], error: `borradores: ${error.message}` };

	const rows = ((data ?? []) as Array<{ id: string; public_slug: string | null; country: string | null; subscription_status: string | null; store_draft: unknown }>)
		.map((row) => ({ row, theme: { storeDraft: row.store_draft } }))
		.filter(({ row, theme }) => isStoreDraftPending({ subscription_status: row.subscription_status, theme_config: theme }));
	if (rows.length === 0) return { drafts: [] };

	const inReview = new Set<string>();
	const ids = rows.map(({ row }) => String(row.id));
	for (let i = 0; i < ids.length; i += ID_CHUNK) {
		const { data: apps, error: appsError } = await client
			.from("onboarding_applications")
			.select("company_id,payment_status,payment_reference_url")
			.in("company_id", ids.slice(i, i + ID_CHUNK));
		if (appsError) return { drafts: [], error: `solicitudes de borradores: ${appsError.message}` };
		for (const app of (apps ?? []) as Array<{ company_id: string | null; payment_status: string | null; payment_reference_url: string | null }>) {
			if (app.company_id && app.payment_status === "pending_validation" && String(app.payment_reference_url ?? "").trim()) {
				inReview.add(app.company_id);
			}
		}
	}

	return {
		drafts: rows.map(({ row, theme }) => ({
			companyId: String(row.id),
			slug: row.public_slug ?? null,
			country: row.country ?? null,
			since: readStoreDraft(theme)?.since ?? "",
			paymentInReview: inReview.has(String(row.id)),
		})),
	};
}

export type StoreDraftJobsSummary = {
	purge_mode: StoreDraftPurgeMode;
	healed: number;
	/** Borradores de 30 días o más (en `dry-run`, los que se borrarían). */
	purge_due: number;
	purged: number;
	errors: string[];
};

/** Tiendas pagadas cuya marca quedó sin cerrar: se abren con el plan que tienen. */
async function healOpenedDrafts(client: SupabaseClient, now: Date, summary: StoreDraftJobsSummary): Promise<void> {
	const { data, error } = await client
		.from("companies")
		.select("id,plan_id")
		.eq("subscription_status", "active")
		.not("theme_config->storeDraft", "is", null)
		.is("theme_config->storeDraft->>openedAt", null)
		.limit(200);
	if (error) {
		summary.errors.push(`tiendas por abrir: ${error.message}`);
		return;
	}
	for (const row of (data ?? []) as Array<{ id: string; plan_id: string | null }>) {
		const result = await openStoreDraft(client, { companyId: String(row.id), planId: row.plan_id, now });
		if (result.opened) summary.healed += 1;
	}
}

type DbError = { message: string; code?: string | null };

/** Una tabla que todavía no existe en la base (migración sin correr) no tiene nada que borrar. */
function isMissingTableError(error: DbError): boolean {
	return error.code === "42P01" || error.code === "PGRST205" || /does not exist|could not find the table/i.test(error.message);
}

/**
 * Borra el catálogo y lo demás que el dueño armó en la vista previa («Configura tu tienda»,
 * carga de la carta, tema, banners), hijos primero. Devuelve los errores sin cortar: cada
 * paso que falla queda en el resumen del cron y se intenta el siguiente.
 *
 * Qué depende de ON DELETE CASCADE: `product_sizes` y `product_variants` cascadean desde
 * `products`, `branches` y `companies` (el SQL de tamaños y variantes de octubre de 2026). El resto (`products`, `categories`, `product_branch`,
 * `product_prices`, `category_branch`, `product_extras_*`, `product_upsell_beverages`,
 * `product_inventory_recipe`, `hero_banners`, `company_theme_*`) lo creó el repo del Panel y
 * no sabemos si cascadea; algunas tienen `company_id` sin clave foránea y quedarían
 * huérfanas al borrar la empresa. Por eso se borran a mano. Lo que no está aquí (tickets,
 * registro de correos, pagos) depende de la cascada o de `on delete set null`: si alguna lo
 * impide, el borrado de la empresa falla, queda en el resumen y la tienda sigue entera salvo
 * este catálogo.
 */
async function deleteStoreDraftCatalog(client: SupabaseClient, companyId: string): Promise<string[]> {
	const problems: string[] = [];
	const step = async (label: string, query: PromiseLike<{ error: DbError | null }>) => {
		const { error } = await query;
		if (error && !isMissingTableError(error)) problems.push(`${label}: ${error.message}`);
	};
	const ids = async (label: string, query: PromiseLike<{ data: unknown; error: DbError | null }>): Promise<string[]> => {
		const { data, error } = await query;
		if (error) {
			if (!isMissingTableError(error)) problems.push(`${label}: ${error.message}`);
			return [];
		}
		return ((data ?? []) as Array<{ id: unknown }>).map((row) => String(row.id));
	};

	const productIds = await ids("productos", client.from("products").select("id").eq("company_id", companyId).limit(5000));
	for (let i = 0; i < productIds.length; i += ID_CHUNK) {
		const chunk = productIds.slice(i, i + ID_CHUNK);
		const groupIds = await ids("grupos de extras", client.from("product_extras_groups").select("id").in("product_id", chunk));
		for (let j = 0; j < groupIds.length; j += ID_CHUNK) {
			await step("opciones de extras", client.from("product_extras_options").delete().in("group_id", groupIds.slice(j, j + ID_CHUNK)));
		}
		await step("grupos de extras", client.from("product_extras_groups").delete().in("product_id", chunk));
		await step("bebidas sugeridas", client.from("product_upsell_beverages").delete().in("product_id", chunk));
		await step("bebidas sugeridas", client.from("product_upsell_beverages").delete().in("beverage_product_id", chunk));
		await step("recetas de inventario", client.from("product_inventory_recipe").delete().in("product_id", chunk));
		await step("precios", client.from("product_prices").delete().in("product_id", chunk));
		await step("productos por sucursal", client.from("product_branch").delete().in("product_id", chunk));
	}
	await step("tamaños", client.from("product_sizes").delete().eq("company_id", companyId));
	await step("variantes", client.from("product_variants").delete().eq("company_id", companyId));
	await step("productos", client.from("products").delete().eq("company_id", companyId));

	const categoryIds = await ids("categorías", client.from("categories").select("id").eq("company_id", companyId).limit(5000));
	for (let i = 0; i < categoryIds.length; i += ID_CHUNK) {
		await step("categorías por sucursal", client.from("category_branch").delete().in("category_id", categoryIds.slice(i, i + ID_CHUNK)));
	}
	await step("categorías", client.from("categories").delete().eq("company_id", companyId));

	await step("banners", client.from("hero_banners").delete().eq("company_id", companyId));
	await step("borrador del tema", client.from("company_theme_drafts").delete().eq("company_id", companyId));
	await step("versiones del tema", client.from("company_theme_versions").delete().eq("company_id", companyId));
	return problems;
}

/**
 * Mismo bucket que `STOREFRONT_BRANDING_BUCKET` (lib/storage/storefront-branding.ts). No se
 * importa de ahí: ese módulo es server-only y depende de components/, que el servicio de
 * alta (donde también corre este cron) no trae.
 */
const STOREFRONT_BUCKET = "menu";
const SAFE_STORAGE_PREFIX = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
const STORAGE_PAGE = 100;
const MAX_STORAGE_PAGES = 20;
const MAX_STORAGE_DEPTH = 6;
const MAX_STORAGE_FILES = 2000;

/**
 * Archivos de la tienda en Storage: todo lo que cuelga de `<companyId>/` en el bucket
 * `menu` (logo, fondo y portada en `storefront/branding/…`). Las fotos de productos se suben
 * a `uploads/…`, sin la empresa en la ruta, y pueden ser compartidas: no se tocan. Se borra
 * después de la empresa: si su borrado falla, la tienda conserva sus imágenes.
 */
async function deleteStoreDraftFiles(client: SupabaseClient, companyId: string): Promise<string[]> {
	if (!SAFE_STORAGE_PREFIX.test(companyId)) return [`archivos: id de empresa no válido para Storage (${companyId})`];
	const bucket = client.storage.from(STOREFRONT_BUCKET);
	const files: string[] = [];
	const problems: string[] = [];

	const walk = async (prefix: string, depth: number): Promise<void> => {
		if (depth > MAX_STORAGE_DEPTH) return;
		for (let page = 0; page < MAX_STORAGE_PAGES && files.length < MAX_STORAGE_FILES; page += 1) {
			const { data, error } = await bucket.list(prefix, { limit: STORAGE_PAGE, offset: page * STORAGE_PAGE });
			if (error) {
				problems.push(`archivos (${prefix}): ${error.message}`);
				return;
			}
			const entries = data ?? [];
			for (const entry of entries) {
				const path = `${prefix}/${entry.name}`;
				// Las carpetas vienen sin id.
				if (entry.id) files.push(path);
				else await walk(path, depth + 1);
				if (files.length >= MAX_STORAGE_FILES) return;
			}
			if (entries.length < STORAGE_PAGE) return;
		}
	};
	await walk(companyId, 0);

	for (let i = 0; i < files.length; i += STORAGE_PAGE) {
		const { error } = await bucket.remove(files.slice(i, i + STORAGE_PAGE));
		if (error) problems.push(`archivos: ${error.message}`);
	}
	if (files.length >= MAX_STORAGE_FILES) problems.push(`archivos: quedaron más de ${MAX_STORAGE_FILES}, se borran en la próxima corrida`);
	return problems;
}

export type PurgeStoreDraftResult = {
	ok: boolean;
	/** Por qué no se borró la tienda. */
	error?: string;
	/** Lo que no se pudo limpiar aunque la tienda se borró (o antes de que fallara). */
	warnings: string[];
};

/**
 * Borra una tienda en vista previa: su catálogo, la empresa (con lo que cuelga de ella), sus
 * filas de `users`, la cuenta de Auth si no es dueño de otro local y sus archivos en
 * Storage. La solicitud vuelve a «correo confirmado» sin empresa: si regresa, «Retomar mi
 * registro» lo lleva a crear su tienda de nuevo (no se toca `updated_at`, así no recibe los
 * avisos de alta a medias). Vuelve a leer la empresa antes: si se pagó entre medio, no la
 * toca.
 */
export async function purgeStoreDraft(client: SupabaseClient, companyId: string, now = new Date()): Promise<PurgeStoreDraftResult> {
	const warnings: string[] = [];
	const { data: company, error: readError } = await client
		.from("companies")
		.select("id,public_slug,subscription_status,theme_config")
		.eq("id", companyId)
		.maybeSingle();
	if (readError) return { ok: false, error: `empresa: ${readError.message}`, warnings };
	if (!company || !isStoreDraftPending(company)) return { ok: false, error: "Ya no es una tienda en vista previa", warnings };
	const draft = readStoreDraft(company.theme_config);
	if (!draft || storeDraftAgeDays(draft, now) < STORE_DRAFT_PURGE_DAY) return { ok: false, error: "Todavía no cumple 30 días", warnings };

	const { data: members } = await client.from("users").select("id,auth_user_id").eq("company_id", companyId);
	const memberRows = (members ?? []) as Array<{ id: string; auth_user_id: string | null }>;
	const authIds = [...new Set(memberRows.map((m) => m.auth_user_id).filter((id): id is string => Boolean(id)))];
	const { data: apps } = await client.from("onboarding_applications").select("id,status").eq("company_id", companyId);
	const appRows = (apps ?? []) as Array<{ id: string; status: string | null }>;

	// La solicitud se suelta primero: si no, su referencia a la empresa impide borrarla. Si no
	// se puede, no se borra nada.
	if (appRows.length > 0) {
		const { error } = await client
			.from("onboarding_applications")
			.update({ status: "email_verified", company_id: null })
			.in("id", appRows.map((a) => a.id));
		if (error) return { ok: false, error: `solicitud: ${error.message}`, warnings };
	}

	const note = async (label: string, query: PromiseLike<{ error: DbError | null }>) => {
		const { error } = await query;
		if (error) warnings.push(`${label}: ${error.message}`);
	};

	warnings.push(...(await deleteStoreDraftCatalog(client, companyId)));

	let { error: companyError } = await client.from("companies").delete().eq("id", companyId);
	if (companyError) {
		// Sin borrado en cascada: primero lo que cuelga de la empresa.
		if (memberRows.length > 0) await note("usuarios", client.from("users").delete().in("id", memberRows.map((m) => m.id)));
		await note("datos del negocio", client.from("business_info").delete().eq("company_id", companyId));
		await note("sucursales", client.from("branches").delete().eq("company_id", companyId));
		({ error: companyError } = await client.from("companies").delete().eq("id", companyId));
	}
	if (companyError) {
		for (const app of appRows) {
			await note(
				`solicitud ${app.id} sin volver a atar`,
				client.from("onboarding_applications").update({ status: app.status, company_id: companyId }).eq("id", app.id),
			);
		}
		return { ok: false, error: `empresa: ${companyError.message}`, warnings };
	}
	if (memberRows.length > 0) await note("usuarios", client.from("users").delete().in("id", memberRows.map((m) => m.id)));

	for (const authId of authIds) {
		const { count, error } = await client.from("users").select("id", { count: "exact", head: true }).eq("auth_user_id", authId);
		if (error) {
			warnings.push(`cuenta ${authId}: ${error.message}`);
			continue;
		}
		if ((count ?? 0) === 0) {
			const { error: deleteError } = await client.auth.admin.deleteUser(authId).catch((e: unknown) => ({
				error: { message: e instanceof Error ? e.message : String(e) },
			}));
			if (deleteError) warnings.push(`cuenta ${authId}: ${deleteError.message}`);
		}
	}

	warnings.push(...(await deleteStoreDraftFiles(client, companyId)));

	await requestTenantRevalidation(companyId, (company.public_slug as string | null) ?? null);
	return { ok: true, warnings };
}

export async function runStoreDraftJobs(params: {
	supabaseAdmin: SupabaseClient;
	now?: Date;
	mode?: StoreDraftPurgeMode;
	deadlineMs?: number;
}): Promise<StoreDraftJobsSummary> {
	const client = params.supabaseAdmin;
	const now = params.now ?? new Date();
	const mode = params.mode ?? storeDraftPurgeMode();
	const summary: StoreDraftJobsSummary = { purge_mode: mode, healed: 0, purge_due: 0, purged: 0, errors: [] };

	await healOpenedDrafts(client, now, summary);
	if (mode === "off") return summary;

	const { drafts, error } = await loadPendingStoreDrafts(client);
	if (error) summary.errors.push(error);
	const due = drafts.filter((d) => !d.paymentInReview && d.since && storeDraftAgeDays(d, now) >= STORE_DRAFT_PURGE_DAY);
	summary.purge_due = due.length;
	if (mode !== "on") return summary;

	for (const draft of due) {
		if (params.deadlineMs != null && Date.now() > params.deadlineMs) break;
		const label = draft.slug ?? draft.companyId;
		const result = await purgeStoreDraft(client, draft.companyId, now).catch((e: unknown) => ({
			ok: false,
			error: e instanceof Error ? e.message : String(e),
			warnings: [] as string[],
		}));
		if (result.ok) summary.purged += 1;
		else if (result.error) summary.errors.push(`${label}: ${result.error}`);
		// Lo que no se pudo limpiar no corta el resto: queda anotado para revisarlo.
		for (const warning of result.warnings) summary.errors.push(`${label}: ${warning}`);
	}
	return summary;
}
