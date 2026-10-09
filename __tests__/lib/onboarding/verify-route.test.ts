import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/** La solicitud que encuentra el token (o `null`) y los cambios que se le hacen. */
const db: { app: Record<string, unknown> | null; updates: Array<Record<string, unknown>> } = { app: null, updates: [] };

vi.mock("@/lib/infra/supabase-admin", () => ({
	supabaseAdmin: {
		from: () => {
			const query: Record<string, unknown> = {};
			for (const method of ["select", "eq"]) query[method] = () => query;
			query.update = (patch: Record<string, unknown>) => {
				db.updates.push(patch);
				return { eq: async () => ({ error: null }) };
			};
			query.maybeSingle = async () => ({ data: db.app, error: null });
			return query;
		},
	},
}));
vi.mock("@/lib/onboarding/team-alerts", () => ({ alertOnboardingTeam: async () => undefined }));
const isPanelOnlyPlan = vi.fn(async (_client: unknown, _planId: unknown) => false);
vi.mock("@/lib/onboarding/store-draft-service", () => ({
	isPanelOnlyPlan: (client: unknown, planId: unknown) => isPanelOnlyPlan(client, planId),
}));

import { GET } from "@/services/onboarding-billing/app/api/onboarding/verify/route";

function verify(token: string) {
	return GET(new NextRequest(`http://localhost/api/onboarding/verify?token=${encodeURIComponent(token)}`));
}

const APP = {
	id: "a1",
	status: "pending_verification",
	email_verified_at: null,
	business_name: "Rica Pizza",
	responsible_name: "Ana",
	email: "dueno@local.com",
	phone: null,
	plan_id: "plan-panel",
};

beforeEach(() => {
	db.app = { ...APP };
	db.updates = [];
	isPanelOnlyPlan.mockReset();
	isPanelOnlyPlan.mockResolvedValue(false);
});

describe("GET /api/onboarding/verify", () => {
	it("con «solo panel CEO» lo dice, para que la página ofrezca elegir el plan", async () => {
		isPanelOnlyPlan.mockResolvedValue(true);
		const res = await verify("tok");
		expect(res.status).toBe(200);
		expect(await res.json()).toMatchObject({ ok: true, token: "tok", panelOnly: true });
		expect(isPanelOnlyPlan).toHaveBeenCalledWith(expect.anything(), "plan-panel");
		expect(db.updates[0]).toMatchObject({ status: "email_verified" });
	});

	it("con un plan con tienda, panelOnly es false", async () => {
		const res = await verify("tok");
		expect(await res.json()).toMatchObject({ ok: true, panelOnly: false });
	});

	it("si no se puede leer el plan, el correo queda confirmado igual y sin la variante", async () => {
		isPanelOnlyPlan.mockRejectedValue(new Error("sin base"));
		const res = await verify("tok");
		expect(res.status).toBe(200);
		expect(await res.json()).toMatchObject({ ok: true, panelOnly: false });
		expect(db.updates).toHaveLength(1);
	});

	it("un token que no existe responde 404 sin consultar el plan", async () => {
		db.app = null;
		const res = await verify("otro");
		expect(res.status).toBe(404);
		expect(isPanelOnlyPlan).not.toHaveBeenCalled();
	});
});
