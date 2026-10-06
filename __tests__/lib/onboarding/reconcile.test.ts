import { beforeEach, describe, expect, it, vi } from "vitest";

const captureOnboardingPayPalOrder = vi.fn();
vi.mock("@/lib/onboarding/paypal-onboarding", () => ({
	captureOnboardingPayPalOrder: (...args: unknown[]) => captureOnboardingPayPalOrder(...args),
	isChargedFailure: (code: string) => code.startsWith("charged_"),
}));
const ensureOnboardingOwnerAccess = vi.fn();
vi.mock("@/lib/onboarding/complete-onboarding-payment", () => ({
	ensureOnboardingOwnerAccess: (...args: unknown[]) => ensureOnboardingOwnerAccess(...args),
}));
const alertOnboardingTeam = vi.fn(async (_alert: unknown) => undefined);
vi.mock("@/lib/onboarding/team-alerts", () => ({ alertOnboardingTeam: (alert: unknown) => alertOnboardingTeam(alert) }));
vi.mock("@/lib/email/send", () => ({ sendEmail: vi.fn() }));

import { reconcileOnboarding } from "@/lib/onboarding/reconcile";

/** Cada consulta devuelve la siguiente lista: primero pagos sin cerrar, luego dueños. */
function adminReturning(...results: unknown[][]) {
	let call = 0;
	return {
		from: () => {
			const data = results[call++] ?? [];
			const query: Record<string, unknown> = {};
			for (const method of ["select", "in", "eq", "lt", "gt", "is", "not", "order"]) query[method] = () => query;
			query.limit = async () => ({ data, error: null });
			return query;
		},
	} as never;
}

const row = (overrides: Record<string, unknown>) => ({
	id: "a1",
	status: "payment_pending",
	payment_status: "pending",
	payment_reference: "ORDER-1",
	business_name: "Rica Pizza",
	email: "a@b.com",
	company_id: null,
	updated_at: "2026-10-06T10:00:00Z",
	...overrides,
});

beforeEach(() => {
	captureOnboardingPayPalOrder.mockReset();
	ensureOnboardingOwnerAccess.mockReset();
	alertOnboardingTeam.mockClear();
});

describe("reconcileOnboarding", () => {
	it("cobra y cierra la orden aprobada de quien cerró la pestaña", async () => {
		captureOnboardingPayPalOrder.mockResolvedValue({ ok: true, ref: "ORDER-1" });
		const summary = await reconcileOnboarding({ supabaseAdmin: adminReturning([row({})], []) });
		expect(summary).toMatchObject({ paypal_checked: 1, paypal_completed: 1, stuck: 0 });
		expect(alertOnboardingTeam).not.toHaveBeenCalled();
	});

	it("un pago que nadie aprobó no se avisa: es un abandono", async () => {
		captureOnboardingPayPalOrder.mockResolvedValue({ ok: false, code: "not_completed", error: "x", status: 409 });
		const summary = await reconcileOnboarding({ supabaseAdmin: adminReturning([row({})], []) });
		expect(summary.stuck).toBe(0);
		expect(alertOnboardingTeam).not.toHaveBeenCalled();
	});

	it("avisa del cobro sin cuenta y del pago manual que quedó a medias", async () => {
		captureOnboardingPayPalOrder.mockResolvedValue({ ok: false, code: "charged_not_applied", error: "falló", status: 500 });
		const summary = await reconcileOnboarding({
			supabaseAdmin: adminReturning([row({}), row({ id: "a2", payment_status: "paid", payment_reference: "manual-a2-1" })], []),
		});
		expect(summary.stuck).toBe(2);
		expect(alertOnboardingTeam).toHaveBeenCalledTimes(2);
		expect(captureOnboardingPayPalOrder).toHaveBeenCalledTimes(1);
	});

	it("reintenta el acceso del dueño de una empresa ya pagada", async () => {
		ensureOnboardingOwnerAccess.mockResolvedValue({ status: "paid", companyId: "c1", ownerReady: true, welcomeSent: true });
		const summary = await reconcileOnboarding({
			supabaseAdmin: adminReturning([], [row({ status: "active", payment_status: "paid", company_id: "c1" })]),
		});
		expect(summary).toMatchObject({ owners_checked: 1, owners_fixed: 1, stuck: 0 });
	});
});
