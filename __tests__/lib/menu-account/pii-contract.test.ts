import { describe, expect, it } from "vitest";

import { PII_CONTRACT_CASES, PII_CONTRACT_TEST_KEY } from "@/lib/menu-account/pii-contract-cases";
import { openPii, sealPii } from "@/lib/menu-account/pii";

/**
 * Contrato del cifrado de datos personales.
 *
 * El mismo fichero de casos vive en el panel, donde el port en WebCrypto de la
 * Edge Function `client-pii` tiene que abrirlos igual. Mientras los dos pasen, lo
 * que cifra el Portal lo puede mostrar la caja.
 */
describe("openPii — contrato compartido con la Edge Function del panel", () => {
	it("los casos se sellaron con la llave de test de vitest", () => {
		expect(process.env.MENU_ACCOUNT_PII_KEY).toBe(PII_CONTRACT_TEST_KEY);
	});

	for (const testCase of PII_CONTRACT_CASES) {
		it(testCase.name, () => {
			expect(openPii(testCase.sealed)).toBe(testCase.plain);
		});
	}

	it("lo que sella el Portal hoy sigue el mismo formato", () => {
		for (const testCase of PII_CONTRACT_CASES) {
			const sealed = sealPii(testCase.plain);
			expect(sealed.startsWith("enc:v1:")).toBe(true);
			expect(openPii(sealed)).toBe(testCase.plain);
		}
	});
});
