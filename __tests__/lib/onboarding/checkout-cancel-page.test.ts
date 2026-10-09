import { isValidElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/** Filas por tabla y las columnas que pidió la página (para saber qué sale de la base). */
const db: { rows: Record<string, Record<string, unknown> | null>; selects: Array<{ table: string; columns: string }> } = {
	rows: {},
	selects: [],
};

vi.mock("@/lib/infra/supabase-admin", () => ({
	supabaseAdmin: {
		from: (table: string) => {
			const query: Record<string, unknown> = {};
			query.select = (columns: string) => {
				db.selects.push({ table, columns });
				return query;
			};
			query.eq = () => query;
			query.maybeSingle = async () => ({ data: db.rows[table] ?? null, error: null });
			return query;
		},
	},
}));
vi.mock("@/lib/i18n/server", () => ({ getCurrentLocale: async () => "es" }));
vi.mock("next/navigation", () => ({
	redirect: (url: string) => {
		throw new Error(`REDIRECT ${url}`);
	},
}));

import CheckoutCancelPage from "@/app/checkout/cancel/page";
import { getCheckoutCopy } from "@/lib/plans/checkout-copy";

const copy = getCheckoutCopy("es").cancel;

/** Todo el texto y los enlaces del árbol que devuelve la página, sin renderizarla. */
function textOf(node: ReactNode): string {
	if (node === null || node === undefined || typeof node === "boolean") return "";
	if (typeof node === "string" || typeof node === "number") return String(node);
	if (Array.isArray(node)) return node.map(textOf).join(" ");
	if (isValidElement(node)) {
		const props = node.props as { children?: ReactNode; href?: unknown };
		return `${typeof props.href === "string" ? props.href : ""} ${textOf(props.children)}`;
	}
	return "";
}

async function render(ref?: string) {
	return textOf(await CheckoutCancelPage({ searchParams: Promise.resolve(ref === undefined ? {} : { ref }) }));
}

const APPLICATION = {
	payment_status: "pending",
	plan_id: "plan-pro",
	payment_amount: 49,
	company_id: null,
	// Lo que la página nunca debe mostrar ni pedir.
	business_name: "Rica Pizza",
	email: "dueno@local.com",
	verification_token: "token-secreto",
};

beforeEach(() => {
	db.rows = {};
	db.selects = [];
});

describe("/checkout/cancel", () => {
	it("muestra estado, plan y monto de la referencia, leídos en el servidor", async () => {
		db.rows = { onboarding_applications: APPLICATION, plans: { name: "Pro", name_i18n: null } };
		const text = await render("ORDER-123");
		expect(text).toContain(copy.titlePaid);
		expect(text).toContain("Pro");
		expect(text).toContain("49");
		expect(text).toContain("Pendiente");
		expect(text).toContain("ORDER-123");
	});

	it("nunca pide ni muestra el token del alta ni datos personales", async () => {
		db.rows = { onboarding_applications: APPLICATION, plans: { name: "Pro", name_i18n: null } };
		const text = await render("ORDER-123");
		for (const { columns } of db.selects) expect(columns).not.toMatch(/verification_token|business_name|email|responsible_name|phone/);
		expect(text).not.toContain("token-secreto");
		expect(text).not.toContain("Rica Pizza");
		expect(text).not.toContain("dueno@local.com");
		expect(text).not.toContain("/onboarding/pago?token=");
	});

	it("una referencia que no existe y una con otra forma dan la misma página genérica", async () => {
		const unknown = await render("NO-EXISTE");
		const malformed = await render("<script>");
		expect(unknown).toContain(copy.titleFallback);
		expect(unknown).not.toContain(copy.titlePaid);
		// Lo único que cambia es la referencia que el visitante mismo escribió: no se muestra en ninguna.
		expect(unknown).not.toContain("NO-EXISTE");
		expect(malformed.replace(/\s+/g, " ")).toBe(unknown.replace(/\s+/g, " "));
	});

	it("un pago ya cobrado va a la página de éxito en vez de decir que no se completó", async () => {
		db.rows = { payments_history: { status: "paid", plan_id: "plan-pro", amount_paid: 49, company_id: "c1" } };
		await expect(render("ORDER-123")).rejects.toThrow("REDIRECT /checkout/success?ref=ORDER-123");
	});

	it("si la lectura falla, es la misma página genérica", async () => {
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
		db.rows = { get onboarding_applications(): Record<string, unknown> {
			throw new Error("sin base");
		} } as unknown as typeof db.rows;
		const text = await render("ORDER-123");
		expect(text).toContain(copy.titleFallback);
		consoleError.mockRestore();
	});
});
