import { afterEach, describe, expect, it, vi } from "vitest";

type FakeScript = { src?: string; async?: boolean; onload?: () => void; onerror?: () => void; remove: () => void };

/** Un `document` mínimo: cada script que se añade «carga» o «falla» en la siguiente vuelta. */
function stubDocument(outcome: "load" | "error") {
	const appended: FakeScript[] = [];
	vi.stubGlobal("document", {
		createElement: () => ({ remove: () => undefined }) as FakeScript,
		head: {
			appendChild: (script: FakeScript) => {
				appended.push(script);
				queueMicrotask(() => (outcome === "load" ? script.onload?.() : script.onerror?.()));
			},
		},
	});
	return appended;
}

async function loadModule(siteKey: string) {
	vi.stubEnv("NEXT_PUBLIC_RECAPTCHA_SITE_KEY", siteKey);
	return import("@/components/labs/lazy-recaptcha");
}

describe("reCAPTCHA a demanda del formulario de Gcode Labs", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.unstubAllGlobals();
		vi.resetModules();
	});

	it("sin clave pública no carga nada y el token sale vacío", async () => {
		const appended = stubDocument("load");
		const { getRecaptchaToken, preloadRecaptcha } = await loadModule("");
		expect(await preloadRecaptcha()).toBeNull();
		expect(await getRecaptchaToken("labs_quote")).toBe("");
		expect(appended).toHaveLength(0);
	});

	it("con clave pide el script una sola vez y devuelve el token de la acción", async () => {
		const appended = stubDocument("load");
		const grecaptcha = { ready: (callback: () => void) => callback(), execute: vi.fn(async () => "token-123") };
		vi.stubGlobal("window", { grecaptcha });
		const { getRecaptchaToken, preloadRecaptcha } = await loadModule("site-key");

		void preloadRecaptcha();
		const [first, second] = await Promise.all([getRecaptchaToken("labs_quote"), getRecaptchaToken("labs_quote")]);

		expect([first, second]).toEqual(["token-123", "token-123"]);
		expect(appended).toHaveLength(1);
		expect(appended[0]?.src).toBe("https://www.google.com/recaptcha/api.js?render=site-key");
		expect(grecaptcha.execute).toHaveBeenCalledWith("site-key", { action: "labs_quote" });
	});

	it("si el script no carga (red, bloqueador), devuelve vacío y el siguiente envío lo vuelve a pedir", async () => {
		const appended = stubDocument("error");
		vi.stubGlobal("window", {});
		const { getRecaptchaToken } = await loadModule("site-key");

		expect(await getRecaptchaToken("labs_quote")).toBe("");
		expect(await getRecaptchaToken("labs_quote")).toBe("");
		expect(appended).toHaveLength(2);
	});
});
