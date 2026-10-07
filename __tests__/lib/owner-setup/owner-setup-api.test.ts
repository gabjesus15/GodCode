import { describe, expect, it, vi } from "vitest";

import { createOwnerSetupApi } from "@/lib/owner-setup/api";

function response(status: number, body: unknown) {
	return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("API del asistente", () => {
	it("usa la dirección base y los encabezados de la app", async () => {
		const fetch = vi.fn().mockResolvedValue(response(200, { draft: { theme: { displayName: "Rica Pizza" } } }));
		const api = createOwnerSetupApi({ fetch, baseUrl: "https://gcode.test", headers: { Authorization: "Bearer t" } });
		const result = await api.saveThemePatch({ displayName: "Rica Pizza" });
		expect(result).toEqual({ ok: true, data: { theme: { displayName: "Rica Pizza" } } });
		const [url, init] = fetch.mock.calls[0];
		expect(url).toBe("https://gcode.test/api/customer-account/store-theme");
		expect(init.method).toBe("PUT");
		expect(init.headers).toMatchObject({ Authorization: "Bearer t", "Content-Type": "application/json" });
		expect(JSON.parse(init.body)).toEqual({ patch: { displayName: "Rica Pizza" } });
	});

	it("devuelve el error del servidor", async () => {
		const api = createOwnerSetupApi({ fetch: vi.fn().mockResolvedValue(response(400, { error: "El WhatsApp no es válido." })) });
		expect(await api.saveLocal({ id: "b1", whatsapp_url: "x", instagram_url: "", address: "" })).toEqual({ ok: false, error: "El WhatsApp no es válido." });
	});

	it("sin conexión no lanza: pide reintentar", async () => {
		const api = createOwnerSetupApi({ fetch: vi.fn().mockRejectedValue(new TypeError("Failed to fetch")) });
		const result = await api.publishTheme("Publicado desde Configura tu tienda");
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toMatch(/conexión/);
	});

	it("sube el logo como formulario y trae la URL firmada", async () => {
		const fetch = vi.fn().mockResolvedValue(response(200, { draft: { theme: { logoUrl: "logos/a.png" } }, signedUrl: "https://cdn.test/a.png" }));
		const api = createOwnerSetupApi({ fetch });
		const result = await api.uploadLogo(new Blob(["x"], { type: "image/png" }), "logo.png");
		expect(result).toEqual({ ok: true, data: { theme: { logoUrl: "logos/a.png" }, signedUrl: "https://cdn.test/a.png" } });
		const body = fetch.mock.calls[0][1].body as FormData;
		expect(body.get("field")).toBe("logoUrl");
		expect((body.get("file") as File).name).toBe("logo.png");
	});

	it("marca el avance del asistente", async () => {
		const fetch = vi.fn().mockResolvedValue(response(200, {}));
		const api = createOwnerSetupApi({ fetch });
		expect(await api.markSetup("skip")).toEqual({ ok: true, data: null });
		expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ action: "skip" });
	});
});
