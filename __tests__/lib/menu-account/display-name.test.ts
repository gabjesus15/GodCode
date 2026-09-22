import { describe, expect, it } from "vitest";

import { shortDisplayName } from "@/lib/menu-account/display-name";

describe("shortDisplayName", () => {
	it("deja el nombre de pila y la inicial del último apellido", () => {
		expect(shortDisplayName("Jhon Belandria")).toBe("Jhon B.");
		expect(shortDisplayName("María José Núñez Pérez")).toBe("María P.");
	});

	it("respeta tildes, eñes y minúsculas en la inicial", () => {
		expect(shortDisplayName("ana ñúñez")).toBe("ana Ñ.");
		expect(shortDisplayName("Ana Ólafsdóttir")).toBe("Ana Ó.");
	});

	it("un solo nombre queda tal cual y vacío cae a 'Cliente'", () => {
		expect(shortDisplayName("Cher")).toBe("Cher");
		expect(shortDisplayName("   ")).toBe("Cliente");
		expect(shortDisplayName(null)).toBe("Cliente");
	});

	it("ignora espacios de más", () => {
		expect(shortDisplayName("  Jhon   Belandria  ")).toBe("Jhon B.");
	});
});
