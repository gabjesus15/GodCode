import type { SupabaseClient } from "@supabase/supabase-js";

import type { MenuDraft } from "./menu-draft";
import { isSampleProduct, SAMPLE_CATEGORY_NAMES } from "./sample-menus";

/**
 * Crea categorías y productos con las mismas RPC que usa la Caja al crearlos a mano
 * (`admin_create_category_with_overrides` y `admin_upsert_product_with_branch`), con la
 * sesión del dueño: los permisos los decide la base igual que en la Caja.
 *
 * - `userClient`: cliente con la sesión del dueño (para las RPC y los borrados).
 * - `adminClient`: solo para leer lo que ya existe, filtrado por `companyId`.
 *
 * Contrato con la base. Estas RPC no están versionadas en este repo: viven en el repo del
 * Panel (Caja). Firmas que este archivo asume, según types/supabase-database.ts (tipos
 * generados el 19-09-2026). Si el Panel cambia una, la carga de la carta falla con el error
 * de PostgREST en `errors`, no en silencio:
 *
 *   admin_create_category_with_overrides(
 *     p_name text, p_branch_id uuid,
 *     p_order integer (opcional; aquí null), p_is_active boolean (opcional)
 *   ) → id de la categoría (texto). No se usa: se vuelve a leer por nombre.
 *
 *   admin_upsert_product_with_branch(
 *     p_product_id uuid (null para crear),
 *     p_name text, p_description text, p_image_url text,
 *     p_category_id uuid, p_branch_id uuid,
 *     p_price numeric (aquí va como texto, «12.5»: PostgREST lo convierte),
 *     p_has_discount boolean, p_discount_price numeric,
 *     p_is_active boolean, p_is_special boolean,
 *     p_apply_to_all_branches boolean (opcional)
 *   ) → id del producto (texto).
 *
 *   admin_delete_product_with_branch(p_product_id uuid) → nada.
 *
 * Se llaman con la sesión del dueño porque se asume que validan los permisos con
 * `auth.uid()`, como en la Caja; con la service role esa validación no tendría a quién mirar.
 */

type Clients = { userClient: SupabaseClient; adminClient: SupabaseClient; companyId: string };

export type CreateMenuItemsResult = {
	categoriesCreated: number;
	productsCreated: number;
	/** Productos que ya existían con el mismo nombre en esa categoría. */
	skipped: number;
	errors: string[];
};

type CategoryRow = { id: string; name: string | null };
type ProductRow = { id: string; name: string | null; description: string | null; category_id: string | null };

const CONCURRENCY = 4;

function key(value: string | null | undefined): string {
	return String(value ?? "").trim().toLocaleLowerCase("es");
}

/** Sucursal con la que se llaman las RPC: la más antigua activa (la «Principal» del alta). */
export async function resolveMenuBranchId(adminClient: SupabaseClient, companyId: string): Promise<string | null> {
	const { data } = await adminClient
		.from("branches")
		.select("id,is_active")
		.eq("company_id", companyId)
		.order("created_at", { ascending: true })
		.limit(20);
	const rows = (data ?? []) as Array<{ id: string; is_active: boolean | null }>;
	return (rows.find((b) => b.is_active !== false) ?? rows[0])?.id ?? null;
}

async function loadCategories(adminClient: SupabaseClient, companyId: string): Promise<Map<string, string>> {
	const { data, error } = await adminClient.from("categories").select("id,name").eq("company_id", companyId);
	if (error) throw new Error(error.message);
	const map = new Map<string, string>();
	for (const row of (data ?? []) as CategoryRow[]) {
		if (!map.has(key(row.name))) map.set(key(row.name), row.id);
	}
	return map;
}

async function loadProducts(adminClient: SupabaseClient, companyId: string): Promise<ProductRow[]> {
	const { data, error } = await adminClient
		.from("products")
		.select("id,name,description,category_id")
		.eq("company_id", companyId)
		.limit(5000);
	if (error) throw new Error(error.message);
	return (data ?? []) as ProductRow[];
}

async function runPool<T>(items: T[], worker: (item: T) => Promise<void>): Promise<void> {
	let next = 0;
	const lanes = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
		while (next < items.length) {
			const item = items[next++];
			await worker(item);
		}
	});
	await Promise.all(lanes);
}

