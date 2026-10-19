import { NextRequest, NextResponse } from "next/server";

import {
	createTeamMember,
	deleteTeamMember,
	loadTeam,
	updateTeamMember,
	type TeamResult,
} from "@/lib/tenant/company-team";
import { getCustomerAccountContext } from "@/lib/tenant/customer-account-context";
import { assertCustomerAccountRateLimit } from "@/lib/tenant/customer-account-rate-limit";

/** @service-role customer-account */

/**
 * Equipo del negocio desde la cuenta del CEO (/cuenta › Equipo): usuarios hasta el tope
 * del plan (el CEO no cuenta) y el rol de cada uno. La lógica está en
 * `lib/tenant/company-team.ts`. La empresa sale siempre de la sesión, nunca del cuerpo.
 */

async function requireCeo() {
	const ctx = await getCustomerAccountContext();
	if (!ctx) return { ctx: null, response: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
	if (ctx.role !== "ceo") {
		return {
			ctx: null,
			response: NextResponse.json({ error: "No autorizado. Solo el CEO maneja el equipo." }, { status: 403 }),
		};
	}
	return { ctx, response: null };
}

async function readBody(req: NextRequest): Promise<Record<string, unknown>> {
	const body = await req.json().catch(() => null);
	return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
}

function respond(result: TeamResult) {
	return result.ok
		? NextResponse.json({ ok: true })
		: NextResponse.json({ error: result.error }, { status: result.status });
}

export async function GET() {
	const { ctx, response } = await requireCeo();
	if (!ctx) return response;

	const limited = await assertCustomerAccountRateLimit(ctx.companyId, "team_get", 60, 60_000);
	if (limited) return limited;

	try {
		return NextResponse.json(await loadTeam(ctx.companyId));
	} catch (err) {
		return NextResponse.json({ error: err instanceof Error ? err.message : "No se pudo leer el equipo" }, { status: 500 });
	}
}

export async function POST(req: NextRequest) {
	const { ctx, response } = await requireCeo();
	if (!ctx) return response;

	const limited = await assertCustomerAccountRateLimit(ctx.companyId, "team_post", 20, 10 * 60_000);
	if (limited) return limited;

	try {
		return respond(await createTeamMember({ companyId: ctx.companyId, userId: ctx.userId }, await readBody(req)));
	} catch (err) {
		return NextResponse.json({ error: err instanceof Error ? err.message : "No se pudo crear el usuario" }, { status: 500 });
	}
}

export async function PUT(req: NextRequest) {
	const { ctx, response } = await requireCeo();
	if (!ctx) return response;

	const limited = await assertCustomerAccountRateLimit(ctx.companyId, "team_put", 60, 10 * 60_000);
	if (limited) return limited;

	try {
		return respond(await updateTeamMember(ctx.companyId, await readBody(req)));
	} catch (err) {
		return NextResponse.json({ error: err instanceof Error ? err.message : "No se pudo guardar" }, { status: 500 });
	}
}

export async function DELETE(req: NextRequest) {
	const { ctx, response } = await requireCeo();
	if (!ctx) return response;

	const limited = await assertCustomerAccountRateLimit(ctx.companyId, "team_delete", 20, 10 * 60_000);
	if (limited) return limited;

	try {
		return respond(await deleteTeamMember(ctx.companyId, await readBody(req)));
	} catch (err) {
		return NextResponse.json({ error: err instanceof Error ? err.message : "No se pudo borrar" }, { status: 500 });
	}
}
