import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { emptyResult, makeAdminMock } from "./test-supabase-mock";

const adminHolder = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("@/lib/infra/supabase-admin", () => ({
	get supabaseAdmin() {
		return adminHolder.current;
	},
}));

import {
	documentLookupValues,
	isLegacyAccountRow,
	openAccountRow,
	sealAccountFields,
	upgradeLegacyAccountRow,
} from "@/lib/menu-account/account-records";
import { dedupeAddresses } from "@/lib/menu-account/activity";
import { isLookupHash, isSealedPii, lookupHash, openPii, sealPii } from "@/lib/menu-account/pii";
import type { MenuClientAccountRow } from "@/lib/menu-account/types";

const PLAIN = {
	email: "cliente@gmail.com",
	documentNormalized: "123456785",
	documentRaw: "12.345.678-5",
	fullName: "Ana O'Neil",
	phone: "+56 9 1234 5678",
	phoneNormalized: "56912345678",
};

function baseRow(overrides: Partial<MenuClientAccountRow>): MenuClientAccountRow {
	return {
		id: "acc-1",
		company_id: "company-a",
		auth_user_id: "auth-1",
		client_id: null,
		created_at: "2026-09-01T00:00:00Z",
		updated_at: "2026-09-01T00:00:00Z",
		document_country: "CL",
		is_active: true,
		last_login_at: null,
		preferred_branch_id: null,
		reset_grant_expires_at: null,
		email: PLAIN.email,
		document_normalized: PLAIN.documentNormalized,
		document_raw: PLAIN.documentRaw,
		full_name: PLAIN.fullName,
		phone: PLAIN.phone,
		phone_normalized: PLAIN.phoneNormalized,
		...overrides,
	};
}

describe("sealPii / openPii", () => {
	it("cifra y descifra sin perder el texto", () => {
		const sealed = sealPii("Pasaje O'Higgins 123, depto 4");
		expect(isSealedPii(sealed)).toBe(true);
		expect(sealed).not.toContain("Higgins");
		expect(openPii(sealed)).toBe("Pasaje O'Higgins 123, depto 4");
	});

	it("usa un IV distinto cada vez: el mismo dato no se ve igual dos veces", () => {
		expect(sealPii("Ana")).not.toBe(sealPii("Ana"));
	});

	it("deja pasar valores antiguos en claro, null y vacío", () => {
		expect(openPii("texto viejo")).toBe("texto viejo");
		expect(sealPii(null)).toBeNull();
		expect(sealPii("")).toBe("");
		const sealed = sealPii("x");
		expect(sealPii(sealed)).toBe(sealed);
	});

	it("rechaza un valor alterado en vez de devolver basura", () => {
		const sealed = sealPii("dato");
		const tampered = sealed.slice(0, -2) + (sealed.endsWith("A") ? "BB" : "AA");
		expect(() => openPii(tampered)).toThrow();
	});

	describe("sin llave", () => {
		const original = process.env.MENU_ACCOUNT_PII_KEY;
		beforeEach(() => {
			process.env.MENU_ACCOUNT_PII_KEY = "";
		});
		afterEach(() => {
			process.env.MENU_ACCOUNT_PII_KEY = original;
		});

		it("falla cerrado: no guarda nada en claro", () => {
			expect(() => sealPii("Ana")).toThrow();
		});
	});
});

describe("lookupHash", () => {
	it("es determinista, cabe en 32 caracteres y separa documento de correo", () => {
		const hash = lookupHash("document", "123456785");
		expect(hash).toBe(lookupHash("document", "123456785"));
		expect(isLookupHash(hash)).toBe(true);
		expect(lookupHash("email", "123456785")).not.toBe(hash);
	});
});

describe("filas de cuenta", () => {
	beforeEach(() => {
		adminHolder.current = makeAdminMock({ tables: { menu_client_accounts: [emptyResult] } });
	});

	it("no deja datos personales legibles en la fila", () => {
		const sealed = sealAccountFields(PLAIN);
		const stored = JSON.stringify(sealed);
		for (const value of Object.values(PLAIN)) {
			expect(stored).not.toContain(value);
		}
		expect(sealed.email).toBe(lookupHash("email", PLAIN.email));
		expect(sealed.document_normalized).toBe(lookupHash("document", PLAIN.documentNormalized));
	});

	it("abre la fila cifrada con el correo de la sesión", () => {
		const row = baseRow(sealAccountFields(PLAIN));
		expect(isLegacyAccountRow(row)).toBe(false);
		const opened = openAccountRow(row, PLAIN.email);
		expect(opened).toMatchObject({
			email: PLAIN.email,
			document_normalized: PLAIN.documentNormalized,
			document_raw: PLAIN.documentRaw,
			full_name: PLAIN.fullName,
			phone: PLAIN.phone,
			phone_normalized: PLAIN.phoneNormalized,
		});
	});

	it("busca por huella y por valor en claro mientras queden cuentas antiguas", () => {
		expect(documentLookupValues("123456785")).toEqual([
			lookupHash("document", "123456785"),
			"123456785",
		]);
	});

	it("cifra en su sitio una cuenta antigua y limpia el nombre de auth", async () => {
		const updateUserById = vi.fn(async () => ({ data: {}, error: null }));
		const admin = makeAdminMock({
			tables: { menu_client_accounts: [emptyResult] },
			authAdmin: { updateUserById },
		});
		adminHolder.current = admin;

		const legacy = baseRow({});
		expect(isLegacyAccountRow(legacy)).toBe(true);
		await upgradeLegacyAccountRow(legacy);

		const update = admin.chains[0].chain.update as ReturnType<typeof vi.fn>;
		const patch = update.mock.calls[0][0] as Record<string, string>;
		expect(patch.document_normalized).toBe(lookupHash("document", PLAIN.documentNormalized));
		expect(patch.email).toBe(lookupHash("email", PLAIN.email));
		expect(openPii(patch.full_name)).toBe(PLAIN.fullName);
		expect(JSON.stringify(patch)).not.toContain("Ana");
		// Condicional sobre el documento leído, para no cifrar dos veces.
		expect(admin.chains[0].chain.eq).toHaveBeenCalledWith("document_normalized", "123456785");
		expect(updateUserById).toHaveBeenCalledWith("auth-1", { user_metadata: { full_name: null } });
	});
});

describe("dedupeAddresses", () => {
	it("se queda con la más reciente de cada dirección", () => {
		const { keep, duplicateIds } = dedupeAddresses([
			{ id: "new", addressLine: "Maipú", reference: "Pasaje 1, casa 4", namedAreaId: "z1", lastUsedAt: "2" },
			{ id: "old", addressLine: "Maipú", reference: "pasaje 1 casa 4", namedAreaId: "z1", lastUsedAt: "1" },
			{ id: "other", addressLine: "Maipú", reference: "Pasaje 2", namedAreaId: "z1", lastUsedAt: "0" },
		]);
		expect(keep.map((a) => a.id)).toEqual(["new", "other"]);
		expect(duplicateIds).toEqual(["old"]);
	});
});
