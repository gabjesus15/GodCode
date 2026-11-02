import { NextRequest, NextResponse } from "next/server";

import {
	createTeamMember,
	deleteTeamMember,
	loadTeam,
	updateTeamMember,
	type TeamResult,
} from "@/lib/tenant/company-team";
import { auditFieldNames, logAuditEvent } from "@/lib/security/audit-log";
import { getCustomerAccountContext, type CustomerAccountContext } from "@/lib/tenant/customer-account-context";
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

/** Deja en audit_log quién cambió el equipo; sin correos ni nombres, solo campos y rol. */
async function auditTeam(
	req: NextRequest,
	ctx: CustomerAccountContext,
	verb: "create" | "update" | "delete",
	body: Record<string, unknown>,
	result: TeamResult,
) {
	if (!result.ok) return;
	const id = typeof body.id === "string" ? body.id : null;
	await logAuditEvent(req, {
		companyId: ctx.companyId,
		actorAuthUserId: ctx.authUserId,
		actorRole: ctx.role,
		action: `cuenta.team.${verb}`,
		targetType: "users",
		targetIds: id ? [id] : [],
		metadata: {
			fields: auditFieldNames(body),
			...(typeof body.role === "string" ? { role: body.role } : {}),
		},
	});
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
		const body = await readBody(req);
		const result = await createTeamMember({ companyId: ctx.companyId, userId: ctx.userId }, body);
		await auditTeam(req, ctx, "create", body, result);
		return respond(result);
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
		const body = await readBody(req);
		const result = await updateTeamMember(ctx.companyId, body);
		await auditTeam(req, ctx, "update", body, result);
		return respond(result);
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
		const body = await readBody(req);
		const result = await deleteTeamMember(ctx.companyId, body);
		await auditTeam(req, ctx, "delete", body, result);
		return respond(result);
	} catch (err) {
		return NextResponse.json({ error: err instanceof Error ? err.message : "No se pudo borrar" }, { status: 500 });
	}
}
