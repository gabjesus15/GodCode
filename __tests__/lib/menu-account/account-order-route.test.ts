import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeAdminMock } from "./test-supabase-mock";

const adminHolder: { current: ReturnType<typeof makeAdminMock> & { rpc?: ReturnType<typeof vi.fn> } } = {
	current: makeAdminMock({ tables: {} }),
};
const sessionHolder: { current: { account: { id: string; full_name: string } } | null } = { current: null };

vi.mock("@/lib/infra/supabase-admin", () => ({
	get supabaseAdmin() {
		return adminHolder.current;
	},
}));
vi.mock("@/lib/infra/api-guard", () => ({ enforceRateLimit: vi.fn(async () => null) }));
vi.mock("@/lib/menu-account/route-helpers", async () => {
	const { NextResponse } = await import("next/server");
	return {
		menuAccountDisabledResponse: () => null,
		toMenuAccountErrorResponse: (error: { status?: number }) =>
			NextResponse.json({ error: "x" }, { status: error?.status ?? 500 }),
	};
});
vi.mock("@/lib/menu-account/session", () => ({
	requireMenuAccount: vi.fn(async () => {
		if (!sessionHolder.current) throw Object.assign(new Error("unauthorized"), { status: 401 });
		return sessionHolder.current;
	}),
}));
vi.mock("@/lib/menu-account/client-link", () => ({
	ensureMenuAccountClient: vi.fn(async () => "ficha-de-la-sesion"),
}));

import { POST } from "@/app/api/menu-account/order/route";

const BRANCH = "11111111-1111-4111-8111-111111111111";

function body(overrides: Record<string, unknown> = {}) {
	return {
		branchId: BRANCH,
		items: [{ id: "p1", quantity: 1 }],
		total: 24,
		paymentType: "online",
		paymentMethodSpecific: "pago_movil",
		orderType: "delivery",
		deliveryFee: 3,
		deliveryAddress: { address: "Av. Principal 123", named_area_label: "Centro" },
		clientRequestId: "33333333-3333-4333-8333-333333333333",
		...overrides,
	};
}

function post(payload: unknown) {
	return POST(
		new NextRequest("http://localhost/api/menu-account/order", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		}),
	);
}

function mockDb(
	rpcResult: { data: unknown; error: unknown },
	orders: unknown[] = [{ data: null, error: null }],
) {
	const admin = makeAdminMock({
		tables: {
			branches: [{ data: { company_id: "company-a" }, error: null }],
			orders,
		},
	}) as ReturnType<typeof makeAdminMock> & { rpc: ReturnType<typeof vi.fn> };
	admin.rpc = vi.fn(async () => rpcResult);
	adminHolder.current = admin;
	return admin;
}

/**
 * El pedido con sesión lo arma el servidor: quién compra sale de la sesión, nunca
 * del cuerpo, y la dirección no se queda en claro.
 */
describe("POST /api/menu-account/order", () => {
	beforeEach(() => {
		sessionHolder.current = { account: { id: "cuenta-ana", full_name: "Ana Pérez" } };
	});

	it("sin sesión no crea nada", async () => {
		sessionHolder.current = null;
		const admin = mockDb({ data: null, error: null });
		const res = await post(body());
		expect(res.status).toBe(401);
		expect(admin.rpc).not.toHaveBeenCalled();
	});

	it("usa la ficha de la sesión e ignora cualquier cliente o estado del cuerpo", async () => {
		const admin = mockDb({ data: { id: 10, delivery_address: { address: "Av. Principal 123" } }, error: null });
		const res = await post(body({ clientId: "ficha-ajena", p_client_id: "ficha-ajena", status: "completed" }));
		expect(res.status).toBe(200);
		expect(admin.rpc).toHaveBeenCalledWith(
			"create_order_transaction",
			expect.objectContaining({
				p_client_id: "ficha-de-la-sesion",
				p_company_id: "company-a",
				p_status: "pending",
				p_client_name: "Ana P.",
				p_client_phone: "",
				p_client_rut: "",
			}),
		);
	});

	it("cifra la dirección apenas se crea el pedido", async () => {
		const admin = mockDb({
			data: { id: 10, delivery_address: { address: "Av. Principal 123", named_area_label: "Centro" } },
			error: null,
		});
		const res = await post(body());
		const json = (await res.json()) as { order: { delivery_address: Record<string, unknown> } };
		expect(json.order.delivery_address.named_area_label).toBe("Centro");
		expect(String(json.order.delivery_address.sealed)).toMatch(/^enc:v1:/);
		expect(JSON.stringify(json.order)).not.toContain("Principal");

		const update = admin.chains.find((entry) => entry.table === "orders")?.chain;
		expect(update?.eq).toHaveBeenCalledWith("client_id", "ficha-de-la-sesion");
	});

	it("ata el pedido al client_request_id del carrito, aunque no haya dirección que cifrar", async () => {
		const admin = mockDb({ data: { id: 10, delivery_address: null }, error: null });
		const res = await post(body({ orderType: "pickup", deliveryFee: 0, deliveryAddress: null }));
		expect(res.status).toBe(200);
		const update = admin.chains.find((entry) => entry.table === "orders")?.chain;
		expect(update?.update).toHaveBeenCalledWith({ client_request_id: "33333333-3333-4333-8333-333333333333" });
		expect(update?.eq).toHaveBeenCalledWith("client_id", "ficha-de-la-sesion");
	});

	it("sin client_request_id no crea el pedido", async () => {
		const admin = mockDb({ data: null, error: null });
		const res = await post(body({ clientRequestId: undefined }));
		expect(res.status).toBe(400);
		expect(admin.rpc).not.toHaveBeenCalled();
	});

	it("devuelve el error del RPC para que el carrito lo traduzca", async () => {
		mockDb({ data: null, error: { message: "invalid_item_price" } });
		const res = await post(body());
		expect(res.status).toBe(400);
		await expect(res.json()).resolves.toMatchObject({ error: "invalid_item_price" });
	});

	it("si el sellado falla una vez, reintenta y responde bien", async () => {
		const admin = mockDb(
			{ data: { id: 10, delivery_address: { address: "Av. Principal 123" } }, error: null },
			[{ data: null, error: { message: "timeout" } }, { data: null, error: null }],
		);
		const res = await post(body());
		expect(res.status).toBe(200);
		expect(admin.fromCalls.filter((t) => t === "orders")).toHaveLength(2);
		expect(JSON.stringify(await res.json())).not.toContain("Principal");
	});

	it("si el sellado falla dos veces, cancela el pedido, borra la dirección en claro y devuelve error", async () => {
		const admin = mockDb(
			{ data: { id: 10, delivery_address: { address: "Av. Principal 123" }, note: "sin cebolla" }, error: null },
			[{ data: null, error: { message: "timeout" } }, { data: null, error: { message: "timeout" } }, { data: null, error: null }],
		);
		const res = await post(body());
		expect(res.status).toBe(503);
		const json = (await res.json()) as Record<string, unknown>;
		expect(json).toMatchObject({ code: "order_finalize_failed" });
		expect(JSON.stringify(json)).not.toContain("Principal");

		const writes = admin.chains.filter((entry) => entry.table === "orders").map((entry) => entry.chain);
		expect(writes).toHaveLength(3);
		const abandon = writes[2];
		expect(abandon.update).toHaveBeenCalledWith(
			expect.objectContaining({ status: "cancelled", delivery_address: null }),
		);
		expect(abandon.eq).toHaveBeenCalledWith("status", "pending");
		expect(abandon.eq).toHaveBeenCalledWith("client_id", "ficha-de-la-sesion");
	});
});
