import { describe, expect, it, vi } from "vitest";

import { OWNER_FIRST_PASSWORD_TTL_MS, setOwnerFirstPassword } from "@/lib/onboarding/owner-first-password";

type Op = { method: string; args: unknown[] };

const NOW = new Date("2026-10-09T12:00:00.000Z");
const PAID_AT = "2026-10-08T12:00:00.000Z";

function admin(options: {
	app?: Record<string, unknown> | null;
	owner?: Record<string, unknown> | null;
	lastSignIn?: string | null;
	paidAt?: string | null;
	/** Lo que responde el cambio de token: la fila (se gastó) o nada (otro ya lo gastó). */
	claim?: { data: unknown; error?: unknown };
	updateError?: { message: string } | null;
}) {
	const calls: Array<{ table: string; ops: Op[] }> = [];
	const updateUserById = vi.fn(async () => ({ error: options.updateError ?? null }));
	const respond = (table: string, ops: Op[]) => {
		const isUpdate = ops.some((op) => op.method === "update");
		if (table === "onboarding_applications" && isUpdate) return options.claim ?? { data: { id: "a1" }, error: null };
		if (table === "onboarding_applications") return { data: options.app ?? null, error: null };
		if (table === "users") return { data: options.owner ?? null, error: null };
		if (table === "payments_history") return { data: options.paidAt === null ? null : { payment_date: options.paidAt ?? PAID_AT }, error: null };
		return { data: null, error: null };
	};
	const client = {
		from: (table: string) => {
			const ops: Op[] = [];
			calls.push({ table, ops });
			const query: Record<string, unknown> = {};
			for (const method of ["select", "update", "eq", "order", "limit"]) {
				query[method] = (...args: unknown[]) => {
					ops.push({ method, args });
					return query;
				};
			}
			query.maybeSingle = async () => respond(table, ops);
			query.then = (resolve: (value: unknown) => unknown) => Promise.resolve(respond(table, ops)).then(resolve);
			return query;
		},
		auth: {
			admin: {
				getUserById: async () => ({
					data: { user: { id: "u1", last_sign_in_at: options.lastSignIn ?? null, created_at: "2026-10-08T12:00:05.000Z" } },
					error: null,
				}),
				updateUserById,
			},
		},
	};
	const tokenUpdates = () =>
		calls
			.filter((call) => call.table === "onboarding_applications" && call.ops.some((op) => op.method === "update"))
			.map((call) => call.ops);
	return { client: client as never, updateUserById, tokenUpdates };
}

const APP = { id: "a1", email: "Dueno@Local.com", company_id: "c1", payment_status: "paid", verification_token: "tok" };
const OWNER = { auth_user_id: "u1" };
const input = (overrides: Partial<{ verificationToken: string; password: string }> = {}) => ({
	paymentReference: "ORDER-1",
	verificationToken: "tok",
	password: "clave-segura",
	now: NOW,
	...overrides,
});

describe("setOwnerFirstPassword", () => {
	it("guarda la primera contraseña de una cuenta recién creada y gasta el token", async () => {
		const { client, updateUserById, tokenUpdates } = admin({ app: APP, owner: OWNER });
		const result = await setOwnerFirstPassword(client, input());
		expect(result).toEqual({ ok: true, email: "dueno@local.com" });
		expect(updateUserById).toHaveBeenCalledWith("u1", { password: "clave-segura" });

		// Un solo uso: el token se cambia, con condición sobre el token que se usó.
		const [claim] = tokenUpdates();
		const patch = claim.find((op) => op.method === "update")?.args[0] as { verification_token: string };
		expect(patch.verification_token).toMatch(/^[0-9a-f-]{36}$/);
		expect(patch.verification_token).not.toBe("tok");
		expect(claim).toContainEqual({ method: "eq", args: ["verification_token", "tok"] });
	});

	it("con otro token no toca nada", async () => {
		const { client, updateUserById, tokenUpdates } = admin({ app: APP, owner: OWNER });
		const result = await setOwnerFirstPassword(client, input({ verificationToken: "otro" }));
		expect(result).toMatchObject({ ok: false, status: 404 });
		expect(updateUserById).not.toHaveBeenCalled();
		expect(tokenUpdates()).toHaveLength(0);
	});

	it("si otro envío ya gastó el token, este no cambia la contraseña", async () => {
		const { client, updateUserById } = admin({ app: APP, owner: OWNER, claim: { data: null, error: null } });
		const result = await setOwnerFirstPassword(client, input());
		expect(result).toMatchObject({ ok: false, status: 409 });
		expect(updateUserById).not.toHaveBeenCalled();
	});

	it("vence a los 7 días del pago", async () => {
		const old = new Date(NOW.getTime() - OWNER_FIRST_PASSWORD_TTL_MS - 60_000).toISOString();
		const { client, updateUserById, tokenUpdates } = admin({ app: APP, owner: OWNER, paidAt: old });
		const result = await setOwnerFirstPassword(client, input());
		expect(result).toMatchObject({ ok: false, status: 410 });
		expect(updateUserById).not.toHaveBeenCalled();
		expect(tokenUpdates()).toHaveLength(0);
	});

	it("sin la fila del pago cuenta desde que se creó la cuenta del dueño", async () => {
		const { client, updateUserById } = admin({ app: APP, owner: OWNER, paidAt: null });
		const result = await setOwnerFirstPassword(client, input());
		expect(result).toMatchObject({ ok: true });
		expect(updateUserById).toHaveBeenCalledTimes(1);
	});

	it("si no se pudo guardar la contraseña, devuelve el token para reintentar", async () => {
		const { client, tokenUpdates } = admin({ app: APP, owner: OWNER, updateError: { message: "weak password" } });
		const result = await setOwnerFirstPassword(client, input());
		expect(result).toMatchObject({ ok: false, status: 400 });
		const [claim, restore] = tokenUpdates();
		const rotated = (claim.find((op) => op.method === "update")?.args[0] as { verification_token: string }).verification_token;
		expect(restore).toContainEqual({ method: "update", args: [{ verification_token: "tok" }] });
		expect(restore).toContainEqual({ method: "eq", args: ["verification_token", rotated] });
	});

	it("no cambia la contraseña de una cuenta que ya entró alguna vez", async () => {
		const { client, updateUserById } = admin({ app: APP, owner: OWNER, lastSignIn: "2026-10-01T00:00:00Z" });
		const result = await setOwnerFirstPassword(client, input());
		expect(result).toMatchObject({ ok: false, status: 409 });
		expect(updateUserById).not.toHaveBeenCalled();
	});

	it("pide al menos 8 caracteres", async () => {
		const { client } = admin({ app: APP, owner: OWNER });
		const result = await setOwnerFirstPassword(client, input({ password: "corta" }));
		expect(result).toMatchObject({ ok: false, status: 400 });
	});
});
