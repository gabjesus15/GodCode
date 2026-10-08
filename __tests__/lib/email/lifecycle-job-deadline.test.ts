import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeAdminMock } from "../menu-account/test-supabase-mock";

const sendEmail = vi.fn(async (..._args: unknown[]) => ({ status: "sent" as const, id: "re_1" }));

vi.mock("@/lib/infra/supabase-admin", () => ({ supabaseAdmin: {} }));
vi.mock("@/lib/email/send", () => ({ sendEmail: (...args: unknown[]) => sendEmail(...args) }));
vi.mock("@/lib/email/lifecycle-plan", () => ({
	planLifecycleEmails: () => [
		{ kind: "onboarding_resume", applicationId: "app-1", dedupeKey: "resume:app-1:1", step: "plan", attempt: 1 },
		{ kind: "onboarding_resume", applicationId: "app-2", dedupeKey: "resume:app-2:1", step: "plan", attempt: 1 },
	],
}));

import { runLifecycleEmails } from "@/lib/email/lifecycle-job";

function client() {
	return makeAdminMock({
		tables: {
			companies: [{ data: [], error: null }],
			payments_history: [{ data: [], error: null }],
			plans: [{ data: [], error: null }],
			onboarding_applications: [
				{ data: [], error: null },
				{ data: { email: "ana@example.com", verification_token: "tok", business_name: "Ana" }, error: null },
			],
		},
	}) as unknown as SupabaseClient;
}

/**
 * La función del cron tiene 60 s. Si Vercel la corta a mitad de un envío, la reserva
 * queda en "sending" y ese correo no sale nunca: la corrida para antes y deja el resto.
 */
describe("runLifecycleEmails con hora límite", () => {
	beforeEach(() => sendEmail.mockClear());

	it("sin tiempo no empieza ningún correo y marca la corrida como incompleta", async () => {
		const report = await runLifecycleEmails({ client: client(), mode: "on", deadlineMs: Date.now() + 1_000 });
		expect(sendEmail).not.toHaveBeenCalled();
		expect(report.stoppedEarly).toBe(true);
		expect(report.items.map((item) => item.status)).toEqual(["skipped", "skipped"]);
	});

	it("con tiempo manda todo, cada uno con su clave de dedupe", async () => {
		const report = await runLifecycleEmails({ client: client(), mode: "on", deadlineMs: Date.now() + 60_000 });
		expect(report.stoppedEarly).toBe(false);
		expect(report.sent).toBe(2);
		expect(sendEmail.mock.calls.map((call) => (call[0] as { dedupeKey: string }).dedupeKey)).toEqual([
			"resume:app-1:1",
			"resume:app-2:1",
		]);
	});
});
