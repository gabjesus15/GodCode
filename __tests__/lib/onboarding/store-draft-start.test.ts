import { describe, expect, it, vi } from "vitest";

import { resolveAvailablePublicSlug } from "@/lib/onboarding/checkout-service";
import { resolveOnboardingCountry, sanitizePlanHint } from "@/lib/onboarding/onboarding-entry";
import { startStoreFromApplication } from "@/lib/onboarding/start-store";
import { normalizeStoreSlug, STORE_SLUG_MAX, storeSlugProblem, suggestStoreSlug } from "@/lib/onboarding/store-draft-service";
import { storeSlugCandidate, storeSlugRoot } from "@/lib/onboarding/store-slug";
import { readStoreDraft } from "@/lib/tenant/store-draft";

type Op = { method: string; args: unknown[] };
type Result = { data?: unknown; error?: unknown; count?: number };

/** Cliente falso: cada consulta termina en `respond(tabla, operaciones)`. */
function fakeSupabase(respond: (table: string, ops: Op[]) => Result) {
	const calls: Array<{ table: string; ops: Op[] }> = [];
	const builder = (table: string) => {
		const ops: Op[] = [];
		calls.push({ table, ops });
		const finish = () => Promise.resolve({ data: null, error: null, ...respond(table, ops) });
		const proxy: Record<string, unknown> = {};
		for (const method of ["select", "insert", "update", "delete", "eq", "in", "not", "is", "order", "limit"]) {
			proxy[method] = (...args: unknown[]) => {
				ops.push({ method, args });
				return proxy;
			};
		}
		proxy.maybeSingle = finish;
		proxy.single = finish;
		proxy.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => finish().then(resolve, reject);
		return proxy;
	};
	const auth = {
		admin: {
			createUser: vi.fn(async () => ({ data: { user: { id: "auth-1" } }, error: null })),
			deleteUser: vi.fn(async () => ({ data: null, error: null })),
		},
	};
	return { client: { from: builder, auth } as never, calls, auth };
}

const has = (ops: Op[], method: string) => ops.some((op) => op.method === method);

const APP = {
	id: "app-1",
	email: "Dueno@Ejemplo.com ",
	status: "email_verified",
	payment_status: null,
	company_id: null,
	business_name: "Rica Pizza",
	responsible_name: "Ana Pérez",
	plan_id: "plan-pro",
	logo_url: null,
	sector: "pizzeria",
};

