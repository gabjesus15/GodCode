import { beforeEach, describe, expect, it, vi } from "vitest";

const sendEmail = vi.fn(async (_input: unknown) => ({ status: "sent" as const }));
vi.mock("@/lib/email/send", () => ({ sendEmail: (input: unknown) => sendEmail(input) }));
vi.mock("@/lib/onboarding/company-owner", () => ({
	ensureCompanyOwner: async () => ({ ok: true, authUserId: "auth-1", created: true }),
}));
vi.mock("@/lib/onboarding/booking-notifications", () => ({
	queueBookingReminder: async () => {
		throw new Error("sin tickets en el test");
	},
	formatContactDate: () => "",
	getBookingContactDate: () => new Date(),
}));
vi.mock("@/lib/auth/password-setup-link", () => ({ createPasswordSetupLink: async () => "https://www.godcode.me/login/confirmar?x=1" }));
vi.mock("@/lib/onboarding/store-draft-service", () => ({ openStoreDraft: vi.fn() }));

import { formatUsd } from "@/lib/billing/portal-pricing";
import { ensureOnboardingOwnerAccess } from "@/lib/onboarding/complete-onboarding-payment";

const APP = {
	id: "app-1",
	status: "active",
	payment_status: "paid",
	payment_reference: "ORDER-1",
	company_id: "c1",
	plan_id: "plan-pro",
	business_name: "Rica Pizza",
	responsible_name: "Ana",
	email: "dueno@local.com",
	country: "Chile",
	welcome_email_sent_at: null,
	updated_at: "2026-10-23T12:00:00.000Z",
};

function admin(plan: { name: string; features: unknown }, payment: unknown = { amount_paid: 29, months_paid: 1 }) {
	return {
		from: (table: string) => {
			const query: Record<string, unknown> = {};
			for (const method of ["select", "eq", "update", "order", "limit"]) query[method] = () => query;
			const data =
				table === "onboarding_applications"
					? APP
					: table === "companies"
						? { public_slug: "rica-pizza", custom_domain: null, theme_config: {}, subscription_ends_at: "2026-11-23T15:00:00.000Z", country: "Chile" }
						: table === "plans"
							? plan
							: table === "payments_history"
								? payment
								: null;
			query.maybeSingle = async () => ({ data, error: null });
			query.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ data: null, error: null }).then(resolve);
			return query;
		},
	} as never;
}

const welcomeData = () =>
	(sendEmail.mock.calls.map(([input]) => input as { kind: string; data: Record<string, unknown> }).find((input) => input.kind === "welcome")?.data ?? {}) as Record<string, unknown>;

beforeEach(() => sendEmail.mockClear());

describe("bienvenida del alta pagada", () => {
	it("trae lo contratado: plan, lo que pagó, el período y la próxima renovación", async () => {
		const result = await ensureOnboardingOwnerAccess({ supabaseAdmin: admin({ name: "Pro", features: {} }), paymentReference: "ORDER-1" });
		expect(result).toMatchObject({ status: "paid", welcomeSent: true });
		expect(welcomeData().purchase).toEqual({ planName: "Pro", amount: formatUsd(29), period: "1 mes", renewsAt: "23 de noviembre de 2026" });
		expect(welcomeData()).not.toHaveProperty("panelOnly", true);
	});

	it("con «solo panel CEO» la bienvenida no habla de cargar el menú", async () => {
		await ensureOnboardingOwnerAccess({ supabaseAdmin: admin({ name: "Panel", features: { product_mode: "panel_only" } }), paymentReference: "ORDER-1" });
		expect(welcomeData()).toMatchObject({ panelOnly: true });
	});

	it("sin el pago registrado no inventa el resumen", async () => {
		await ensureOnboardingOwnerAccess({ supabaseAdmin: admin({ name: "Pro", features: {} }, null), paymentReference: "ORDER-1" });
		expect(welcomeData().purchase).toBeUndefined();
	});
});
