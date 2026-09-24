import { describe, expect, it } from "vitest";

import { calendarDaysUntil } from "@/lib/email/format";
import {
	planLifecycleEmails,
	type LifecycleApplication,
	type LifecycleCompany,
	type LifecycleOrder,
	type PlannedEmail,
} from "@/lib/email/lifecycle-plan";

// 23 de septiembre de 2026, 09:00 en Santiago (UTC-3).
const NOW = new Date("2026-09-23T12:00:00.000Z");
const at = (isoDay: string, hourUtc = 15) => `${isoDay}T${String(hourUtc).padStart(2, "0")}:00:00.000Z`;
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();

function company(id: string, endsAt: string | null, status = "active", country = "CL"): LifecycleCompany {
	return { id, country, status, endsAt };
}

function plan(parts: { companies?: LifecycleCompany[]; orders?: LifecycleOrder[]; applications?: LifecycleApplication[] }): PlannedEmail[] {
	return planLifecycleEmails({ companies: parts.companies ?? [], orders: parts.orders ?? [], applications: parts.applications ?? [] }, NOW);
}

function byCompany(planned: PlannedEmail[]) {
	return Object.fromEntries(planned.filter((item) => "companyId" in item).map((item) => [(item as { companyId: string }).companyId, item]));
}

describe("recordatorios de vencimiento", () => {
	it("avisa a 7, 3 y 1 día (un aviso por tramo), el mismo día que vence, y nada a 8 días", () => {
		const result = byCompany(
			plan({
				companies: [
					company("d8", at("2026-10-01")),
					company("d7", at("2026-09-30")),
					company("d5", at("2026-09-28")),
					company("d3", at("2026-09-26")),
					company("d1", at("2026-09-24")),
					company("d0", at("2026-09-23", 22)),
				],
			}),
		);

		expect(result.d8).toBeUndefined();
		expect(result.d7).toMatchObject({ kind: "renewal_reminder", daysLeft: 7, dedupeKey: "renewal:d7:2026-09-30:7" });
		// Entre tramos se usa la clave del tramo: si el aviso de 7 días ya salió, no se repite.
		expect(result.d5).toMatchObject({ dedupeKey: "renewal:d5:2026-09-28:7" });
		expect(result.d3).toMatchObject({ daysLeft: 3, dedupeKey: "renewal:d3:2026-09-26:3" });
		expect(result.d1).toMatchObject({ daysLeft: 1, dedupeKey: "renewal:d1:2026-09-24:1" });
		expect(result.d0).toMatchObject({ daysLeft: 0, dedupeKey: "renewal:d0:2026-09-23:1" });
	});

	it("marca las pruebas gratis y no toca planes sin vencimiento ni pendientes de pago", () => {
		const result = byCompany(
			plan({
				companies: [
					company("trial", at("2026-09-26"), "trial"),
					company("open", null),
					company("pending", at("2026-09-26"), "payment_pending"),
				],
			}),
		);

		expect(result.trial).toMatchObject({ kind: "renewal_reminder", trial: true });
		expect(result.open).toBeUndefined();
		expect(result.pending).toBeUndefined();
	});

	it("cuenta días de calendario en la zona del negocio", () => {
		// 00:30 del 24 en Santiago = 23:30 del 23 en Caracas.
		const endsAt = "2026-09-24T03:30:00.000Z";
		expect(calendarDaysUntil(endsAt, NOW, "America/Santiago")).toBe(1);
		expect(calendarDaysUntil(endsAt, NOW, "America/Caracas")).toBe(0);

		const result = byCompany(plan({ companies: [company("cl", endsAt, "active", "CL"), company("ve", endsAt, "active", "VE")] }));
		expect(result.cl).toMatchObject({ daysLeft: 1 });
		expect(result.ve).toMatchObject({ daysLeft: 0 });
	});

	it("con un comprobante de renovación en revisión no recuerda nada", () => {
		const result = plan({
			companies: [company("review", at("2026-09-26"))],
			orders: [{ id: "o1", companyId: "review", status: "pending_validation", reference: "RENEW-1-A", createdAt: daysAgo(1), receiptUrl: "https://x/y.jpg" }],
		});

		expect(result).toEqual([]);
	});
});

