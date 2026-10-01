import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeAdminMock } from "../menu-account/test-supabase-mock";

const adminHolder = { current: makeAdminMock({ tables: {} }) };
vi.mock("@/lib/infra/supabase-admin", () => ({
	get supabaseAdmin() {
		return adminHolder.current;
	},
}));
vi.mock("@/utils/admin/server-auth", () => ({
	SAAS_READ_ROLES: ["super_admin", "support"],
	SAAS_MUTATE_ROLES: ["super_admin"],
	validateSuperAdminAccess: vi.fn(async () => ({ ok: true, email: "admin@example.com" })),
}));

import { GET as listUsers } from "@/app/api/auth/super-admin-user/route";
import { GET as listMessages } from "@/app/api/super-admin/tickets/[id]/messages/route";

function message(i: number) {
	return {
		id: `m${i}`,
		ticket_id: "t1",
		author_type: "tenant",
		author_email: null,
		is_internal: false,
		message: `hola ${i}`,
		created_at: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(),
	};
}

describe("GET /api/auth/super-admin-user", () => {
	it("pide una página acotada y ordenada, y avisa si quedan más", async () => {
		const rows = Array.from({ length: 3 }, (_, i) => ({ id: i, email: `u${i}@x.cl`, role: "cashier" }));
		adminHolder.current = makeAdminMock({ tables: { users: [{ data: rows, error: null }] } });
		const res = await listUsers(new NextRequest("http://localhost/api/auth/super-admin-user?companyId=c1&limit=2"));
		const body = (await res.json()) as { users: unknown[]; hasMore: boolean };
		expect(body.users).toHaveLength(2);
		expect(body.hasMore).toBe(true);
		const chain = adminHolder.current.chains[0].chain;
		expect(chain.order).toHaveBeenCalledWith("email", { ascending: true });
		expect(chain.range).toHaveBeenCalledWith(0, 2);
	});

	it("sin parámetros usa el tope de 500 y no deja pedir más", async () => {
		adminHolder.current = makeAdminMock({ tables: { users: [{ data: [], error: null }] } });
		await listUsers(new NextRequest("http://localhost/api/auth/super-admin-user?companyId=c1&limit=100000"));
		expect(adminHolder.current.chains[0].chain.range).toHaveBeenCalledWith(0, 500);
	});
});

describe("GET /api/super-admin/tickets/[id]/messages", () => {
	const ctx = { params: Promise.resolve({ id: "t1" }) };

	beforeEach(() => {
		// La base devuelve los más nuevos primero (orden descendente).
		const rows = Array.from({ length: 201 }, (_, i) => message(300 - i));
		adminHolder.current = makeAdminMock({ tables: { saas_ticket_messages: [{ data: rows, error: null }] } });
	});

	it("devuelve los últimos 200 en orden cronológico y avisa que hay anteriores", async () => {
		const res = await listMessages(new NextRequest("http://localhost/api/super-admin/tickets/t1/messages"), ctx);
		const body = (await res.json()) as { messages: Array<{ id: string }>; hasMore: boolean };
		expect(body.messages).toHaveLength(200);
		expect(body.hasMore).toBe(true);
		expect(body.messages[0].id).toBe("m101");
		expect(body.messages[199].id).toBe("m300");
		const chain = adminHolder.current.chains[0].chain;
		expect(chain.order).toHaveBeenCalledWith("created_at", { ascending: false });
		expect(chain.limit).toHaveBeenCalledWith(201);
	});

	it("`before` trae la página anterior", async () => {
		const before = message(101).created_at;
		await listMessages(
			new NextRequest(`http://localhost/api/super-admin/tickets/t1/messages?before=${encodeURIComponent(before)}`),
			ctx,
		);
		expect(adminHolder.current.chains[0].chain.lt).toHaveBeenCalledWith("created_at", before);
	});
});
