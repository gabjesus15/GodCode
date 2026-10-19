import { NextRequest, NextResponse } from "next/server";

import { createCompanyRole, deleteCompanyRole, updateCompanyRole, type TeamResult } from "@/lib/tenant/company-team";
import { getCustomerAccountContext } from "@/lib/tenant/customer-account-context";
import { assertCustomerAccountRateLimit } from "@/lib/tenant/customer-account-rate-limit";

/** @service-role customer-account */

/**
 * Roles propios del negocio (/cuenta › Equipo): nombre, secciones del panel que ven y
 * acciones que pueden hacer. Se leen junto al equipo en `GET /api/customer-account/team`.
 * La empresa sale siempre de la sesión, nunca del cuerpo.
 */

async function requireCeo() {
	const ctx = await getCustomerAccountContext();
	if (!ctx) return { ctx: null, response: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
	if (ctx.role !== "ceo") {
		return {
			ctx: null,
			response: NextResponse.json({ error: "No autorizado. Solo el CEO maneja los roles." }, { status: 403 }),
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

async function handle(
	req: NextRequest,
	scope: string,
	action: (companyId: string, body: Record<string, unknown>) => Promise<TeamResult>,
) {
	const { ctx, response } = await requireCeo();
	if (!ctx) return response;

	const limited = await assertCustomerAccountRateLimit(ctx.companyId, scope, 30, 10 * 60_000);
	if (limited) return limited;

	try {
		return respond(await action(ctx.companyId, await readBody(req)));
	} catch (err) {
		return NextResponse.json({ error: err instanceof Error ? err.message : "No se pudo guardar el rol" }, { status: 500 });
	}
}

export async function POST(req: NextRequest) {
	return handle(req, "team_roles_post", createCompanyRole);
}

export async function PUT(req: NextRequest) {
	return handle(req, "team_roles_put", updateCompanyRole);
}

export async function DELETE(req: NextRequest) {
	return handle(req, "team_roles_delete", deleteCompanyRole);
}
