import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeAdminMock } from "../menu-account/test-supabase-mock";

type AdminMock = ReturnType<typeof makeAdminMock>;

const holder = vi.hoisted(() => ({ admin: undefined as unknown as { from: unknown } }));

vi.mock("@/lib/infra/supabase-admin", () => ({
	get supabaseAdmin() {
		return holder.admin;
	},
}));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("@/lib/tenant/customer-account-rate-limit", () => ({
	assertCustomerAccountRateLimit: vi.fn(async () => null),
}));
vi.mock("@/lib/tenant/customer-account-context", () => ({
	getCustomerAccountContext: vi.fn(async () => ({
		authUserId: "auth-1",
		userId: "user-1",
		email: "ceo@local.cl",
		companyId: "acme",
		role: "ceo",
	})),
}));

import { PATCH } from "@/app/api/customer-account/branches/contact/route";

const BRANCH_ID = "33333333-3333-4333-8333-333333333333";

function setup(branchCountry: string | null = "CL"): AdminMock {
	const admin = makeAdminMock({
		tables: {
			branches: [{ data: { company_id: "acme", country: branchCountry }, error: null }, { data: null, error: null }],
			companies: [{ data: { country: "Venezuela" }, error: null }],
		},
	});
	holder.admin = admin;
	return admin;
}

function patch(body: Record<string, unknown>) {
	return PATCH(
		new NextRequest("http://localhost/api/customer-account/branches/contact", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id: BRANCH_ID, ...body }),
		}),
	);
}

type Fn = ReturnType<typeof vi.fn>;

function updatePayload(): Record<string, unknown> {
	const chain = (holder.admin as AdminMock).chains.find((entry) => entry.table === "branches" && (entry.chain.update as Fn).mock.calls.length > 0);
	return (chain?.chain.update as Fn).mock.calls[0][0] as Record<string, unknown>;
}

const week = { 1: [{ open: "09:00", close: "18:00" }], 2: [{ open: "09:00", close: "18:00" }] };

describe("PATCH /api/customer-account/branches/contact: horario", () => {
	beforeEach(() => {
		setup();
	});

	it("borra el horario y el texto que muestra la tienda cuando el asistente manda null", async () => {
		const res = await patch({ business_hours: null, schedule: "" });
		expect(res.status).toBe(200);
		expect(updatePayload()).toMatchObject({ business_hours: null, schedule: null });
		// Para borrar no hace falta saber el país.
		expect((holder.admin as AdminMock).fromCalls).not.toContain("companies");
	});

	it("con días guarda la zona del país de la sucursal y reescribe el texto", async () => {
		const res = await patch({ business_hours: { enabled: true, timezone: "Europe/Madrid", week } });
		expect(res.status).toBe(200);
		const payload = updatePayload();
		expect(payload.business_hours).toMatchObject({ enabled: true, timezone: "America/Santiago" });
		expect(payload.schedule).toBe("Lun y Mar: 09:00 a 18:00");
	});

	it("sin país en la sucursal usa el del negocio", async () => {
		setup(null);
		const res = await patch({ business_hours: { enabled: false, timezone: null, week } });
		expect(res.status).toBe(200);
		expect(updatePayload().business_hours).toMatchObject({ timezone: "America/Caracas" });
	});

	it("rechaza la pausa automática sin días", async () => {
		const res = await patch({ business_hours: { enabled: true, timezone: null, week: {} } });
		expect(res.status).toBe(400);
		expect(await res.json()).toMatchObject({ field: "business_hours" });
	});
});
