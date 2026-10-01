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
});
