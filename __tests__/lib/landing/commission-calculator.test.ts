import { describe, expect, it } from "vitest";

import { estimateCommissions, parseMoneyInput } from "@/lib/landing/commission-calculator";

describe("estimateCommissions", () => {
	it("calcula la comisión mensual, anual y los escenarios netos", () => {
		const result = estimateCommissions({ monthlySales: 4000, commissionPercent: 25, planMonthlyPrice: 19 });
		expect(result.monthlyCommission).toBe(1000);
		expect(result.yearlyCommission).toBe(12000);
		expect(result.scenarios.map((s) => [s.share, s.commissionSaved, s.netMonthly])).toEqual([
			[0.3, 300, 281],
			[0.5, 500, 481],
			[1, 1000, 981],
		]);
	});

	it("deja el ahorro neto negativo cuando el volumen no cubre el plan", () => {
		const result = estimateCommissions({ monthlySales: 100, commissionPercent: 10, planMonthlyPrice: 19 });
		expect(result.scenarios[0].netMonthly).toBeLessThan(0);
	});

	it("limita la comisión a un rango razonable y tolera entradas vacías", () => {
		expect(estimateCommissions({ monthlySales: 1000, commissionPercent: 90, planMonthlyPrice: 0 }).monthlyCommission).toBe(400);
		expect(estimateCommissions({ monthlySales: Number.NaN, commissionPercent: 25, planMonthlyPrice: 19 }).monthlyCommission).toBe(0);
	});
});

describe("parseMoneyInput", () => {
	it("lee pesos chilenos con puntos de miles", () => {
		expect(parseMoneyInput("$ 1.250.000", "CLP")).toBe(1250000);
	});

	it("lee dólares con decimales en cualquiera de los dos formatos", () => {
		expect(parseMoneyInput("4,500.50", "USD")).toBe(4500.5);
		expect(parseMoneyInput("4.500,50", "USD")).toBe(4500.5);
		expect(parseMoneyInput("4500", "USD")).toBe(4500);
	});

	it("devuelve 0 sin dígitos", () => {
		expect(parseMoneyInput("", "USD")).toBe(0);
		expect(parseMoneyInput("abc", "CLP")).toBe(0);
	});
});