describe("crear la tienda en vista previa", () => {
	it("crea la cuenta, la tienda en vista previa y deja la solicitud sin pagar", async () => {
		const inserts: Record<string, unknown> = {};
		const { client, calls, auth } = fakeSupabase((table, ops) => {
			const insert = ops.find((op) => op.method === "insert");
			if (insert) inserts[table] = insert.args[0];
			if (table === "onboarding_applications" && has(ops, "update")) return { data: { id: "app-1" } };
			if (table === "onboarding_applications") return { data: APP };
			if (table === "companies" && insert) return { data: { id: "company-1" } };
			if (table === "companies" && has(ops, "order")) return { data: { created_by: "admin-1" } };
			if (table === "companies") return { data: null };
			return {};
		});

		const result = await startStoreFromApplication(client, { token: "tok", slug: "Rica Pizza!", password: "secreta123", now: new Date("2026-10-08T12:00:00.000Z") });

		expect(result).toEqual({ ok: true, email: "dueno@ejemplo.com", companyId: "company-1", slug: "rica-pizza" });
		expect(auth.admin.createUser).toHaveBeenCalledWith(expect.objectContaining({ email: "dueno@ejemplo.com", password: "secreta123", email_confirm: true }));
		const company = inserts.companies as { subscription_status: string; subscription_ends_at: null; public_slug: string; theme_config: unknown };
		expect(company).toMatchObject({ subscription_status: "trial", subscription_ends_at: null, public_slug: "rica-pizza" });
		expect(readStoreDraft(company.theme_config)).toMatchObject({ since: "2026-10-08T12:00:00.000Z", openedAt: null });
		expect((company.theme_config as { panelAccess: unknown }).panelAccess).toEqual([]);
		expect(inserts.users).toMatchObject({ role: "ceo", company_id: "company-1", auth_user_id: "auth-1" });
		const update = calls.find((call) => call.table === "onboarding_applications" && has(call.ops, "update"));
		expect(update?.ops.find((op) => op.method === "update")?.args[0]).toMatchObject({ company_id: "company-1" });
		expect(update?.ops.find((op) => op.method === "update")?.args[0]).not.toHaveProperty("status");
	});

	it("un correo con cuenta en Gcode no se toca: sigue con el alta de siempre", async () => {
		const { client, auth } = fakeSupabase((table) => (table === "onboarding_applications" ? { data: APP } : { data: null }));
		auth.admin.createUser.mockResolvedValueOnce({ data: { user: null }, error: { message: "A user with this email address has already been registered" } } as never);

		const result = await startStoreFromApplication(client, { token: "tok", slug: "rica-pizza", password: "secreta123" });

		expect(result).toMatchObject({ ok: false, code: "existing_account", status: 409 });
	});

	it("si falla la fila del dueño, borra la tienda y la cuenta para reintentar", async () => {
		const { client, calls, auth } = fakeSupabase((table, ops) => {
			if (table === "onboarding_applications") return { data: APP };
			if (table === "companies" && has(ops, "insert")) return { data: { id: "company-1" } };
			if (table === "companies" && has(ops, "order")) return { data: { created_by: "admin-1" } };
			if (table === "users" && has(ops, "insert")) return { error: { message: "boom" } };
			return { data: null };
		});

		const result = await startStoreFromApplication(client, { token: "tok", slug: "rica-pizza", password: "secreta123" });

		expect(result).toMatchObject({ ok: false, code: "error" });
		expect(calls.some((call) => call.table === "companies" && has(call.ops, "delete"))).toBe(true);
		expect(auth.admin.deleteUser).toHaveBeenCalledWith("auth-1");
	});

	it("si falla la sucursal, no deja una tienda sin sucursal: borra todo y avisa", async () => {
		const { client, calls, auth } = fakeSupabase((table, ops) => {
			if (table === "onboarding_applications") return { data: APP };
			if (table === "companies" && has(ops, "insert")) return { data: { id: "company-1" } };
			if (table === "companies" && has(ops, "order")) return { data: { created_by: "admin-1" } };
			if (table === "branches" && has(ops, "insert")) return { error: { message: "boom" } };
			return { data: null };
		});

		const result = await startStoreFromApplication(client, { token: "tok", slug: "rica-pizza", password: "secreta123" });

		expect(result).toMatchObject({ ok: false, code: "error", status: 500 });
		expect(calls.some((call) => call.table === "business_info" && has(call.ops, "insert"))).toBe(false);
		expect(calls.some((call) => call.table === "users" && has(call.ops, "insert"))).toBe(false);
		expect(calls.some((call) => call.table === "companies" && has(call.ops, "delete"))).toBe(true);
		expect(auth.admin.deleteUser).toHaveBeenCalledWith("auth-1");
	});

	it("si falla business_info, también se deshace", async () => {
		const { client, calls, auth } = fakeSupabase((table, ops) => {
			if (table === "onboarding_applications") return { data: APP };
			if (table === "companies" && has(ops, "insert")) return { data: { id: "company-1" } };
			if (table === "companies" && has(ops, "order")) return { data: { created_by: "admin-1" } };
			if (table === "business_info" && has(ops, "insert")) return { error: { message: "boom" } };
			return { data: null };
		});

		const result = await startStoreFromApplication(client, { token: "tok", slug: "rica-pizza", password: "secreta123" });

		expect(result).toMatchObject({ ok: false, code: "error" });
		expect(calls.some((call) => call.table === "branches" && has(call.ops, "delete"))).toBe(true);
		expect(calls.some((call) => call.table === "companies" && has(call.ops, "delete"))).toBe(true);
		expect(auth.admin.deleteUser).toHaveBeenCalledWith("auth-1");
	});

	it("si no se puede atar la solicitud a la tienda, borra la fila del dueño, la tienda y la cuenta", async () => {
		const { client, calls, auth } = fakeSupabase((table, ops) => {
			if (table === "onboarding_applications" && has(ops, "update")) return { error: { message: "timeout" } };
			if (table === "onboarding_applications") return { data: APP };
			if (table === "companies" && has(ops, "insert")) return { data: { id: "company-1" } };
			if (table === "companies" && has(ops, "order")) return { data: { created_by: "admin-1" } };
			return { data: null };
		});

		const result = await startStoreFromApplication(client, { token: "tok", slug: "rica-pizza", password: "secreta123" });

		expect(result).toMatchObject({ ok: false, code: "error", status: 500 });
		const update = calls.find((call) => call.table === "onboarding_applications" && has(call.ops, "update"));
		// Solo se ata si la solicitud sigue sin empresa (otra pestaña pudo crearla).
		expect(update?.ops).toContainEqual({ method: "is", args: ["company_id", null] });
		expect(calls.some((call) => call.table === "users" && has(call.ops, "delete"))).toBe(true);
		expect(calls.some((call) => call.table === "companies" && has(call.ops, "delete"))).toBe(true);
		expect(auth.admin.deleteUser).toHaveBeenCalledWith("auth-1");
	});

	it("rechaza sin tocar la base: contraseña corta, link reservado, tienda ya creada o link ocupado", async () => {
		const { client } = fakeSupabase(() => ({ data: null }));
		expect(await startStoreFromApplication(client, { token: "t", slug: "rica", password: "corta" })).toMatchObject({ code: "invalid" });
		expect(await startStoreFromApplication(client, { token: "t", slug: "admin", password: "secreta123" })).toMatchObject({ code: "slug_invalid" });
		expect(await startStoreFromApplication(client, { token: "t", slug: "ok-link", password: "secreta123" })).toMatchObject({ code: "not_found" });

		const created = fakeSupabase((table) => (table === "onboarding_applications" ? { data: { ...APP, company_id: "c1" } } : { data: null }));
		expect(await startStoreFromApplication(created.client, { token: "t", slug: "ok-link", password: "secreta123" })).toMatchObject({ code: "already_created" });

		const taken = fakeSupabase((table) => (table === "onboarding_applications" ? { data: APP } : { data: { id: "other" } }));
		expect(await startStoreFromApplication(taken.client, { token: "t", slug: "ok-link", password: "secreta123" })).toMatchObject({ code: "slug_taken" });
		expect(taken.auth.admin.createUser).not.toHaveBeenCalled();
	});

	it("con «solo panel CEO» no crea tienda: sigue con el plan y el pago", async () => {
		const { client, calls, auth } = fakeSupabase((table) => {
			if (table === "onboarding_applications") return { data: APP };
			if (table === "plans") return { data: { features: { product_mode: "panel_only" } } };
			return { data: null };
		});
		expect(await startStoreFromApplication(client, { token: "t", slug: "rica-pizza", password: "secreta123" })).toMatchObject({ code: "panel_only" });
		expect(auth.admin.createUser).not.toHaveBeenCalled();
		expect(calls.some((call) => call.table === "companies")).toBe(false);
	});
});

