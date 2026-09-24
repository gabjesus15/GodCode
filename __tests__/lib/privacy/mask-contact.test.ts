import { describe, expect, it } from "vitest";

import { maskEmail, maskPhone } from "@/lib/privacy/mask-contact";

describe("maskEmail", () => {
	it("deja ver solo el inicio y el dominio", () => {
		expect(maskEmail("jhonbelandria@gmail.com")).toBe("jh•••@gmail.com");
		expect(maskEmail("ab@x.cl")).toBe("a•••@x.cl");
	});

	it("no expone valores cifrados ni vacíos", () => {
		expect(maskEmail("enc:v1:abc")).toBe("Cifrado");
		expect(maskEmail("")).toBeNull();
		expect(maskEmail(null)).toBeNull();
		expect(maskEmail("sin-arroba")).toBe("•••");
	});
});

describe("maskPhone", () => {
	it("deja ver el código de país y los dos últimos dígitos", () => {
		expect(maskPhone("+56 9 1234 5678")).toBe("+56 ••• ••• 78");
		expect(maskPhone("912345678")).toBe("••• ••• 78");
	});

	it("no expone valores cifrados, cortos ni vacíos", () => {
		expect(maskPhone("enc:v1:abc")).toBe("Cifrado");
		expect(maskPhone("123")).toBe("•••");
		expect(maskPhone("   ")).toBeNull();
	});
});
