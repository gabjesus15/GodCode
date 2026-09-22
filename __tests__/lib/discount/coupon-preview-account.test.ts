import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeAdminMock } from "../menu-account/test-supabase-mock";

const adminHolder: { current: ReturnType<typeof makeAdminMock> } = {
	current: makeAdminMock({ tables: {} }),
};
const sessionHolder: { current: { account: { id: string } } | null } = { current: null };

vi.mock("@/lib/infra/supabase-admin", () => ({
	get supabaseAdmin() {
		return adminHolder.current;
	},
}));
vi.mock("@/lib/infra/public-rate-limit", () => ({
	assertJsonRateLimit: vi.fn(async () => null),
}));
vi.mock("@/lib/menu-account/session", () => ({
	getMenuAccountSession: vi.fn(async () => sessionHolder.current),
}));
vi.mock("@/lib/menu-account/client-link", () => ({
	ensureMenuAccountClient: vi.fn(async () => "ficha-cuenta"),
}));

import { POST } from "@/app/api/geo/discount-coupon-preview/route";

const BRANCH_ID = "11111111-1111-4111-8111-111111111111";

const cuponDeCuenta = {
	id: "cupon-1",
	code: "ANA10",
	is_active: true,
	scope: "client_only",
	restricted_account_id: "cuenta-ana",
	restricted_client_id: null,
	discount_type: "percent",
	discount_value: 10,
	min_order_subtotal: 0,
	max_redemptions: null,
	redemptions_count: 0,
	max_redemptions_per_client: 1,
	valid_from: null,
	valid_until: null,
};

function mockBase(ordersCount = 0) {
	adminHolder.current = makeAdminMock({
		tables: {
			branches: [{ data: { company_id: "company-a" }, error: null }],
			discount_coupons: [{ data: [cuponDeCuenta], error: null }],
			orders: [{ data: null, count: ordersCount, error: null }],
		},
	});
}

async function preview(clientPhone?: string) {
	const req = new NextRequest("http://localhost/api/geo/discount-coupon-preview", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ branchId: BRANCH_ID, code: "ana10", subtotal: 100, clientPhone }),
	});
	const res = await POST(req);
	return (await res.json()) as { ok: boolean; error?: string; discountAmount?: number };
}

/**
 * El cupón de una cuenta se prueba con la sesión del menú. El teléfono del carrito
 * lo puede escribir cualquiera, así que no debe abrir el cupón.
 */
describe("vista previa de un cupón atado a una cuenta", () => {
	beforeEach(() => {
		sessionHolder.current = null;
		mockBase();
	});

	it("pide iniciar sesión aunque el carrito traiga un teléfono", async () => {
		await expect(preview("+56 9 1234 5678")).resolves.toMatchObject({
			ok: false,
			error: "coupon_login_required",
		});
	});

	it("rechaza la sesión de otra cuenta", async () => {
		sessionHolder.current = { account: { id: "cuenta-otra" } };
		await expect(preview()).resolves.toMatchObject({ ok: false, error: "coupon_wrong_client" });
	});

	it("acepta a la cuenta dueña y no consulta fichas por teléfono", async () => {
		sessionHolder.current = { account: { id: "cuenta-ana" } };
		await expect(preview()).resolves.toMatchObject({ ok: true, discountAmount: 10 });
		expect(adminHolder.current.fromCalls).not.toContain("clients");
	});

	it("cuenta el límite por cliente con los pedidos de la ficha de la cuenta", async () => {
		sessionHolder.current = { account: { id: "cuenta-ana" } };
		mockBase(1);
		await expect(preview()).resolves.toMatchObject({
			ok: false,
			error: "coupon_usage_exhausted_client",
		});
		const pedidos = adminHolder.current.chains.find((entry) => entry.table === "orders")?.chain;
		expect(pedidos?.eq).toHaveBeenCalledWith("client_id", "ficha-cuenta");
		expect(pedidos?.neq).toHaveBeenCalledWith("status", "cancelled");
	});
});
