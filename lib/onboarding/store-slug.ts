import type { SupabaseClient } from "@supabase/supabase-js";

import { MAIN_DOMAIN_RESERVED_PATH_SEGMENTS } from "@/lib/tenant/reserved-path-segments";
import { slugify } from "../../utils/slugify";

/**
 * El link de la tienda (`godcode.me/<link>`): una sola regla para el alta, «Crear mi tienda»
 * y su formulario. Antes había tres (máx. 48 o 80, sufijo desde `-1` o `-2`) y el link que
 * sugería el paso 2 no era el que después se creaba.
 *
 * Sin imports de servidor: lo usa también el formulario del navegador (`StoreStartForm`).
 * Las funciones que consultan la base reciben el cliente por parámetro.
 */

export const STORE_SLUG_MIN = 3;
export const STORE_SLUG_MAX = 48;

/** Además de las rutas del sitio: nombres que confundirían si fueran una tienda. */
const EXTRA_RESERVED_SLUGS = new Set(["www", "app", "admin", "menu", "mi-cuenta", "soporte", "ayuda", "gcode", "godcode", "super-admin", "negocios", "precios", "demo", "blog"]);

/** Letras y números en minúscula, sin acentos, separados por guiones; como mucho 48. */
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

/** Raíz de las sugerencias a partir de un nombre: nunca vacía ni más corta que el mínimo. */
export function storeSlugRoot(name: string): string {
	const base = normalizeStoreSlug(name) || "mi-tienda";
	return base.length < STORE_SLUG_MIN ? `${base}-tienda` : base;
}

/**
 * El n-ésimo candidato: `rica-pizza`, `rica-pizza-2`, `rica-pizza-3`… La raíz se recorta
 * para que el sufijo quepa en el máximo.
 */
export function storeSlugCandidate(root: string, n: number): string {
	if (n <= 1) return root.slice(0, STORE_SLUG_MAX);
	const suffix = `-${n}`;
	return `${root.slice(0, STORE_SLUG_MAX - suffix.length).replace(/-+$/g, "")}${suffix}`;
}

/**
 * Si la consulta falla responde «libre»: es solo un aviso, y el insert de la empresa choca
 * con el índice único de `public_slug` (23505), que quien crea la tienda ya maneja.
 */
export async function isStoreSlugTaken(supabaseAdmin: SupabaseClient, slug: string): Promise<boolean> {
	const { data } = await supabaseAdmin.from("companies").select("id").eq("public_slug", slug).maybeSingle();
	return Boolean(data);
}

const MAX_SLUG_ATTEMPTS = 50;

/** Primer link libre a partir de un nombre (`rica-pizza`, `rica-pizza-2`…). */
export async function findAvailableStoreSlug(supabaseAdmin: SupabaseClient, name: string): Promise<string> {
	const root = storeSlugRoot(name);
	for (let n = 1; n <= MAX_SLUG_ATTEMPTS; n += 1) {
		const candidate = storeSlugCandidate(root, n);
		if (isReservedStoreSlug(candidate)) continue;
		if (!(await isStoreSlugTaken(supabaseAdmin, candidate))) return candidate;
	}
	// Muy improbable: 50 tiendas con el mismo nombre. Un sufijo al azar corta la búsqueda.
	const suffix = `-${Date.now().toString(36).slice(-6)}`;
	return `${root.slice(0, STORE_SLUG_MAX - suffix.length).replace(/-+$/g, "")}${suffix}`;
}
