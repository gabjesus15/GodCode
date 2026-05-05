import { describe, it, expect, beforeEach, vi } from "vitest";

const REQUIRED_KEYS = [
	"NEXT_PUBLIC_SUPABASE_URL",
	"NEXT_PUBLIC_SUPABASE_ANON_KEY",
	"SUPABASE_SERVICE_ROLE_KEY",
	"NEXT_PUBLIC_TENANT_BASE_DOMAIN",
];

const OPTIONAL_KEYS = ["STRIPE_SECRET_KEY", "RESEND_API_KEY", "RESEND_FROM"];

function freshValidateEnv() {
	vi.resetModules();
	return import("@/lib/infra/env").then((m) => m.validateEnv);
}

function setEnvFull() {
	for (const k of [...REQUIRED_KEYS, ...OPTIONAL_KEYS]) {
		process.env[k] = "test-value";
	}
}

describe("validateEnv", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllEnvs();
		for (const k of [...REQUIRED_KEYS, ...OPTIONAL_KEYS]) {
			delete process.env[k];
		}
		delete process.env.NEXT_PHASE;
		delete process.env.CI;
		vi.stubEnv("NODE_ENV", "test");
	});

	it("no lanza error cuando todas las variables requeridas estan definidas", async () => {
		setEnvFull();
		const validateEnv = await freshValidateEnv();
		expect(() => validateEnv()).not.toThrow();
	});

	it("loguea error cuando faltan variables requeridas en desarrollo", async () => {
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});
		const validateEnv = await freshValidateEnv();
		validateEnv();
		expect(spy).toHaveBeenCalledWith(
			expect.stringContaining("Variables obligatorias faltantes")
		);
	});

	it("lanza Error en produccion cuando faltan variables requeridas", async () => {
		vi.stubEnv("NODE_ENV", "production");
		const validateEnv = await freshValidateEnv();
		expect(() => validateEnv()).toThrow("Variables obligatorias faltantes");
	});

	it("NO lanza en produccion si NEXT_PHASE es build", async () => {
		vi.stubEnv("NODE_ENV", "production");
		process.env.NEXT_PHASE = "phase-production-build";
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});
		const validateEnv = await freshValidateEnv();
		expect(() => validateEnv()).not.toThrow();
		expect(spy).toHaveBeenCalled();
	});

	it("NO lanza en produccion si CI es true", async () => {
		vi.stubEnv("NODE_ENV", "production");
		process.env.CI = "true";
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});
		const validateEnv = await freshValidateEnv();
		expect(() => validateEnv()).not.toThrow();
		expect(spy).toHaveBeenCalled();
	});

	it("loguea warning cuando faltan variables opcionales", async () => {
		for (const k of REQUIRED_KEYS) process.env[k] = "val";
		const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const validateEnv = await freshValidateEnv();
		validateEnv();
		expect(spy).toHaveBeenCalledWith(
			expect.stringContaining("Variables opcionales no definidas")
		);
	});

	it("solo valida una vez (cache)", async () => {
		setEnvFull();
		const validateEnv = await freshValidateEnv();
		validateEnv();
		for (const k of REQUIRED_KEYS) delete process.env[k];
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});
		validateEnv();
		expect(spy).not.toHaveBeenCalled();
	});
});
