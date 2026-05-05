import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { SAAS_MUTATE_ROLES, SAAS_READ_ROLES, validateAdminRolesOnServer } from "../../../../utils/admin/server-auth";

import { logAdminAudit } from "@/lib/super-admin/admin-audit";
import { normalizePlanFeaturesPayload } from "@/lib/plans/plan-features";
import { buildPlanMarketingLinesI18nPayload, buildPlanNameI18nPayload } from "@/lib/plans/plan-i18n";
import { normalizeMarketingLines } from "@/lib/plans/plan-marketing-lines";
import { adminInsertPlan, queryAdminPlansList } from "@/lib/plans/plans-db-query";

export async function GET() {
	const permission = await validateAdminRolesOnServer([...SAAS_READ_ROLES]);
	if (!permission.ok) {
		return NextResponse.json({ error: permission.error ?? "No autorizado" }, { status: permission.status ?? 403 });
	}

	const { data, error } = await queryAdminPlansList();

	if (error) {
		console.error("[plans/list] DB error:", error.message);
		return NextResponse.json({ error: "Error al cargar planes" }, { status: 500 });
	}
	return NextResponse.json({ data: data ?? [] });
}

type CreateBody = {
	name: string;
	price?: number;
	prices_by_continent?: Record<string, { price: number; currency: string }>;
	max_branches?: number;
	max_users?: number;
	is_public?: boolean;
	is_active?: boolean;
	features?: Record<string, unknown>;
	marketing_lines?: unknown;
	name_i18n?: unknown;
	marketing_lines_i18n?: unknown;
};

export async function POST(req: NextRequest) {
	const permission = await validateAdminRolesOnServer([...SAAS_MUTATE_ROLES]);
	if (!permission.ok) {
		return NextResponse.json({ error: permission.error ?? "No autorizado" }, { status: permission.status ?? 403 });
	}

	const body = (await req.json().catch(() => ({}))) as CreateBody;
	const name = String(body.name ?? "").trim();
	if (!name) {
		return NextResponse.json({ error: "name es obligatorio" }, { status: 400 });
	}

	const payload: Record<string, unknown> = {
		name,
		price: Math.max(0, Number(body.price) ?? 0),
		prices_by_continent:
			body.prices_by_continent && typeof body.prices_by_continent === "object"
				? body.prices_by_continent
				: {},
		max_branches: Math.max(0, Math.min(9999, Number(body.max_branches) ?? 1)),
		max_users: Math.max(0, Math.min(999999, Number(body.max_users) ?? 0)),
		is_public: body.is_public !== false,
		is_active: body.is_active !== false,
		features: normalizePlanFeaturesPayload(body.features),
		marketing_lines: normalizeMarketingLines(body.marketing_lines),
		name_i18n: buildPlanNameI18nPayload(body.name_i18n, name),
		marketing_lines_i18n: buildPlanMarketingLinesI18nPayload(body.marketing_lines_i18n, body.marketing_lines),
	};
	const { error, optionalColumnsSkipped, singleId } = await adminInsertPlan(payload);

	if (error) {
		console.error("[plans/create] DB error:", error.message);
		const detail = process.env.NODE_ENV === "development" ? error.message : undefined;
		return NextResponse.json({ error: "Error al crear plan", detail }, { status: 500 });
	}
	await logAdminAudit({
		actorEmail: permission.email ?? "",
		actorRole: permission.role,
		action: "plan.create",
		resourceType: "plan",
		resourceId: singleId ?? undefined,
		metadata: { name },
	});
	revalidatePath("/");
	revalidateTag("tag:plans", "max");
	return NextResponse.json({
		ok: true,
		id: singleId,
		...(optionalColumnsSkipped
			? {
					warning:
						"Las traducciones no se guardaron: faltan columnas opcionales de i18n en la base de datos. Ejecuta las migraciones de planes.",
				}
			: {}),
	});
}
