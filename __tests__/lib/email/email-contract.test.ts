import { createDecipheriv, hkdfSync } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
	SECRET_BOX_CASES,
	SECRET_BOX_TEST_KEY,
	UNSUBSCRIBE_CASES,
	UNSUBSCRIBE_TEST_SECRET,
} from "@/lib/email/email-contract-cases";
import { createSecretBox } from "@/lib/email/secret-box";
import { signUnsubscribe, verifyUnsubscribe } from "@/lib/email/unsubscribe-token";

/**
 * Contrato con la Edge Function `coupon-emails` del panel: lo que el super admin
 * sella aquí lo abre la función, y la firma del enlace de baja que pone la función
 * se verifica aquí. El panel corre estos mismos casos.
 */
describe("secret-box — contrato con el panel", () => {
	for (const testCase of SECRET_BOX_CASES) {
		it(`abre lo sellado: ${testCase.name}`, async () => {
			const box = await createSecretBox(SECRET_BOX_TEST_KEY);
			await expect(box.open(testCase.sealed)).resolves.toBe(testCase.plain);
		});
	}

	it("el formato es AES-256-GCM estándar: Node crypto lo abre sin WebCrypto", async () => {
		const box = await createSecretBox(SECRET_BOX_TEST_KEY);
		const sealed = await box.seal("re_formato_estandar");
		const packed = Buffer.from(sealed.slice("sk:v1:".length), "base64url");
		const key = Buffer.from(
			hkdfSync("sha256", Buffer.from(SECRET_BOX_TEST_KEY, "base64"), Buffer.alloc(0), "company-email-sender:aes-256-gcm:v1", 32),
		);
		const decipher = createDecipheriv("aes-256-gcm", key, packed.subarray(0, 12));
		decipher.setAuthTag(packed.subarray(12, 28));
		const plain = Buffer.concat([decipher.update(packed.subarray(28)), decipher.final()]).toString("utf8");
		expect(plain).toBe("re_formato_estandar");
	});
});

describe("enlace de baja — contrato con el panel", () => {
	for (const testCase of UNSUBSCRIBE_CASES) {
		it("verifica la firma que pone el panel", async () => {
			await expect(signUnsubscribe(UNSUBSCRIBE_TEST_SECRET, testCase.accountId, testCase.companyId)).resolves.toBe(
				testCase.signature,
			);
			await expect(
				verifyUnsubscribe(UNSUBSCRIBE_TEST_SECRET, testCase.accountId, testCase.companyId, testCase.signature),
			).resolves.toBe(true);
		});
	}

	it("no acepta la firma de otra cuenta", async () => {
		const { companyId, signature } = UNSUBSCRIBE_CASES[0];
		await expect(
			verifyUnsubscribe(UNSUBSCRIBE_TEST_SECRET, "99999999-2222-4333-8444-555555555555", companyId, signature),
		).resolves.toBe(false);
	});
});
