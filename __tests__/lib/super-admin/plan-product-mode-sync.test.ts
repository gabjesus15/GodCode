import { describe, expect, it, vi } from "vitest";

import { provisionCompanyFromApplication, type OnboardingApplication } from "@/lib/onboarding/checkout-service";
import { openStoreDraft } from "@/lib/onboarding/store-draft-service";
import { normalizePlanFeaturesPayload } from "@/lib/plans/plan-features";
import { MENU_ONLY_CEO_TABS } from "@/lib/plans/plan-product-mode";
import { applyPlanProductModeToCompany, buildPlanProductModePatch } from "@/lib/super-admin/sync-company-panel-access";

type Op = { method: string; args: unknown[] };

/** Cliente falso: cada consulta termina en `respond(tabla, operaciones)`. */
function fakeSupabase(respond: (table: string, ops: Op[]) => { data?: unknown; error?: unknown }) {
	const calls: Array<{ table: string; ops: Op[] }> = [];
	const from = (table: string) => {
		const ops: Op[] = [];
		calls.push({ table, ops });
		const finish = () => Promise.resolve({ data: null, error: null, ...respond(table, ops) });
		const query: Record<string, unknown> = {};
		for (const method of ["select", "insert", "update", "delete", "eq", "in", "not", "is", "order", "limit"]) {
			query[method] = (...args: unknown[]) => {
				ops.push({ method, args });
				return query;
			};
		}
		query.maybeSingle = finish;
		query.single = finish;
		query.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => finish().then(resolve, reject);
		return query;
	};
	const written = (table: string, method: "insert" | "update") =>
		calls
			.filter((call) => call.table === table)
			.flatMap((call) => call.ops.filter((op) => op.method === method).map((op) => op.args[0] as Record<string, unknown>));
	return { client: { from } as never, calls, written };
}

const MENU_ONLY = { product_mode: "menu_only", ceo_tabs: ["products", "categories", "menu_carousel"] };
const FULL = { ceo_tabs: ["orders", "caja", "products"] };

describe("lo que un plan deja en la empresa", () => {
	it("con «solo menú digital» guarda el canal WhatsApp y el panel del plan", () => {
		const patch = buildPlanProductModePatch({ theme_config: { displayName: "Rica" }, integration_settings: { uber: { on: true } } }, MENU_ONLY);
		expect(patch.panelAccess).toEqual(["products", "categories", "menu_carousel"]);
		expect(patch.theme_config).toMatchObject({ displayName: "Rica", panelAccess: patch.panelAccess });
		expect(patch.integration_settings).toMatchObject({ uber: { on: true }, menu: { orderChannel: "whatsapp_only" } });
	});

	it("con un plan completo no toca el canal", () => {
		const patch = buildPlanProductModePatch({ theme_config: {} }, FULL);
		expect(patch.panelAccess).toEqual(["orders", "caja", "products"]);
		expect(patch.integration_settings).toBeUndefined();
	});

	it("una tienda todavía en vista previa queda sin panel aunque el plan lo traiga", () => {
		const draft = { subscription_status: "trial", theme_config: { storeDraft: { since: "2026-10-01T00:00:00.000Z" } } };
		expect(buildPlanProductModePatch(draft, FULL).panelAccess).toEqual([]);
	});

	it("applyPlanProductModeToCompany escribe panel y canal en una sola actualización", async () => {
		const { client, written } = fakeSupabase((table, ops) =>
			table === "companies" && ops.some((op) => op.method === "select") ? { data: { theme_config: {}, integration_settings: null, subscription_status: "active" } } : {},
		);
		expect(await applyPlanProductModeToCompany("c1", MENU_ONLY, { client })).toEqual({ ok: true });
		const updates = written("companies", "update");
		expect(updates).toHaveLength(1);
		expect(updates[0]).toMatchObject({ theme_config: { panelAccess: ["products", "categories", "menu_carousel"] }, integration_settings: { menu: { orderChannel: "whatsapp_only" } } });
	});

	it("applyPlanProductModeToCompany devuelve el error en vez de lanzar", async () => {
		const { client } = fakeSupabase((_table, ops) => (ops.some((op) => op.method === "update") ? { error: { message: "timeout" } } : {}));
		expect(await applyPlanProductModeToCompany("c1", FULL, { client, company: { theme_config: {} } })).toEqual({ ok: false, error: "timeout" });
	});
});

describe("el alta deja el canal de «solo menú digital»", () => {
	const APP: OnboardingApplication = { id: "app-1", business_name: "Rica Pizza", email: "a@b.com", plan_id: "plan-menu" };

	it("al crear la empresa pagada", async () => {
		const { client, written } = fakeSupabase((table, ops) => {
			if (table === "plans") return { data: { features: MENU_ONLY } };
			if (table === "companies" && ops.some((op) => op.method === "order")) return { data: { created_by: "admin-1" } };
			if (table === "companies" && ops.some((op) => op.method === "insert")) return { data: { id: "c1" } };
			return {};
		});
		const result = await provisionCompanyFromApplication(client, APP, false);
		expect(result).toMatchObject({ ok: true });
		const [company] = written("companies", "insert");
		expect(company).toMatchObject({
			theme_config: { panelAccess: ["products", "categories", "menu_carousel"] },
			integration_settings: { menu: { orderChannel: "whatsapp_only" } },
		});
	});

	it("al abrir la tienda armada en vista previa", async () => {
		vi.stubEnv("REVALIDATION_SECRET", "");
		const { client, written } = fakeSupabase((table) => {
			if (table === "plans") return { data: { features: MENU_ONLY } };
			if (table === "companies")
				return {
					data: {
						id: "c1",
						public_slug: "rica-pizza",
						subscription_status: "active",
						integration_settings: null,
						theme_config: { panelAccess: [], storeDraft: { since: "2026-10-01T00:00:00.000Z" } },
					},
				};
			return {};
		});
		const result = await openStoreDraft(client, { companyId: "c1", planId: "plan-menu", now: new Date("2026-10-09T12:00:00.000Z") });
		expect(result).toEqual({ opened: true, slug: "rica-pizza" });
		const [update] = written("companies", "update");
		expect(update).toMatchObject({
			plan_id: "plan-menu",
			theme_config: { panelAccess: ["products", "categories", "menu_carousel"], storeDraft: { openedAt: "2026-10-09T12:00:00.000Z" } },
			integration_settings: { menu: { orderChannel: "whatsapp_only" } },
		});
		vi.unstubAllEnvs();
	});
});

describe("features de un plan «solo menú digital»", () => {
	it("el servidor quita las pestañas que no son del catálogo", () => {
		const features = normalizePlanFeaturesPayload({ product_mode: "menu_only", ceo_tabs: ["products", "orders", "caja", "menu_carousel"], cash: true });
		expect(features.ceo_tabs).toEqual(["products", "menu_carousel"]);
		expect(features).toMatchObject({ cash: false, crm: false, menu: true });
	});

	it("sin pestañas guardadas quedan las del catálogo", () => {
		const features = normalizePlanFeaturesPayload({ product_mode: "menu_only" });
		expect(features.ceo_tabs).toEqual(MENU_ONLY_CEO_TABS);
	});

	it("otros modos no se tocan", () => {
		const features = normalizePlanFeaturesPayload({ ceo_tabs: ["orders", "caja"], included_addons: ["Dominio"] });
		expect(features.ceo_tabs).toEqual(["orders", "caja"]);
		expect(features.included_addons).toEqual(["dominio"]);
	});
});
