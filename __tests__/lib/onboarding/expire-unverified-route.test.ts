import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makeAdminMock } from "../menu-account/test-supabase-mock";

const adminHolder = { current: makeAdminMock({ tables: {} }) };
vi.mock("@/lib/infra/supabase-admin", () => ({
	get supabaseAdmin() {
		return adminHolder.current;
	},
}));
vi.mock("@/lib/onboarding/onboarding-bff-proxy", () => ({ forwardOnboardingBilling: vi.fn() }));

import { GET } from "@/app/api/onboarding/expire-unverified/route";

function get(authorization?: string) {
	return GET(
		new NextRequest("http://localhost/api/onboarding/expire-unverified", {
			headers: authorization ? { authorization } : {},
		}),
	);
}

/** El cron de Vercel llama por GET con `Authorization: Bearer CRON_SECRET`. */
describe("GET /api/onboarding/expire-unverified", () => {
	beforeEach(() => {
		vi.stubEnv("CRON_SECRET", "cron-secreto");
		adminHolder.current = makeAdminMock({ tables: { onboarding_applications: [{ data: null, error: null }] } });
	});
	afterEach(() => vi.unstubAllEnvs());

	it("sin CRON_SECRET en el entorno falla cerrado", async () => {
		vi.stubEnv("CRON_SECRET", "");
		expect((await get("Bearer cron-secreto")).status).toBe(503);
		expect(adminHolder.current.from).not.toHaveBeenCalled();
	});

	it("con otro secreto no borra nada", async () => {
		expect((await get("Bearer otro")).status).toBe(401);
		expect(adminHolder.current.from).not.toHaveBeenCalled();
	});

	it("con el secreto del cron borra solo las pendientes de verificación vencidas", async () => {
		const res = await get("Bearer cron-secreto");
		expect(res.status).toBe(200);
		const chain = adminHolder.current.chains[0].chain;
		expect(chain.delete).toHaveBeenCalled();
		expect(chain.eq).toHaveBeenCalledWith("status", "pending_verification");
	});

	it("si la base falla no devuelve el detalle", async () => {
		adminHolder.current = makeAdminMock({
			tables: { onboarding_applications: [{ data: null, error: { message: "relation secreta no existe" } }] },
		});
		const res = await get("Bearer cron-secreto");
		expect(res.status).toBe(500);
		expect(JSON.stringify(await res.json())).not.toContain("secreta");
	});
});
