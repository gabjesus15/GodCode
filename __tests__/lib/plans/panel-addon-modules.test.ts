import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createFakeSupabase, type FakeDb } from "../../stubs/fake-supabase";

const holder = vi.hoisted(() => ({ client: null as null | { from: (table: string) => unknown } }));

vi.mock("@/lib/infra/supabase-admin", () => ({
	supabaseAdmin: { from: (table: string) => holder.client?.from(table) },
}));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

import {
	createCatalogAddonFromPanelModule,
	findCatalogAddonForPanelModule,
	panelAddonsManifestUrl,
	parsePanelAddonManifest,
} from "@/lib/plans/panel-addon-modules";

describe("extras publicados por el panel de caja", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("toma solo módulos válidos, sin repetir", () => {
		expect(
			parsePanelAddonManifest({
				addons: [
					{ id: "libro-caja", label: " Libro de caja ", description: "Cuaderno" },
					{ id: "libro-caja", label: "Repetido" },
					{ id: "Mayus", label: "X" },
					{ id: "../otro", label: "X" },
					{ id: "sin-label" },
					null,
				],
			}),
		).toEqual([
			{ id: "libro-caja", label: "Libro de caja", description: "Cuaderno" },
			{ id: "sin-label", label: "sin-label", description: null },
		]);
		expect(parsePanelAddonManifest(null)).toEqual([]);
		expect(parsePanelAddonManifest({ addons: "x" })).toEqual([]);
	});

	it("arma la URL de la lista", () => {
		vi.stubEnv("PANEL_ADDONS_MANIFEST_URL", "https://x.test/lista.json");
		expect(panelAddonsManifestUrl()).toBe("https://x.test/lista.json");
		vi.stubEnv("PANEL_ADDONS_MANIFEST_URL", "");
		vi.stubEnv("NEXT_PUBLIC_TENANT_PANEL_URL", "https://panel.godcode.me/");
		vi.stubEnv("NODE_ENV", "production");
		expect(panelAddonsManifestUrl()).toBe("https://panel.godcode.me/addons-manifest.json");
		// En desarrollo manda el panel local aunque haya URL de producción.
		vi.stubEnv("NODE_ENV", "development");
		expect(panelAddonsManifestUrl()).toBe("http://localhost:5173/addons-manifest.json");
		vi.stubEnv("NEXT_PUBLIC_TENANT_PANEL_URL", "");
		vi.stubEnv("NODE_ENV", "production");
		expect(panelAddonsManifestUrl()).toBeNull();
	});
});

describe("publicar un extra del panel en el catálogo", () => {
	let db: FakeDb;

	beforeEach(() => {
		db = { addons: [{ id: "a-dom", slug: "custom_domain", panel_module: null, company_id: null }] };
		holder.client = createFakeSupabase(db, { unique: { addons: ["slug"] } }).client;
		vi.stubEnv("PANEL_ADDONS_MANIFEST_URL", "https://panel.test/addons-manifest.json");
		vi.stubGlobal(
			"fetch",
			vi.fn(async () =>
				new Response(JSON.stringify({ addons: [{ id: "plantilla-excel", label: "Libro de caja", description: "Cuaderno" }] }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				}),
			),
		);
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		vi.unstubAllGlobals();
	});

	it("rechaza un módulo que no está en el panel", async () => {
		expect(await createCatalogAddonFromPanelModule("otro-extra")).toEqual({ error: "Ese módulo no existe en el panel.", status: 400 });
		expect(await createCatalogAddonFromPanelModule("../x")).toMatchObject({ status: 400 });
		expect(db.addons).toHaveLength(1);
	});

	it("sin datos lo agrega sin precio y sin ofrecerse", async () => {
		const result = await createCatalogAddonFromPanelModule("plantilla-excel");
		expect(result).toMatchObject({ created: true });
		expect(db.addons[1]).toMatchObject({
			slug: "panel_plantilla_excel",
			name: "Libro de caja",
			description: "Cuaderno",
			type: "monthly",
			price_monthly: null,
			is_active: false,
			panel_module: "plantilla-excel",
		});
	});

	it("al publicar respeta nombre, precio y si se ofrece", async () => {
		await createCatalogAddonFromPanelModule("plantilla-excel", {
			name: " Cuaderno de caja ",
			type: "one_time",
			price_one_time: 49.999,
			price_monthly: 10,
			is_active: true,
			unlocks_tabs: ["caja", "inventada"],
		});
		expect(db.addons[1]).toMatchObject({
			name: "Cuaderno de caja",
			type: "one_time",
			price_one_time: 50,
			price_monthly: null,
			is_active: true,
			unlocks_tabs: ["caja"],
		});
	});

	it("si ya está publicado, devuelve el mismo", async () => {
		const first = await createCatalogAddonFromPanelModule("plantilla-excel");
		const second = await createCatalogAddonFromPanelModule("plantilla-excel", { name: "Otro" });
		expect(second).toEqual({ addonId: (first as { addonId: string }).addonId, created: false });
		expect(db.addons).toHaveLength(2);
	});

	it("el de la empresa manda sobre el de todos", async () => {
		db.addons.push(
			{ id: "a-todos", slug: "panel_x", panel_module: "plantilla-excel", company_id: null },
			{ id: "a-oishi", slug: "custom-1", panel_module: "plantilla-excel", company_id: "co-oishi" },
		);
		expect(await findCatalogAddonForPanelModule("plantilla-excel", "co-oishi")).toBe("a-oishi");
		expect(await findCatalogAddonForPanelModule("plantilla-excel", "co-otra")).toBe("a-todos");
		expect(await findCatalogAddonForPanelModule("plantilla-excel")).toBe("a-todos");
	});
});
