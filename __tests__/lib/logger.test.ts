import { describe, it, expect, vi } from "vitest";
import { createRequestContext, logger, startTimer } from "@/lib/infra/logger";

describe("createRequestContext", () => {
	it("genera un requestId UUID", () => {
		const ctx = createRequestContext("/api/test", "GET");
		expect(ctx.requestId).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
		);
	});

	it("incluye endpoint, method y service por defecto", () => {
		const ctx = createRequestContext("/api/onboarding/checkout", "POST");
		expect(ctx.endpoint).toBe("/api/onboarding/checkout");
		expect(ctx.method).toBe("POST");
		expect(ctx.service).toBe("bff");
	});

	it("permite service personalizado", () => {
		const ctx = createRequestContext("/api/test", "GET", "onboarding-billing");
		expect(ctx.service).toBe("onboarding-billing");
	});
});

describe("logger", () => {
	it("info loguea JSON estructurado a stdout", () => {
		const spy = vi.spyOn(console, "log").mockImplementation(() => {});
		const ctx = createRequestContext("/api/test", "GET");
		logger.info("test_message", ctx, { extra_field: 42 });

		expect(spy).toHaveBeenCalledOnce();
		const parsed = JSON.parse(spy.mock.calls[0][0]);
		expect(parsed.level).toBe("info");
		expect(parsed.message).toBe("test_message");
		expect(parsed.timestamp).toBeDefined();
		expect(parsed.requestId).toBe(ctx.requestId);
		expect(parsed.extra_field).toBe(42);
		spy.mockRestore();
	});

	it("error loguea a stderr", () => {
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});
		logger.error("fail");
		expect(spy).toHaveBeenCalledOnce();
		const parsed = JSON.parse(spy.mock.calls[0][0]);
		expect(parsed.level).toBe("error");
		spy.mockRestore();
	});

	it("warn loguea a console.warn", () => {
		const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
		logger.warn("cuidado");
		expect(spy).toHaveBeenCalledOnce();
		const parsed = JSON.parse(spy.mock.calls[0][0]);
		expect(parsed.level).toBe("warn");
		spy.mockRestore();
	});
});

describe("startTimer", () => {
	it("retorna una funcion que mide milisegundos transcurridos", async () => {
		const elapsed = startTimer();
		await new Promise((r) => setTimeout(r, 50));
		const ms = elapsed();
		expect(ms).toBeGreaterThanOrEqual(40);
		expect(ms).toBeLessThan(200);
	});

	it("retorna un numero entero", () => {
		const elapsed = startTimer();
		const ms = elapsed();
		expect(Number.isInteger(ms)).toBe(true);
	});
});
