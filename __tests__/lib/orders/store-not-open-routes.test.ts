import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeAdminMock } from "../menu-account/test-supabase-mock";

const adminHolder: { current: ReturnType<typeof makeAdminMock> } = {
	current: makeAdminMock({ tables: {} }),
};
vi.mock("@/lib/infra/supabase-admin", () => ({
	get supabaseAdmin() {
		return adminHolder.current;
	},
}));
vi.mock("@/lib/infra/public-rate-limit", () => ({
	assertPublicRateLimit: vi.fn(async () => null),
	assertPublicScopedRateLimit: vi.fn(async () => null),
}));

/** Quien mira: sin sesión (anónimo) o el dueño con la sesión de /cuenta. */
const viewer: { user: { id: string; email: string } | null } = { user: null };
vi.mock("@/utils/supabase/server", () => ({
	createSupabaseServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: viewer.user } }) } }),
}));
vi.mock("@/lib/super-admin/account-access", () => ({ getSuperAdminRoleByEmail: async () => null }));

const fetchCartBranchPrices = vi.fn(async () => [{ product_id: "p1", price: 1000 }]);
vi.mock("@/lib/orders/fetch-cart-branch-prices", () => ({
	fetchCartBranchPrices: (...args: unknown[]) => fetchCartBranchPrices(...(args as [])),
}));
const buildOrderItemsFromBranch = vi.fn(async () => [{ id: "p1", quantity: 1, price: 1000 }]);
vi.mock("@/components/tenant/data/orders/build-order-items-from-branch", () => ({
	buildOrderItemsFromBranch: (...args: unknown[]) => buildOrderItemsFromBranch(...(args as [])),
}));

import { POST as cartPrices } from "@/app/api/tenant/cart-branch-prices/route";
import { POST as catalogItems } from "@/app/api/tenant/order-catalog-items/route";
import { GET as paymentPolicies } from "@/app/api/tenant/payment-method-policies/route";
import { POST as orderDelivery } from "@/app/api/tenant/public-order-delivery/route";

const BRANCH = "11111111-1111-4111-8111-111111111111";
const TOKEN = "22222222-2222-4222-8222-222222222222";

const DRAFT = {
	id: "c1",
	subscription_status: "trial",
	subscription_ends_at: null,
	store_draft: { since: "2026-10-01T00:00:00.000Z" },
};
const OPEN = { ...DRAFT, subscription_status: "active", store_draft: { since: "2026-10-01T00:00:00.000Z", openedAt: "2026-10-03T00:00:00.000Z" } };
const SUSPENDED = { id: "c1", subscription_status: "suspended", subscription_ends_at: null, store_draft: null };

function postJson(url: string, payload: unknown) {
	return new NextRequest(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});
}

function withCompany(company: unknown, extra: Record<string, unknown[]> = {}) {
	adminHolder.current = makeAdminMock({
		tables: {
			branches: [{ data: { company_id: "c1" }, error: null }],
			companies: [{ data: company, error: null }],
			users: [{ data: [{ is_active: true }], error: null }],
			...extra,
		},
	});
}

beforeEach(() => {
	viewer.user = null;
	fetchCartBranchPrices.mockClear();
	buildOrderItemsFromBranch.mockClear();
});