describe("link de la tienda", () => {
	it("se arma con letras y números, y no acepta rutas del sitio", () => {
		expect(normalizeStoreSlug("  Café Ñandú  ")).toBe("cafe-nandu");
		expect(storeSlugProblem("ab")).toBe("short");
		expect(storeSlugProblem("onboarding")).toBe("reserved");
		expect(storeSlugProblem("rica-pizza")).toBeNull();
	});

	it("una sola regla: como mucho 48 y el sufijo desde -2, también para el alta pagada", async () => {
		const long = "a".repeat(70);
		expect(normalizeStoreSlug(long)).toHaveLength(STORE_SLUG_MAX);
		expect(storeSlugCandidate("rica-pizza", 1)).toBe("rica-pizza");
		expect(storeSlugCandidate("rica-pizza", 2)).toBe("rica-pizza-2");
		expect(storeSlugCandidate("a".repeat(48), 12)).toBe(`${"a".repeat(45)}-12`);
		expect(storeSlugRoot("")).toBe("mi-tienda");
		expect(storeSlugRoot("Yo")).toBe("yo-tienda");

		const taken = new Set(["rica-pizza", "rica-pizza-2"]);
		const { client } = fakeSupabase((table, ops) => {
			const slug = ops.find((op) => op.method === "eq")?.args[1];
			return table === "companies" && taken.has(String(slug)) ? { data: { id: "x" } } : { data: null };
		});
		expect(await suggestStoreSlug(client, "Rica Pizza")).toBe("rica-pizza-3");
		expect(await resolveAvailablePublicSlug(client, "Rica Pizza")).toBe("rica-pizza-3");
	});
});

describe("entrada al alta desde el landing", () => {
	it("traduce el país (código o nombre) y valida el plan", () => {
		expect(resolveOnboardingCountry("VE")).toBe("Venezuela");
		expect(resolveOnboardingCountry("mexico")).toBe("México");
		expect(resolveOnboardingCountry("ZZ")).toBeNull();
		expect(sanitizePlanHint("plan_pro-1")).toBe("plan_pro-1");
		expect(sanitizePlanHint("<script>")).toBeNull();
	});
});
