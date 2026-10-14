import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { loyaltyEarnRuleInputSchema } from "@/lib/loyalty/earn-rules-shared";
import {
	createEarnRule,
	deleteEarnRule,
	listEarnRules,
	listLoyaltyCatalog,
	LoyaltyRuleError,
	updateEarnRule,
} from "@/lib/loyalty/earn-rules";
import { getCustomerAccountContext } from "@/lib/tenant/customer-account-context";
import { assertCustomerAccountRateLimit } from "@/lib/tenant/customer-account-rate-limit";

/** @service-role customer-account */

/**
 * Reglas para ganar puntos del negocio, desde /cuenta › Mi menú. Solo el CEO las ve y
 * las cambia; la empresa sale siempre de la sesión, nunca del cuerpo. Cambiar una regla
 * no toca los puntos ya ganados: cada pedido guardó los suyos al crearse.
 */

const idSchema = z.string().uuid();

async function requireCeo() {
	const ctx = await getCustomerAccountContext();
	if (!ctx) return { ctx: null, response: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
	if (ctx.role !== "ceo") {
		return {
			ctx: null,
			response: NextResponse.json({ error: "No autorizado. Solo el CEO configura los puntos." }, { status: 403 }),
		};
	}
	return { ctx, response: null };
}

function errorResponse(err: unknown) {
	if (err instanceof LoyaltyRuleError) return NextResponse.json({ error: err.message }, { status: err.status });
	return NextResponse.json({ error: "No se pudo completar la operación. Intenta de nuevo." }, { status: 500 });
}

async function parseRule(req: NextRequest) {
	const body = await req.json().catch(() => null);
	const parsed = loyaltyEarnRuleInputSchema.safeParse(body);
	if (!parsed.success) {
		const message = parsed.error.issues[0]?.message || "Revisa los datos de la regla.";
		return { input: null, response: NextResponse.json({ error: message }, { status: 400 }) };
	}
	return { input: parsed.data, response: null };
}

export async function GET() {
	const { ctx, response } = await requireCeo();
	if (!ctx) return response;

	const limited = await assertCustomerAccountRateLimit(ctx.companyId, "loyalty_rules_get", 60, 60_000);
	if (limited) return limited;

	try {
		const [rules, catalog] = await Promise.all([listEarnRules(ctx.companyId), listLoyaltyCatalog(ctx.companyId)]);
		return NextResponse.json({ rules, ...catalog });
	} catch (err) {
		return errorResponse(err);
	}
}

export async function POST(req: NextRequest) {
	const { ctx, response } = await requireCeo();
	if (!ctx) return response;

	const limited = await assertCustomerAccountRateLimit(ctx.companyId, "loyalty_rules_write", 60, 60_000);
	if (limited) return limited;

	const { input, response: invalid } = await parseRule(req);
	if (!input) return invalid;

	try {
		const rule = await createEarnRule(ctx.companyId, input);
		return NextResponse.json({ rule }, { status: 201 });
	} catch (err) {
		return errorResponse(err);
	}
}

export async function PATCH(req: NextRequest) {
	const { ctx, response } = await requireCeo();
	if (!ctx) return response;

	const limited = await assertCustomerAccountRateLimit(ctx.companyId, "loyalty_rules_write", 60, 60_000);
	if (limited) return limited;

	const id = idSchema.safeParse(req.nextUrl.searchParams.get("id"));
	if (!id.success) return NextResponse.json({ error: "Regla inválida." }, { status: 400 });

	const { input, response: invalid } = await parseRule(req);
	if (!input) return invalid;

	try {
		const rule = await updateEarnRule(ctx.companyId, id.data, input);
		return NextResponse.json({ rule });
	} catch (err) {
		return errorResponse(err);
	}
}

export async function DELETE(req: NextRequest) {
	const { ctx, response } = await requireCeo();
	if (!ctx) return response;

	const limited = await assertCustomerAccountRateLimit(ctx.companyId, "loyalty_rules_write", 60, 60_000);
	if (limited) return limited;

	const id = idSchema.safeParse(req.nextUrl.searchParams.get("id"));
	if (!id.success) return NextResponse.json({ error: "Regla inválida." }, { status: 400 });

	try {
		await deleteEarnRule(ctx.companyId, id.data);
		return NextResponse.json({ ok: true });
	} catch (err) {
		return errorResponse(err);
	}
}
