import { revalidateTag } from "next/cache";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { sanitizeAddonUnlockTabs, sanitizePanelModule } from "@/lib/plans/addon-unlocks";

/**
 * Extras a medida que existen en el panel de caja (carpetas de `GodCode-Panel/src/addons/`).
 * El panel publica la lista en `/addons-manifest.json`. Con ella, «Servicios extra» muestra los
 * que aún no están en el catálogo para publicarlos, y «Gestionar empresa › Extras» deja
 * activarlos directo (se agregan solos al catálogo, sin precio).
 */

export type PanelAddonModule = { id: string; label: string; description: string | null };

/**
 * `PANEL_ADDONS_MANIFEST_URL` manda. Si no, en desarrollo el panel local (localhost:5173), que
 * tiene los extras que se están programando aunque el panel de producción todavía no; en
 * producción, `<NEXT_PUBLIC_TENANT_PANEL_URL>/addons-manifest.json`.
 */
export function panelAddonsManifestUrl(): string | null {
	const explicit = process.env.PANEL_ADDONS_MANIFEST_URL?.trim();
	if (explicit) return explicit;
	if (process.env.NODE_ENV === "development") return "http://localhost:5173/addons-manifest.json";
	const panel = (process.env.NEXT_PUBLIC_TENANT_PANEL_URL ?? "").trim().replace(/\/$/, "");
	return panel ? `${panel}/addons-manifest.json` : null;
}

export function parsePanelAddonManifest(raw: unknown): PanelAddonModule[] {
	const list = raw && typeof raw === "object" ? (raw as { addons?: unknown }).addons : null;
	if (!Array.isArray(list)) return [];
	const seen = new Set<string>();
	const out: PanelAddonModule[] = [];
	for (const item of list) {
		if (!item || typeof item !== "object") continue;
		const { id, label, description } = item as Record<string, unknown>;
		const moduleId = sanitizePanelModule(id);
		if (!moduleId || moduleId !== id || seen.has(moduleId)) continue;
		seen.add(moduleId);
		out.push({
			id: moduleId,
			label: typeof label === "string" && label.trim() ? label.trim().slice(0, 120) : moduleId,
			description: typeof description === "string" && description.trim() ? description.trim().slice(0, 500) : null,
		});
	}
	return out;
}

export async function fetchPanelAddonModules(): Promise<{ modules: PanelAddonModule[]; error: string | null }> {
	const url = panelAddonsManifestUrl();
	if (!url) return { modules: [], error: "Falta la URL del panel (NEXT_PUBLIC_TENANT_PANEL_URL)." };
	try {
		const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(4000) });
		if (!res.ok) return { modules: [], error: `El panel respondió ${res.status} al pedir sus extras.` };
		return { modules: parsePanelAddonManifest(await res.json()), error: null };
	} catch {
		return { modules: [], error: "No se pudo leer la lista de extras del panel." };
	}
}

/** Lo que se puede fijar al publicar un extra del panel (lo demás sale del manifest). */
export type PanelAddonCatalogFields = {
	name?: string | null;
	description?: string | null;
	type?: "monthly" | "one_time";
	price_monthly?: number | null;
	price_one_time?: number | null;
	is_active?: boolean;
	unlocks_tabs?: unknown;
	sort_order?: number;
};

export type PanelAddonCatalogResult = { addonId: string; created: boolean } | { error: string; status: number };

export function panelAddonSlug(panelModule: string): string {
	return `panel_${panelModule.replace(/-/g, "_")}`;
}

/**
 * El extra del catálogo que abre ese módulo. Con `companyId`, el de esa empresa manda sobre el
 * de todos; sin él, solo el de todos.
 */
export async function findCatalogAddonForPanelModule(panelModule: string, companyId: string | null = null): Promise<string | null> {
	const { data } = await supabaseAdmin.from("addons").select("id,company_id").eq("panel_module", panelModule);
	const rows = (data ?? []) as Array<{ id: string; company_id: string | null }>;
	const match = (companyId ? rows.find((row) => row.company_id === companyId) : undefined) ?? rows.find((row) => !row.company_id);
	return match?.id ?? null;
}

const money = (value: unknown): number | null => {
	if (value === null || value === undefined || value === "") return null;
	const n = Number(value);
	return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
};

/**
 * Agrega al catálogo (para todos) el extra que abre ese módulo del panel. Tiene que existir en el
 * manifest del panel. Sin `fields` queda sin precio y sin ofrecerse en /cuenta; si ya estaba, lo
 * devuelve tal cual.
 */
export async function createCatalogAddonFromPanelModule(raw: unknown, fields: PanelAddonCatalogFields = {}): Promise<PanelAddonCatalogResult> {
	const panelModule = sanitizePanelModule(raw);
	if (!panelModule) return { error: "Módulo del panel inválido.", status: 400 };

	const existing = await findCatalogAddonForPanelModule(panelModule);
	if (existing) return { addonId: existing, created: false };

	const { modules, error } = await fetchPanelAddonModules();
	const panelAddon = modules.find((item) => item.id === panelModule);
	if (!panelAddon) return { error: error ?? "Ese módulo no existe en el panel.", status: 400 };

	const type = fields.type === "one_time" ? "one_time" : "monthly";
	const slug = panelAddonSlug(panelModule);
	const { data: created, error: insertError } = await supabaseAdmin
		.from("addons")
		.insert({
			slug,
			name: fields.name?.trim().slice(0, 120) || panelAddon.label,
			description: fields.description === undefined ? panelAddon.description : fields.description?.trim().slice(0, 500) || null,
			type,
			price_monthly: type === "monthly" ? money(fields.price_monthly) : null,
			price_one_time: type === "one_time" ? money(fields.price_one_time) : null,
			is_active: fields.is_active === true,
			sort_order: Math.max(0, Number(fields.sort_order) || 500),
			unlocks_tabs: sanitizeAddonUnlockTabs(fields.unlocks_tabs),
			panel_module: panelModule,
			updated_at: new Date().toISOString(),
		})
		.select("id")
		.single();
	if (created) {
		// El catálogo de /cuenta y del registro está cacheado con este tag.
		revalidateTag("tag:addons", "max");
		return { addonId: (created as { id: string }).id, created: true };
	}
	if (insertError?.code === "23505") {
		// Otro pedido lo creó recién: usar ese.
		const { data: bySlug } = await supabaseAdmin.from("addons").select("id").eq("slug", slug).maybeSingle();
		if (bySlug) return { addonId: (bySlug as { id: string }).id, created: false };
	}
	return { error: "No se pudo agregar el extra al catálogo.", status: 500 };
}
