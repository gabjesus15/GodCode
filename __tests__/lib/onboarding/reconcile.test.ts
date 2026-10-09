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
const alertOnboardingTeam = vi.fn(async (_alert: unknown) => "sent" as string);
vi.mock("@/lib/onboarding/team-alerts", () => ({ alertOnboardingTeam: (alert: unknown) => alertOnboardingTeam(alert) }));
vi.mock("@/lib/email/send", () => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/onboarding/store-draft-service", () => ({ loadPanelOnlyPlanIds: async () => new Set<string>() }));

/** KV en memoria, limpio en cada test (el contador de reintentos vive ahí). */
const kv = new Map<string, number>();
vi.mock("@/lib/infra/kv-store", () => ({
	kvStore: {
		get: async (key: string) => (kv.has(key) ? String(kv.get(key)) : null),
		incr: async (key: string) => {
			kv.set(key, (kv.get(key) ?? 0) + 1);
			return kv.get(key) ?? 0;
		},
		delete: async (key: string) => {
			kv.delete(key);
		},
		set: async () => undefined,
	},
}));

import { MAX_RECLAIM_ATTEMPTS, reconcileOnboarding } from "@/lib/onboarding/reconcile";

type Selected = { data: unknown[] | null; error: { code?: string; message: string } | null };

/**
 * Cada lectura devuelve la siguiente respuesta: primero pagos sin cerrar, luego dueños (y,
 * si la columna falta, la relectura). Las escrituras (`update`) se anotan aparte.
 */
function adminReturning(...results: Array<unknown[] | Selected>) {
	let call = 0;
	const updates: Array<{ patch: Record<string, unknown>; id: unknown }> = [];
	const selects: string[] = [];
	const client = {
		from: () => {
			const query: Record<string, unknown> = {};
			for (const method of ["in", "eq", "lt", "gt", "is", "not", "order"]) query[method] = () => query;
			query.select = (columns: string) => {
				selects.push(columns);
				return query;
			};
			query.limit = async () => {
				const next = results[call++] ?? [];
				return Array.isArray(next) ? { data: next, error: null } : next;
			};
			query.update = (patch: Record<string, unknown>) => ({
				eq: async (_column: string, id: unknown) => {
					updates.push({ patch, id });
					return { error: null };
				},
			});
			return query;
		},
	} as never;
	return { client, updates, selects };
}

const NOW = new Date("2026-10-07T12:00:00.000Z");

const row = (overrides: Record<string, unknown>) => ({
	id: "a1",
	status: "payment_pending",
	payment_status: "pending",
	payment_reference: "ORDER-1",
	business_name: "Rica Pizza",
	email: "a@b.com",
	company_id: null,
	updated_at: "2026-10-06T10:00:00Z",
	reconcile_alerted_at: null,
	...overrides,
});

beforeEach(() => {
	captureOnboardingPayPalOrder.mockReset();
	ensureOnboardingOwnerAccess.mockReset();
	alertOnboardingTeam.mockClear();
	alertOnboardingTeam.mockResolvedValue("sent");
	kv.clear();
});

describe("reconcileOnboarding", () => {
	it("cobra y cierra la orden aprobada de quien cerró la pestaña", async () => {
		captureOnboardingPayPalOrder.mockResolvedValue({ ok: true, ref: "ORDER-1" });
		const summary = await reconcileOnboarding({ supabaseAdmin: adminReturning([row({})], []).client, now: NOW });
		expect(summary).toMatchObject({ paypal_checked: 1, paypal_completed: 1, stuck: 0 });
		expect(alertOnboardingTeam).not.toHaveBeenCalled();
	});

	it("un pago que nadie aprobó no se avisa: es un abandono", async () => {
		captureOnboardingPayPalOrder.mockResolvedValue({ ok: false, code: "not_completed", error: "x", status: 409 });
		const summary = await reconcileOnboarding({ supabaseAdmin: adminReturning([row({})], []).client, now: NOW });
		expect(summary.stuck).toBe(0);
		expect(alertOnboardingTeam).not.toHaveBeenCalled();
	});

	it("avisa del cobro sin cuenta y del pago manual que quedó a medias, y anota el aviso", async () => {
		captureOnboardingPayPalOrder.mockResolvedValue({ ok: false, code: "charged_not_applied", error: "falló", status: 500 });
		const { client, updates } = adminReturning([row({}), row({ id: "a2", payment_status: "paid", payment_reference: "manual-a2-1" })], []);
		const summary = await reconcileOnboarding({ supabaseAdmin: client, now: NOW });
		expect(summary.stuck).toBe(2);
		expect(alertOnboardingTeam).toHaveBeenCalledTimes(2);
		expect(captureOnboardingPayPalOrder).toHaveBeenCalledTimes(1);
		expect(updates).toEqual([
			{ patch: { reconcile_alerted_at: NOW.toISOString() }, id: "a1" },
			{ patch: { reconcile_alerted_at: NOW.toISOString() }, id: "a2" },
		]);
		// El aviso no mueve `updated_at`: de él dependen las ventanas del barrido.
		expect(updates.every((u) => !("updated_at" in u.patch))).toBe(true);
	});

	it("reintenta el acceso del dueño de una empresa ya pagada", async () => {
		ensureOnboardingOwnerAccess.mockResolvedValue({ status: "paid", companyId: "c1", ownerReady: true, welcomeSent: true });
		const summary = await reconcileOnboarding({
			supabaseAdmin: adminReturning([], [row({ status: "active", payment_status: "paid", company_id: "c1" })]).client,
			now: NOW,
		});
		expect(summary).toMatchObject({ owners_checked: 1, owners_fixed: 1, stuck: 0 });
	});

	it("avisa de cada alta trabada como mucho una vez al día", async () => {
		const stuckRow = (alertedAt: string) => row({ id: "a9", payment_status: "paid", payment_reference: "manual-a9-1", reconcile_alerted_at: alertedAt });

		const recent = adminReturning([stuckRow("2026-10-07T09:00:00.000Z")], []);
		const quiet = await reconcileOnboarding({ supabaseAdmin: recent.client, now: NOW });
		expect(quiet).toMatchObject({ stuck: 1, alerts_sent: 0, alerts_skipped: 1 });
		expect(alertOnboardingTeam).not.toHaveBeenCalled();
		expect(recent.updates).toHaveLength(0);

		const yesterday = adminReturning([stuckRow("2026-10-06T11:00:00.000Z")], []);
		const again = await reconcileOnboarding({ supabaseAdmin: yesterday.client, now: NOW });
		expect(again).toMatchObject({ stuck: 1, alerts_sent: 1, alerts_skipped: 0 });
		expect(yesterday.updates).toHaveLength(1);
	});

	it("si Telegram rechazó el aviso, no lo da por avisado", async () => {
		alertOnboardingTeam.mockResolvedValue("failed");
		const { client, updates } = adminReturning([row({ payment_status: "paid", payment_reference: "manual-a1-1" })], []);
		await reconcileOnboarding({ supabaseAdmin: client, now: NOW });
		expect(alertOnboardingTeam).toHaveBeenCalledTimes(1);
		expect(updates).toHaveLength(0);
	});

	it(`deja de reprovisionar un alta cobrada después de ${MAX_RECLAIM_ATTEMPTS} intentos`, async () => {
		captureOnboardingPayPalOrder.mockResolvedValue({ ok: false, code: "charged_not_applied", error: "falló", status: 500 });
		for (let run = 0; run < MAX_RECLAIM_ATTEMPTS; run += 1) {
			await reconcileOnboarding({ supabaseAdmin: adminReturning([row({ payment_status: "paid" })], []).client, now: NOW });
		}
		expect(captureOnboardingPayPalOrder).toHaveBeenCalledTimes(MAX_RECLAIM_ATTEMPTS);

		const capped = await reconcileOnboarding({ supabaseAdmin: adminReturning([row({ payment_status: "paid" })], []).client, now: NOW });
		expect(captureOnboardingPayPalOrder).toHaveBeenCalledTimes(MAX_RECLAIM_ATTEMPTS);
		expect(capped).toMatchObject({ stuck: 1, retries_capped: 1, paypal_checked: 0 });
	});

	it("un cierre que por fin sale borra el contador", async () => {
		captureOnboardingPayPalOrder.mockResolvedValueOnce({ ok: false, code: "charged_not_applied", error: "falló", status: 500 });
		await reconcileOnboarding({ supabaseAdmin: adminReturning([row({})], []).client, now: NOW });
		expect(kv.size).toBe(1);
		captureOnboardingPayPalOrder.mockResolvedValueOnce({ ok: true, ref: "ORDER-1" });
		await reconcileOnboarding({ supabaseAdmin: adminReturning([row({})], []).client, now: NOW });
		expect(kv.size).toBe(0);
	});

	it("sin la columna reconcile_alerted_at el barrido sigue y avisa como antes", async () => {
		const missing: Selected = {
			data: null,
			error: { code: "42703", message: "column onboarding_applications.reconcile_alerted_at does not exist" },
		};
		const stuckRow = row({ payment_status: "paid", payment_reference: "manual-a1-1" });
		const { client, updates, selects } = adminReturning(missing, [stuckRow], []);

		const summary = await reconcileOnboarding({ supabaseAdmin: client, now: NOW });

		expect(summary).toMatchObject({ stuck: 1, alerts_sent: 1, errors: [] });
		expect(selects[0]).toContain("reconcile_alerted_at");
		expect(selects.slice(1).every((columns) => !columns.includes("reconcile_alerted_at"))).toBe(true);
		expect(updates).toHaveLength(0);
	});
});
