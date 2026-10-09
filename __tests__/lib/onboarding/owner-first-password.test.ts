import { describe, expect, it, vi } from "vitest";

import { setOwnerFirstPassword } from "@/lib/onboarding/owner-first-password";

function admin(options: { app?: Record<string, unknown> | null; owner?: Record<string, unknown> | null; lastSignIn?: string | null }) {
	const updateUserById = vi.fn(async () => ({ error: null }));
	const tables: Record<string, unknown> = {
		onboarding_applications: options.app ?? null,
		users: options.owner ?? null,
	};
	const client = {
		from: (table: string) => {
			const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: tables[table] }) };
			return query;
		},
		auth: {
			admin: {
				getUserById: async () => ({ data: { user: { id: "u1", last_sign_in_at: options.lastSignIn ?? null } }, error: null }),
				updateUserById,
			},
		},
	};
	return { client: client as never, updateUserById };
}

const APP = { id: "a1", email: "Dueno@Local.com", company_id: "c1", payment_status: "paid", verification_token: "tok" };

describe("setOwnerFirstPassword", () => {
	it("guarda la primera contraseña de una cuenta recién creada", async () => {
		const { client, updateUserById } = admin({ app: APP, owner: { auth_user_id: "u1" } });
		const result = await setOwnerFirstPassword(client, { paymentReference: "ORDER-1", verificationToken: "tok", password: "clave-segura" });
		expect(result).toEqual({ ok: true, email: "dueno@local.com" });
		expect(updateUserById).toHaveBeenCalledWith("u1", { password: "clave-segura" });
	});

	it("con otro token no toca nada", async () => {
		const { client, updateUserById } = admin({ app: APP, owner: { auth_user_id: "u1" } });
		const result = await setOwnerFirstPassword(client, { paymentReference: "ORDER-1", verificationToken: "otro", password: "clave-segura" });
		expect(result).toMatchObject({ ok: false, status: 404 });
		expect(updateUserById).not.toHaveBeenCalled();
	});

	it("no cambia la contraseña de una cuenta que ya entró alguna vez", async () => {
		const { client, updateUserById } = admin({ app: APP, owner: { auth_user_id: "u1" }, lastSignIn: "2026-10-01T00:00:00Z" });
		const result = await setOwnerFirstPassword(client, { paymentReference: "ORDER-1", verificationToken: "tok", password: "clave-segura" });
		expect(result).toMatchObject({ ok: false, status: 409 });
		expect(updateUserById).not.toHaveBeenCalled();
	});

	it("pide al menos 8 caracteres", async () => {
		const { client } = admin({ app: APP, owner: { auth_user_id: "u1" } });
		const result = await setOwnerFirstPassword(client, { paymentReference: "ORDER-1", verificationToken: "tok", password: "corta" });
		expect(result).toMatchObject({ ok: false, status: 400 });
	});
});