export async function createMenuItems(params: Clients & { draft: MenuDraft }): Promise<CreateMenuItemsResult> {
	const { userClient, adminClient, companyId, draft } = params;
	const result: CreateMenuItemsResult = { categoriesCreated: 0, productsCreated: 0, skipped: 0, errors: [] };

	const branchId = await resolveMenuBranchId(adminClient, companyId);
	if (!branchId) {
		result.errors.push("Tu negocio no tiene sucursales: crea una en «Sucursales» y vuelve a intentarlo.");
		return result;
	}

	let categories = await loadCategories(adminClient, companyId);
	const missing = draft.categories.filter((c) => !categories.has(key(c.name)));
	for (const category of missing) {
		const { error } = await userClient.rpc("admin_create_category_with_overrides", {
			p_name: category.name,
			p_branch_id: branchId,
			p_order: null,
			p_is_active: true,
		});
		if (error) result.errors.push(`Categoría «${category.name}»: ${error.message}`);
		else result.categoriesCreated += 1;
	}
	if (missing.length > 0) categories = await loadCategories(adminClient, companyId);

	const existing = new Set((await loadProducts(adminClient, companyId)).map((p) => `${p.category_id}\u0000${key(p.name)}`));
	const jobs: Array<{ categoryId: string; name: string; description: string; price: number }> = [];
	for (const category of draft.categories) {
		const categoryId = categories.get(key(category.name));
		if (!categoryId) continue; // su error ya quedó anotado arriba
		for (const product of category.products) {
			if (existing.has(`${categoryId}\u0000${key(product.name)}`)) {
				result.skipped += 1;
				continue;
			}
			jobs.push({ categoryId, ...product });
		}
	}

	await runPool(jobs, async (job) => {
		const { error } = await userClient.rpc("admin_upsert_product_with_branch", {
			p_product_id: null,
			p_name: job.name,
			p_description: job.description || null,
			p_image_url: null,
			p_category_id: job.categoryId,
			p_branch_id: branchId,
			p_price: String(job.price),
			p_has_discount: false,
			p_discount_price: null,
			p_is_active: true,
			p_is_special: false,
			p_apply_to_all_branches: true,
		});
		if (error) result.errors.push(`«${job.name}»: ${error.message}`);
		else result.productsCreated += 1;
	});

	return result;
}

export type DeleteSamplesResult = { productsDeleted: number; categoriesDeleted: number; errors: string[] };

/**
 * Borra los productos de ejemplo que el dueño no cambió y, después, las categorías de
 * ejemplo que quedaron vacías. Lo editado o creado por el dueño no se toca.
 */
export async function deleteSampleItems(params: Clients): Promise<DeleteSamplesResult> {
	const { userClient, adminClient, companyId } = params;
	const result: DeleteSamplesResult = { productsDeleted: 0, categoriesDeleted: 0, errors: [] };

	const products = await loadProducts(adminClient, companyId);
	const samples = products.filter((p) => isSampleProduct(p.name, p.description));
	await runPool(samples, async (product) => {
		const { error } = await userClient.rpc("admin_delete_product_with_branch", { p_product_id: product.id });
		if (error) result.errors.push(`«${product.name}»: ${error.message}`);
		else result.productsDeleted += 1;
	});

	const remaining = await loadProducts(adminClient, companyId);
	const used = new Set(remaining.map((p) => p.category_id).filter(Boolean));
	const { data: categoryRows } = await adminClient.from("categories").select("id,name").eq("company_id", companyId);
	for (const category of (categoryRows ?? []) as CategoryRow[]) {
		if (used.has(category.id) || !SAMPLE_CATEGORY_NAMES.has(key(category.name))) continue;
		const { error } = await userClient.from("categories").delete().eq("id", category.id).eq("company_id", companyId);
		if (error) result.errors.push(`Categoría «${category.name}»: ${error.message}`);
		else result.categoriesDeleted += 1;
	}
	return result;
}

export type MenuStatus = { productCount: number; sampleCount: number; categoryCount: number };

export async function getMenuStatus(adminClient: SupabaseClient, companyId: string): Promise<MenuStatus> {
	const [products, categories] = await Promise.all([
		loadProducts(adminClient, companyId).catch(() => [] as ProductRow[]),
		adminClient.from("categories").select("id", { count: "exact", head: true }).eq("company_id", companyId),
	]);
	return {
		productCount: products.length,
		sampleCount: products.filter((p) => isSampleProduct(p.name, p.description)).length,
		categoryCount: categories.count ?? 0,
	};
}
