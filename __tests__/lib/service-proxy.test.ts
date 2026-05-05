import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

describe("proxyToOnboardingBilling", () => {
	beforeEach(() => {
		vi.resetModules();
		vi.restoreAllMocks();
		delete process.env.FF_ONBOARDING_BILLING_EXTERNAL;
		delete process.env.ONBOARDING_BILLING_SERVICE_URL;
		delete process.env.SERVICE_API_KEY;
	});

	async function getProxy() {
		const mod = await import("@/lib/onboarding/service-proxy");
		return mod.proxyToOnboardingBilling;
	}

	function makeReq(method = "GET", url = "http://localhost:3000/api/onboarding/addons") {
		return new NextRequest(url, { method });
	}

	it("retorna null cuando el feature flag esta desactivado", async () => {
		process.env.FF_ONBOARDING_BILLING_EXTERNAL = "false";
		const proxy = await getProxy();
		const result = await proxy(makeReq(), "/api/onboarding/addons");
		expect(result).toBeNull();
	});

	it("retorna 503 cuando no hay base URL y el proxy esta activo (modo on)", async () => {
		process.env.FF_ONBOARDING_BILLING_EXTERNAL = "true";
		const proxy = await getProxy();
		const result = await proxy(makeReq(), "/api/onboarding/addons");
		expect(result).not.toBeNull();
		expect(result!.status).toBe(503);
	});

	it("hace proxy con headers correctos cuando el flag esta activo", async () => {
		process.env.FF_ONBOARDING_BILLING_EXTERNAL = "true";
		process.env.ONBOARDING_BILLING_SERVICE_URL = "http://localhost:3001";
		process.env.SERVICE_API_KEY = "test-key-123";

		const mockResponse = new Response(JSON.stringify({ ok: true }), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
		const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(mockResponse);
		vi.spyOn(console, "log").mockImplementation(() => {});

		const proxy = await getProxy();
		const result = await proxy(makeReq(), "/api/onboarding/addons");

		expect(result).not.toBeNull();
		expect(result!.status).toBe(200);
		expect(result!.headers.get("x-proxied-to")).toBe("onboarding-billing");
		expect(result!.headers.get("x-proxy-duration-ms")).toBeDefined();

		const [calledUrl, calledInit] = fetchSpy.mock.calls[0];
		expect(calledUrl).toBe("http://localhost:3001/api/onboarding/addons");
		expect((calledInit!.headers as Headers).get("x-internal-api-key")).toBe("test-key-123");
	});

	it("propaga query params al upstream", async () => {
		process.env.FF_ONBOARDING_BILLING_EXTERNAL = "true";
		process.env.ONBOARDING_BILLING_SERVICE_URL = "http://localhost:3001";
		process.env.SERVICE_API_KEY = "k";

		const mockResponse = new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
		const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(mockResponse);
		vi.spyOn(console, "log").mockImplementation(() => {});

		const proxy = await getProxy();
		const req = makeReq("GET", "http://localhost:3000/api/onboarding/addons?plan=basic");
		await proxy(req, "/api/onboarding/addons");

		expect(fetchSpy.mock.calls[0][0]).toBe("http://localhost:3001/api/onboarding/addons?plan=basic");
	});

	it("envia body en peticiones POST", async () => {
		process.env.FF_ONBOARDING_BILLING_EXTERNAL = "true";
		process.env.ONBOARDING_BILLING_SERVICE_URL = "http://localhost:3001";
		process.env.SERVICE_API_KEY = "k";

		const mockResponse = new Response("{}", { status: 201, headers: { "content-type": "application/json" } });
		const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(mockResponse);
		vi.spyOn(console, "log").mockImplementation(() => {});

		const proxy = await getProxy();
		const req = new NextRequest("http://localhost:3000/api/onboarding/checkout", {
			method: "POST",
			body: JSON.stringify({ plan: "pro" }),
			headers: { "content-type": "application/json" },
		});
		const result = await proxy(req, "/api/onboarding/checkout");

		expect(result!.status).toBe(201);
		expect((fetchSpy.mock.calls[0][1]!).body).toBe('{"plan":"pro"}');
	});

	it("retorna 502 cuando fetch falla y el proxy esta activo (sin fallback local)", async () => {
		process.env.FF_ONBOARDING_BILLING_EXTERNAL = "true";
		process.env.ONBOARDING_BILLING_SERVICE_URL = "http://localhost:3001";
		process.env.SERVICE_API_KEY = "k";

		vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Connection refused"));
		vi.spyOn(console, "error").mockImplementation(() => {});

		const proxy = await getProxy();
		const result = await proxy(makeReq(), "/api/onboarding/addons");

		expect(result).not.toBeNull();
		expect(result!.status).toBe(502);
		const body = await result!.json();
		expect(body.error).toBe("Microservicio no disponible");
	});

	it("no envia el header host original al upstream", async () => {
		process.env.FF_ONBOARDING_BILLING_EXTERNAL = "true";
		process.env.ONBOARDING_BILLING_SERVICE_URL = "http://localhost:3001";
		process.env.SERVICE_API_KEY = "k";

		const mockResponse = new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
		const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(mockResponse);
		vi.spyOn(console, "log").mockImplementation(() => {});

		const proxy = await getProxy();
		await proxy(makeReq(), "/api/onboarding/addons");

		const sentHeaders = fetchSpy.mock.calls[0][1]!.headers as Headers;
		expect(sentHeaders.get("host")).toBeNull();
	});

	it("proxy_only: retorna 503 si no hay URL configurada", async () => {
		process.env.FF_ONBOARDING_BILLING_EXTERNAL = "proxy_only";
		const proxy = await getProxy();
		const result = await proxy(makeReq(), "/api/onboarding/addons");

		expect(result).not.toBeNull();
		expect(result!.status).toBe(503);
	});

	it("proxy_only: retorna 502 cuando fetch falla (sin fallback)", async () => {
		process.env.FF_ONBOARDING_BILLING_EXTERNAL = "proxy_only";
		process.env.ONBOARDING_BILLING_SERVICE_URL = "http://localhost:3001";
		process.env.SERVICE_API_KEY = "k";

		vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Connection refused"));
		vi.spyOn(console, "error").mockImplementation(() => {});

		const proxy = await getProxy();
		const result = await proxy(makeReq(), "/api/onboarding/addons");

		expect(result).not.toBeNull();
		expect(result!.status).toBe(502);
		const body = await result!.json();
		expect(body.error).toBe("Microservicio no disponible");
	});

	it("proxy_only: incluye x-proxy-mode header", async () => {
		process.env.FF_ONBOARDING_BILLING_EXTERNAL = "proxy_only";
		process.env.ONBOARDING_BILLING_SERVICE_URL = "http://localhost:3001";
		process.env.SERVICE_API_KEY = "k";

		const mockResponse = new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
		vi.spyOn(globalThis, "fetch").mockResolvedValue(mockResponse);
		vi.spyOn(console, "log").mockImplementation(() => {});

		const proxy = await getProxy();
		const result = await proxy(makeReq(), "/api/onboarding/addons");

		expect(result!.headers.get("x-proxy-mode")).toBe("proxy_only");
	});
});