describe("rutas del carrito con la tienda sin abrir", () => {
	it("precios: una tienda en vista previa no los sirve a un anónimo", async () => {
		withCompany(DRAFT);
		const res = await cartPrices(postJson("http://localhost/api/tenant/cart-branch-prices", { branchId: BRANCH, productIds: ["p1"] }));
		expect(res.status).toBe(403);
		expect(await res.json()).toMatchObject({ ok: false, code: "store_not_open" });
		expect(fetchCartBranchPrices).not.toHaveBeenCalled();
	});

	it("precios: una tienda abierta los sirve", async () => {
		withCompany(OPEN);
		const res = await cartPrices(postJson("http://localhost/api/tenant/cart-branch-prices", { branchId: BRANCH, productIds: ["p1"] }));
		expect(res.status).toBe(200);
		expect(await res.json()).toMatchObject({ ok: true, rows: [{ product_id: "p1" }] });
	});

	it("catálogo: el cliente lee un mensaje, no el código", async () => {
		withCompany(DRAFT);
		const res = await catalogItems(postJson("http://localhost/api/tenant/order-catalog-items", { branchId: BRANCH, items: [{ id: "p1" }] }));
		expect(res.status).toBe(403);
		const body = (await res.json()) as { error: string; code: string };
		expect(body.code).toBe("store_not_open");
		expect(body.error).not.toBe("store_not_open");
		expect(body.error).toMatch(/pedidos/);
		expect(buildOrderItemsFromBranch).not.toHaveBeenCalled();
	});

	it("catálogo: el dueño en su vista previa sí puede validar el carrito", async () => {
		viewer.user = { id: "owner-1", email: "dueno@local.com" };
		withCompany(DRAFT);
		const res = await catalogItems(postJson("http://localhost/api/tenant/order-catalog-items", { branchId: BRANCH, items: [{ id: "p1" }] }));
		expect(res.status).toBe(200);
		expect(buildOrderItemsFromBranch).toHaveBeenCalledTimes(1);
	});

	it("catálogo: una sucursal que no existe es 404 y si la base falla es 500", async () => {
		adminHolder.current = makeAdminMock({ tables: { branches: [{ data: null, error: null }] } });
		const missing = await catalogItems(postJson("http://localhost/api/tenant/order-catalog-items", { branchId: BRANCH, items: [{ id: "p1" }] }));
		expect(missing.status).toBe(404);

		adminHolder.current = makeAdminMock({ tables: { branches: [{ data: null, error: { message: "timeout" } }] } });
		const failed = await catalogItems(postJson("http://localhost/api/tenant/order-catalog-items", { branchId: BRANCH, items: [{ id: "p1" }] }));
		expect(failed.status).toBe(500);
		expect(JSON.stringify(await failed.json())).not.toContain("timeout");
	});

	it("políticas de pago: una tienda suspendida no las expone", async () => {
		withCompany(SUSPENDED, { branches: [{ data: { company_id: "c1", payment_methods: ["efectivo"] }, error: null }] });
		const res = await paymentPolicies(new NextRequest(`http://localhost/api/tenant/payment-method-policies?branchId=${BRANCH}`));
		expect(res.status).toBe(403);
		expect(await res.json()).toMatchObject({ code: "store_not_open" });
	});

	it("cierre del envío: el pedido de una tienda en vista previa se cancela", async () => {
		const order = {
			id: 101,
			branch_id: BRANCH,
			client_id: null,
			total: 1000,
			items: [],
			created_at: new Date().toISOString(),
			status: "pending",
			discount_total: 0,
			note: null,
		};
		adminHolder.current = makeAdminMock({
			tables: {
				orders: [{ data: order, error: null }, { data: null, error: null }],
				branches: [{ data: { id: BRANCH, company_id: "c1", country: "CL", delivery_settings: {}, order_intake_paused: false }, error: null }],
				companies: [{ data: { ...DRAFT, currency: "CLP", integration_settings: null }, error: null }],
			},
		});
		const res = await orderDelivery(
			postJson("http://localhost/api/tenant/public-order-delivery", { orderId: "101", clientRequestId: TOKEN, orderType: "pickup", deliveryFee: 0 }),
		);
		expect(res.status).toBe(403);
		expect(await res.json()).toMatchObject({ code: "store_not_open" });
		const cancel = adminHolder.current.chains.filter((c) => c.table === "orders")[1]?.chain;
		expect(cancel?.update).toHaveBeenCalledWith(expect.objectContaining({ status: "cancelled" }));
	});
});
