import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Cliente anónimo del navegador: caja abierta, sucursal sin pausa ni horario, y la RPC
// que cada test decide.
const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/utils/supabase/client", () => ({
	createSupabaseBrowserClient: () => ({
		from: (table: string) => {
			const query = {
				select: () => query,
				eq: () => query,
				maybeSingle: async () =>
					table === "cash_shifts"
						? { data: { id: 1 }, error: null }
						: { data: { delivery_settings: null, order_intake_paused: false, business_hours: null, country: "CL" }, error: null },
			};
			return query;
		},
		rpc: mocks.rpc,
	}),
}));

import { ordersService } from "@/components/tenant/data/orders-service";

/** Texto en español de `tenant.cart.modal.errors.noOrdersNow`. */
const NO_ORDERS_NOW = "No se pueden recibir pedidos en este momento.";

const LINE = { id: "11111111-1111-4111-8111-111111111111", name: "Pizza", quantity: 1, price: 1000 };

const ORDER: Parameters<typeof ordersService.createOrder>[0] = {
	client_name: "Ana",
	client_phone: "+56911111111",
	total: 1000,
	items: [LINE],
	branch_id: "22222222-2222-4222-8222-222222222222",
	company_id: "33333333-3333-4333-8333-333333333333",
	payment_method_specific: "efectivo",
	order_type: "pickup",
};

type RouteReply = { status: number; body: Record<string, unknown> };

/** `fetch` del navegador: cada ruta del carrito responde lo que diga el test. */
function stubRoutes(replies: { catalog?: RouteReply; delivery?: RouteReply }) {
	const fetchMock = vi.fn(async (input: unknown) => {
		const url = String(input);
		const reply = url.endsWith("/api/tenant/order-catalog-items")
			? (replies.catalog ?? { status: 200, body: { ok: true, items: [LINE] } })
			: url.endsWith("/api/tenant/public-order-delivery")
				? (replies.delivery ?? { status: 200, body: { ok: true } })
				: { status: 404, body: {} };
		return new Response(JSON.stringify(reply.body), { status: reply.status });
	});
	vi.stubGlobal("fetch", fetchMock);
	return fetchMock;
}

const STORE_NOT_OPEN_REPLY: RouteReply = {
	status: 403,
	body: { ok: false, error: "Esta tienda no está recibiendo pedidos por ahora.", code: "store_not_open" },
};

beforeEach(() => {
	vi.stubGlobal("window", { location: { origin: "https://menu.test" } });
	mocks.rpc.mockReset();
	mocks.rpc.mockResolvedValue({ data: { id: 501 }, error: null });
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("ordersService.createOrder con la tienda sin abrir", () => {
	it("si el catálogo responde store_not_open, el carrito lee el aviso y no se crea el pedido", async () => {
		stubRoutes({ catalog: STORE_NOT_OPEN_REPLY });
		await expect(ordersService.createOrder(ORDER)).rejects.toThrow(NO_ORDERS_NOW);
		expect(mocks.rpc).not.toHaveBeenCalled();
	});

	it.each(["store_not_open", "branch_company_mismatch"])("traduce el rechazo %s de la RPC", async (code) => {
		stubRoutes({});
		mocks.rpc.mockResolvedValue({ data: null, error: { message: code } });
		// El mensaje entero es el aviso: nada del código crudo.
		await expect(ordersService.createOrder(ORDER)).rejects.toThrow(/^No se pueden recibir pedidos en este momento\.$/);
	});

	it("si el cierre del pedido responde store_not_open, tampoco muestra el código", async () => {
		stubRoutes({ delivery: STORE_NOT_OPEN_REPLY });
		await expect(ordersService.createOrder(ORDER)).rejects.toThrow(NO_ORDERS_NOW);
	});

	it("con la tienda abierta el pedido sale como siempre", async () => {
		const fetchMock = stubRoutes({});
		const result = await ordersService.createOrder(ORDER);
		expect(result.order).toEqual({ id: 501 });
		expect(mocks.rpc).toHaveBeenCalledWith(
			"create_public_order_v1",
			expect.objectContaining({ p_branch_id: ORDER.branch_id, p_company_id: ORDER.company_id, p_order_origin: "web" }),
		);
		expect(fetchMock).toHaveBeenCalledWith("https://menu.test/api/tenant/public-order-delivery", expect.anything());
	});

	it("los demás errores de la RPC siguen con su propio texto", async () => {
		stubRoutes({});
		mocks.rpc.mockResolvedValue({ data: null, error: { message: "outside_business_hours" } });
		await expect(ordersService.createOrder(ORDER)).rejects.toThrow(/fuera de horario/);
	});
});
