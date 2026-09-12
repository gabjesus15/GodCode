import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * El flag decide si la cuenta de cliente del menú es alcanzable. El caso que
 * importa es el de "nadie configuró nada": tiene que quedar apagado, porque un
 * despliegue sin la variable no debe publicar una feature a medias.
 */
describe("MENU_ACCOUNT_ENABLED", () => {
	const original = process.env.NEXT_PUBLIC_MENU_ACCOUNT_ENABLED;

	beforeEach(() => {
		vi.resetModules();
	});

	afterEach(() => {
		if (original === undefined) delete process.env.NEXT_PUBLIC_MENU_ACCOUNT_ENABLED;
		else process.env.NEXT_PUBLIC_MENU_ACCOUNT_ENABLED = original;
	});

	async function loadWith(value: string | undefined) {
		if (value === undefined) delete process.env.NEXT_PUBLIC_MENU_ACCOUNT_ENABLED;
		else process.env.NEXT_PUBLIC_MENU_ACCOUNT_ENABLED = value;
		const mod = await import("@/lib/menu-account/feature");
		return mod.MENU_ACCOUNT_ENABLED;
	}

	it("está apagado cuando la variable no existe", async () => {
		expect(await loadWith(undefined)).toBe(false);
	});

	it("está apagado con cadena vacía o sólo espacios", async () => {
		expect(await loadWith("")).toBe(false);
		expect(await loadWith("   ")).toBe(false);
	});

	it("está apagado con cualquier valor que no sea afirmativo", async () => {
		for (const value of ["0", "false", "off", "no", "sí", "enabled", "yes"]) {
			expect(await loadWith(value)).toBe(false);
		}
	});

	it("se enciende con 1, true u on (sin importar mayúsculas ni espacios)", async () => {
		for (const value of ["1", "true", "on", "TRUE", "On", "  1  "]) {
			expect(await loadWith(value)).toBe(true);
		}
	});
});
