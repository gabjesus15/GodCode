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

import { POST } from "@/app/api/tenant/public-order-delivery/route";

const TOKEN = "22222222-2222-4222-8222-222222222222";

function post(payload: unknown) {
	return POST(
		new NextRequest("http://localhost/api/tenant/public-order-delivery", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		}),
	);
}

/**
 * Los id de pedido son correlativos: sin el client_request_id que generó el
 * navegador al crear el pedido, la ruta pública no lee, parcha ni cancela nada.
 */
describe("POST /api/tenant/public-order-delivery", () => {
	beforeEach(() => {
		adminHolder.current = makeAdminMock({ tables: { orders: [{ data: null, error: null }] } });
	});

	it("sin clientRequestId no toca la base", async () => {
		const res = await post({ orderId: "101", orderType: "pickup" });
		expect(res.status).toBe(400);
		expect(adminHolder.current.from).not.toHaveBeenCalled();
	});

	it("rechaza un clientRequestId que no es uuid", async () => {
		const res = await post({ orderId: "101", clientRequestId: "101", orderType: "pickup" });
		expect(res.status).toBe(400);
		expect(adminHolder.current.from).not.toHaveBeenCalled();
	});

	it("busca el pedido por id y client_request_id, y uno ajeno no se encuentra ni se cancela", async () => {
		const res = await post({ orderId: "101", clientRequestId: TOKEN, orderType: "delivery" });
		expect(res.status).toBe(404);

		const admin = adminHolder.current;
		expect(admin.fromCalls).toEqual(["orders"]);
		const lookup = admin.chains[0].chain;
		expect(lookup.eq).toHaveBeenCalledWith("id", "101");
		expect(lookup.eq).toHaveBeenCalledWith("client_request_id", TOKEN);
		expect(lookup.update).not.toHaveBeenCalled();
	});

	it("si falla la escritura no le devuelve al anónimo el texto de la base", async () => {
		adminHolder.current = makeAdminMock({
			tables: {
				orders: [
					{
						data: { id: 101, branch_id: "b1", client_id: null, total: 0, items: [], created_at: new Date().toISOString(), status: "pending", discount_total: 0, note: null },
						error: null,
					},
					{ data: null, error: { message: 'column "secret_col" violates constraint orders_pkey' } },
					{ data: null, error: null },
				],
				branches: [{ data: { id: "b1", company_id: null, country: "CL", delivery_settings: {}, order_intake_paused: false }, error: null }],
			},
		});
		const res = await post({ orderId: "101", clientRequestId: TOKEN, orderType: "pickup", deliveryFee: 0 });
		expect(res.status).toBe(400);
		const text = JSON.stringify(await res.json());
		expect(text).not.toContain("secret_col");
		expect(text).toContain("Intenta nuevamente");
	});

	it("un error inesperado responde un mensaje genérico", async () => {
		adminHolder.current = makeAdminMock({ tables: {} });
		adminHolder.current.from.mockImplementation(() => {
			throw new Error("connect ECONNREFUSED 10.0.0.5:5432");
		});
		const res = await post({ orderId: "101", clientRequestId: TOKEN, orderType: "pickup" });
		expect(res.status).toBe(500);
		expect(JSON.stringify(await res.json())).not.toContain("ECONNREFUSED");
	});
});
