import { describe, expect, it } from "vitest";

import {
	extendSubscriptionEnd,
	isRenewalMonths,
	quoteCoTermCharge,
	quotePlanChange,
	quoteRenewal,
	remainingPaidDays,
	resolveSubscriptionPhase,
	roundUsd,
} from "@/lib/billing/portal-pricing";

const NOW = new Date("2026-09-23T12:00:00.000Z");
const inDays = (days: number) => new Date(NOW.getTime() + days * 86_400_000).toISOString();

describe("remainingPaidDays", () => {
	it("cuenta días enteros hacia arriba", () => {
		expect(remainingPaidDays(inDays(15), NOW)).toBe(15);
		expect(remainingPaidDays(inDays(0.2), NOW)).toBe(1);
	});

	it("sin fecha, fecha inválida o vencida no hay periodo vigente", () => {
		expect(remainingPaidDays(null, NOW)).toBeNull();
		expect(remainingPaidDays("no-es-fecha", NOW)).toBeNull();
		expect(remainingPaidDays(inDays(-1), NOW)).toBeNull();
		expect(remainingPaidDays(NOW.toISOString(), NOW)).toBeNull();
	});
});

describe("extendSubscriptionEnd", () => {
	it("suma desde el vencimiento vigente", () => {
		expect(extendSubscriptionEnd(1, NOW, inDays(10))).toBe(inDays(40));
	});

	it("suma desde hoy si ya venció o no hay fecha", () => {
		expect(extendSubscriptionEnd(3, NOW, inDays(-5))).toBe(inDays(90));
		expect(extendSubscriptionEnd(1, NOW, null)).toBe(inDays(30));
	});
});

describe("resolveSubscriptionPhase", () => {
	it("distingue cada momento de la suscripción", () => {
		expect(resolveSubscriptionPhase("active", inDays(5), NOW)).toBe("active");
		expect(resolveSubscriptionPhase("trial", inDays(5), NOW)).toBe("trial");
		expect(resolveSubscriptionPhase("cancelled", inDays(5), NOW)).toBe("cancelling");
		expect(resolveSubscriptionPhase("payment_pending", inDays(5), NOW)).toBe("payment_pending");
	});

	it("vencida aunque el cron no la haya suspendido todavía", () => {
		expect(resolveSubscriptionPhase("active", inDays(-1), NOW)).toBe("expired");
		expect(resolveSubscriptionPhase("suspended", inDays(20), NOW)).toBe("expired");
		expect(resolveSubscriptionPhase("cancelled", inDays(-3), NOW)).toBe("expired");
		expect(resolveSubscriptionPhase("cancelled", null, NOW)).toBe("expired");
	});

	it("sin vencimiento la gestiona el equipo", () => {
		expect(resolveSubscriptionPhase("active", null, NOW)).toBe("open_ended");
	});
});

describe("quotePlanChange", () => {
	const base = { currentMonthly: 20, endsAt: inDays(15), now: NOW };

	it("subir de plan cobra la diferencia por los días que quedan", () => {
		expect(quotePlanChange({ ...base, phase: "active", targetMonthly: 50 })).toEqual({
			mode: "upgrade",
			monthlyDiff: 30,
			remainingDays: 15,
			amount: 15,
		});
	});

	it("con varios meses pagados por adelantado cobra todos los días restantes", () => {
		const quote = quotePlanChange({ ...base, endsAt: inDays(75), phase: "active", targetMonthly: 26 });
		expect(quote).toMatchObject({ mode: "upgrade", amount: 15 });
	});

	it("bajar de plan se programa al vencimiento", () => {
		expect(quotePlanChange({ ...base, phase: "active", targetMonthly: 10 })).toEqual({
			mode: "downgrade",
			monthlyDiff: -10,
			effectiveAt: base.endsAt,
		});
	});

	it("mismo precio, o durante la prueba, cambia sin cobro", () => {
		expect(quotePlanChange({ ...base, phase: "active", targetMonthly: 20 }).mode).toBe("switch");
		expect(quotePlanChange({ ...base, phase: "trial", targetMonthly: 90 }).mode).toBe("switch");
	});

	it("una diferencia que no llega a un centavo no genera un cobro de 0", () => {
		const quote = quotePlanChange({ ...base, endsAt: inDays(1), phase: "active", targetMonthly: 20.1 });
		expect(quote.mode).toBe("switch");
	});

	it("vencida, cancelada o con el alta sin validar no se cambia de plan aquí", () => {
		for (const phase of ["expired", "cancelling", "payment_pending", "open_ended"] as const) {
			expect(quotePlanChange({ ...base, phase, targetMonthly: 50 })).toMatchObject({ mode: "blocked", reason: phase });
		}
	});
});

describe("quoteRenewal", () => {
	it("suma el plan y los extras mensuales por los meses elegidos", () => {
		const quote = quoteRenewal({
			plan: { label: "Pro", unitMonthly: 29.9 },
			recurring: [
				{ key: "addon:dominio", label: "Dominio propio", unitMonthly: 5, quantity: 1 },
				{ key: "branches", label: "Sucursales extra", unitMonthly: 20, quantity: 2 },
				{ key: "addon:gratis", label: "Incluido", unitMonthly: 0, quantity: 1 },
			],
			months: 3,
			endsAt: inDays(10),
			now: NOW,
		});
		expect(quote.lines.map((line) => [line.key, line.monthly])).toEqual([
			["plan", 29.9],
			["addon:dominio", 5],
			["branches", 40],
		]);
		expect(quote.monthlyTotal).toBe(74.9);
		expect(quote.amount).toBe(224.7);
		expect(quote.startsAt).toBe(inDays(10));
		expect(quote.newEndsAt).toBe(inDays(100));
	});

	it("vencida, los meses corren desde hoy", () => {
		const quote = quoteRenewal({ plan: { label: "Pro", unitMonthly: 10 }, recurring: [], months: 1, endsAt: inDays(-40), now: NOW });
		expect(quote.startsAt).toBe(NOW.toISOString());
		expect(quote.newEndsAt).toBe(inDays(30));
		expect(quote.amount).toBe(10);
	});
});

describe("quoteCoTermCharge", () => {
	it("cobra solo hasta el vencimiento", () => {
		expect(quoteCoTermCharge({ unitMonthly: 20, quantity: 2, endsAt: inDays(15), now: NOW })).toEqual({
			remainingDays: 15,
			amount: 20,
			coversUntil: inDays(15),
		});
	});

	it("sin periodo vigente no se puede sumar un extra", () => {
		expect(quoteCoTermCharge({ unitMonthly: 20, quantity: 1, endsAt: inDays(-1), now: NOW })).toBeNull();
		expect(quoteCoTermCharge({ unitMonthly: 20, quantity: 1, endsAt: null, now: NOW })).toBeNull();
	});
});

describe("helpers", () => {
	it("redondea a centavos y valida los meses de renovación", () => {
		expect(roundUsd(0.1 + 0.2)).toBe(0.3);
		expect(roundUsd(Number.NaN)).toBe(0);
		expect(isRenewalMonths(6)).toBe(true);
		expect(isRenewalMonths("12")).toBe(true);
		expect(isRenewalMonths(2)).toBe(false);
	});
});
