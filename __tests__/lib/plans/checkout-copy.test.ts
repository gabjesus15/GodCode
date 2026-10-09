import { describe, expect, it } from "vitest";

import {
	checkoutStatusLabel,
	getCheckoutCopy,
	isCheckoutPaidStatus,
	isSpentPasswordLinkCode,
	resolveSetPasswordErrorCode,
	SET_PASSWORD_ERROR_CODES,
	setPasswordErrorCodeForStatus,
} from "@/lib/plans/checkout-copy";

const LOCALES = ["es", "en", "pt", "fr", "de", "it"] as const;

function keysOf(value: unknown, prefix = ""): string[] {
	return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
		child && typeof child === "object" ? keysOf(child, `${prefix}${key}.`) : [`${prefix}${key}`],
	);
}

describe("textos de la vuelta del pago", () => {
	it("los seis idiomas tienen los mismos textos y ninguno vacío", () => {
		const reference = keysOf(getCheckoutCopy("es")).sort();
		for (const locale of LOCALES) {
			const copy = getCheckoutCopy(locale);
			expect(keysOf(copy).sort(), locale).toEqual(reference);
			for (const key of reference) {
				const value = key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], copy);
				expect(String(value).trim(), `${locale}.${key}`).not.toBe("");
			}
			expect(copy.finalize.passwordTooShort, locale).toContain("{n}");
			expect(copy.finalize.passwordErrors.invalid_password, locale).toMatch(/\{min\}.*\{max\}/);
		}
	});

	it("en español no hay exclamaciones, rayas ni «onboarding»", () => {
		const values = (node: unknown): string[] =>
			typeof node === "string" ? [node] : Object.values(node as Record<string, unknown>).flatMap(values);
		for (const text of values(getCheckoutCopy("es"))) expect(text).not.toMatch(/¡|—|–|onboarding/i);
	});

	it("un idioma desconocido cae en español", () => {
		expect(getCheckoutCopy("ja").success.titlePaid).toBe(getCheckoutCopy("es").success.titlePaid);
		expect(getCheckoutCopy("pt-BR").success.titlePaid).toBe("Sua conta já está ativa");
	});

	it("el estado del pago se dice en palabras; uno desconocido no se muestra", () => {
		const labels = getCheckoutCopy("es").status;
		expect(checkoutStatusLabel("approved", labels)).toBe("Pagado");
		expect(checkoutStatusLabel("pending_validation", labels)).toBe("En revisión");
		expect(checkoutStatusLabel("REJECTED", labels)).toBe("Rechazado");
		expect(checkoutStatusLabel("refunded", labels)).toBeNull();
		expect(checkoutStatusLabel(null, labels)).toBeNull();
		expect(isCheckoutPaidStatus("paid")).toBe(true);
		expect(isCheckoutPaidStatus("pending_validation")).toBe(false);
	});
});

describe("códigos de «Crea tu contraseña»", () => {
	it("cada código tiene texto en los seis idiomas: en el formulario o en el aviso del enlace gastado", () => {
		for (const locale of LOCALES) {
			const copy = getCheckoutCopy(locale).finalize;
			for (const code of SET_PASSWORD_ERROR_CODES) {
				const text = isSpentPasswordLinkCode(code) ? copy.linkSpentText : copy.passwordErrors[code];
				expect(text?.trim(), `${locale}.${code}`).toBeTruthy();
			}
		}
		expect(getCheckoutCopy("es").finalize.linkSpentText).toBe(
			"Este enlace ya se usó o venció. Crea una contraseña nueva desde «¿Olvidaste tu contraseña?».",
		);
	});

	it("un enlace que no existe, ya usado o vencido no deja reintentar", () => {
		expect(SET_PASSWORD_ERROR_CODES.filter(isSpentPasswordLinkCode)).toEqual(["not_found", "already_used", "expired"]);
	});

	it("usa el código de la respuesta y, si falta o es desconocido, el del status", () => {
		expect(resolveSetPasswordErrorCode("expired", 500)).toBe("expired");
		expect(resolveSetPasswordErrorCode(undefined, 429)).toBe("rate_limited");
		expect(resolveSetPasswordErrorCode("otro", 404)).toBe("not_found");
		expect(resolveSetPasswordErrorCode(null, 409)).toBe("already_used");
		expect(resolveSetPasswordErrorCode(undefined, 503)).toBe("server_error");
		expect(setPasswordErrorCodeForStatus(400)).toBe("password_rejected");
		expect(setPasswordErrorCodeForStatus(410)).toBe("expired");
	});
});
