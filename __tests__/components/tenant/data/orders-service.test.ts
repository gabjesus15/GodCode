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
function stubRoutes(replies: { catalog?: RouteReply; delivery?: RouteReply; account?: RouteReply }) {
	const fetchMock = vi.fn(async (input: unknown) => {
		const url = String(input);
		const reply = url.endsWith("/api/tenant/order-catalog-items")
			? (replies.catalog ?? { status: 200, body: { ok: true, items: [LINE] } })
			: url.endsWith("/api/tenant/public-order-delivery")
				? (replies.delivery ?? { status: 200, body: { ok: true } })
				: url.endsWith("/api/menu-account/order")
					? (replies.account ?? { status: 200, body: { order: { id: 777 } } })
					: { status: 404, body: {} };
		return new Response(JSON.stringify(reply.body), { status: reply.status });
	});
	vi.stubGlobal("fetch", fetchMock);
	return fetchMock;
}

/** El rechazo que el carrito traduce: código estable y, de respaldo, el texto en español. */
const STORE_NOT_OPEN_ERROR = { code: "store_not_open", message: NO_ORDERS_NOW };

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
	it("si el catálogo responde store_not_open, rechaza con ese código y no se crea el pedido", async () => {
		stubRoutes({ catalog: STORE_NOT_OPEN_REPLY });
		await expect(ordersService.createOrder(ORDER)).rejects.toMatchObject(STORE_NOT_OPEN_ERROR);
		expect(mocks.rpc).not.toHaveBeenCalled();
	});

	it.each(["store_not_open", "branch_company_mismatch"])("traduce el rechazo %s de la RPC", async (code) => {
		stubRoutes({});
		mocks.rpc.mockResolvedValue({ data: null, error: { message: code } });
		// El mensaje entero es el aviso: nada del código crudo.
		await expect(ordersService.createOrder(ORDER)).rejects.toThrow(/^No se pueden recibir pedidos en este momento\.$/);
		await expect(ordersService.createOrder(ORDER)).rejects.toMatchObject({ code: "store_not_open" });
	});

	it("si el cierre del pedido responde store_not_open, tampoco muestra el código", async () => {
		stubRoutes({ delivery: STORE_NOT_OPEN_REPLY });
		await expect(ordersService.createOrder(ORDER)).rejects.toMatchObject(STORE_NOT_OPEN_ERROR);
	});

	it("con sesión en «Mi cuenta», el 403 store_not_open de su ruta llega con el mismo código", async () => {
		stubRoutes({ account: STORE_NOT_OPEN_REPLY });
		await expect(ordersService.createOrder({ ...ORDER, account_order: true })).rejects.toMatchObject(STORE_NOT_OPEN_ERROR);
		expect(mocks.rpc).not.toHaveBeenCalled();
	});

	it("con sesión en «Mi cuenta», el rechazo de la RPC (code order_rpc_error) también se traduce", async () => {
		stubRoutes({ account: { status: 400, body: { error: "store_not_open", code: "order_rpc_error" } } });
		await expect(ordersService.createOrder({ ...ORDER, account_order: true })).rejects.toMatchObject(STORE_NOT_OPEN_ERROR);
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

	it("los demás errores de la RPC siguen con su propio texto y sin código", async () => {
		stubRoutes({});
		mocks.rpc.mockResolvedValue({ data: null, error: { message: "outside_business_hours" } });
		await expect(ordersService.createOrder(ORDER)).rejects.toThrow(/fuera de horario/);
		await expect(ordersService.createOrder(ORDER)).rejects.not.toHaveProperty("code");
	});
});