describe("cancelaciones y vencidos", () => {
	it("un plan cancelado recibe un solo aviso en los últimos 3 días", () => {
		const result = byCompany(
			plan({ companies: [company("c2", at("2026-09-25"), "cancelled"), company("c5", at("2026-09-28"), "cancelled")] }),
		);

		expect(result.c2).toMatchObject({ kind: "cancellation_reminder", daysLeft: 2, dedupeKey: "cancel-ending:c2:2026-09-25" });
		expect(result.c5).toBeUndefined();
	});

	it("vencido sin renovar: el día que vence, a los 3 y a los 10 días, y nada fuera de esas ventanas", () => {
		const result = byCompany(
			plan({
				companies: [
					company("e1", at("2026-09-22"), "suspended"),
					company("e4", at("2026-09-19"), "suspended"),
					company("e8", at("2026-09-15"), "suspended"),
					company("e11", at("2026-09-12"), "suspended"),
					company("e30", at("2026-08-24"), "suspended"),
				],
			}),
		);

		expect(result.e1).toMatchObject({ kind: "subscription_expired", followup: 0, dedupeKey: "expired:e1:2026-09-22:0" });
		expect(result.e4).toMatchObject({ followup: 1 });
		expect(result.e8).toBeUndefined();
		expect(result.e11).toMatchObject({ followup: 2 });
		expect(result.e30).toBeUndefined();
	});

	it("un plan cancelado que termina recibe «terminó», no los avisos de vencido", () => {
		const result = byCompany(
			plan({ companies: [company("end1", at("2026-09-22"), "cancelled"), company("end5", at("2026-09-18"), "cancelled")] }),
		);

		expect(result.end1).toMatchObject({ kind: "subscription_ended", dedupeKey: "ended:end1:2026-09-22" });
		expect(result.end5).toBeUndefined();
	});
});

describe("pagos sin completar", () => {
	const order = (id: string, age: number, extra: Partial<LifecycleOrder> = {}): LifecycleOrder => ({
		id,
		companyId: "co",
		status: "pending",
		reference: "ADDON-3f0c9b1e-7a51-4c1b-9d3e-2b8f6a4c5d10-M1-AB12",
		createdAt: daysAgo(age),
		receiptUrl: null,
		...extra,
	});

	it("recuerda al día siguiente y a los 4 días, nunca antes ni después", () => {
		const result = plan({ orders: [order("hoy", 0), order("d1", 1), order("d4", 4), order("d7", 7)] });

		expect(result.map((item) => item.dedupeKey)).toEqual(["order:d1:1", "order:d4:2"]);
	});

	it("no recuerda comprobantes en revisión ni pedidos que no son del portal", () => {
		const result = plan({
			orders: [
				order("review", 1, { status: "pending_validation", receiptUrl: "https://x/y.jpg" }),
				order("alta", 1, { reference: "manual-123" }),
			],
		});

		expect(result).toEqual([]);
	});

	it("si ese día ya sale el aviso de vencimiento, no manda además el de la renovación pendiente", () => {
		const result = plan({
			companies: [company("co", at("2026-09-26"))],
			orders: [order("renew", 1, { reference: "RENEW-1-AB" }), order("extra", 1)],
		});

		expect(result.map((item) => item.kind)).toEqual(["renewal_reminder", "order_pending"]);
		expect(result[1]).toMatchObject({ orderId: "extra" });
	});
});

describe("altas a medias", () => {
	const app = (id: string, status: string, age: number, extra: Partial<LifecycleApplication> = {}): LifecycleApplication => ({
		id,
		status,
		paymentStatus: null,
		receiptUrl: null,
		lastActivityAt: daysAgo(age),
		country: "CL",
		...extra,
	});

	it("con el correo confirmado falta el plan; con el formulario hecho, el pago", () => {
		const result = plan({ applications: [app("a1", "email_verified", 1), app("a2", "form_completed", 3), app("a3", "payment_pending", 2)] });

		expect(result).toEqual([
			{ kind: "onboarding_resume", applicationId: "a1", dedupeKey: "resume:a1:1", step: "plan", attempt: 1 },
			{ kind: "onboarding_resume", applicationId: "a2", dedupeKey: "resume:a2:2", step: "payment", attempt: 2 },
			{ kind: "onboarding_resume", applicationId: "a3", dedupeKey: "resume:a3:1", step: "payment", attempt: 1 },
		]);
	});

	it("no insiste con comprobantes enviados, pagos hechos, correos sin confirmar ni altas viejas", () => {
		const result = plan({
			applications: [
				app("receipt", "payment_pending", 1, { receiptUrl: "https://x/y.jpg", paymentStatus: "pending_validation" }),
				app("paid", "payment_pending", 1, { paymentStatus: "paid" }),
				app("unverified", "pending_verification", 1),
				app("old", "email_verified", 9),
				app("fresh", "email_verified", 0),
			],
		});

		expect(result).toEqual([]);
	});
});
