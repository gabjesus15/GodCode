import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { logAdminAudit } from "@/lib/super-admin/admin-audit";
import { buildCompanyPanelAccessFromPlanFeatures } from "@/lib/super-admin/company-panel-access";
import { normalizePlanFeaturesPayload } from "@/lib/plans/plan-features";
import { buildPlanMarketingLinesI18nPayload, buildPlanNameI18nPayload } from "@/lib/plans/plan-i18n";
import { normalizeMarketingLines } from "@/lib/plans/plan-marketing-lines";
import { adminUpdatePlanById } from "@/lib/plans/plans-db-query";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { SAAS_MUTATE_ROLES, validateAdminRolesOnServer } from "../../../../../utils/admin/server-auth";

type PatchBody = {
	name?: string;
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

function asThemeConfigObject(raw: unknown): Record<string, unknown> {
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
		return {};
	}
	return { ...(raw as Record<string, unknown>) };
}

async function syncPlanPanelAccessToCompanies(planId: string, planFeatures: unknown): Promise<{ synced: number }> {
	const panelAccess = buildCompanyPanelAccessFromPlanFeatures(planFeatures);
	const { data: companies, error: companiesError } = await supabaseAdmin
		.from("companies")
		.select("id,theme_config")
		.eq("plan_id", planId);

	if (companiesError) {
		throw new Error(companiesError.message);
	}

	let synced = 0;
	for (const company of companies ?? []) {
		const nextThemeConfig = {
			...asThemeConfigObject(company.theme_config),
			panelAccess,
		};

		const { error: updateError } = await supabaseAdmin
			.from("companies")
			.update({ theme_config: nextThemeConfig })
			.eq("id", company.id);

		if (updateError) {
			throw new Error(updateError.message);
		}
		synced += 1;
	}

	return { synced };
}

export async function PATCH(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const permission = await validateAdminRolesOnServer([...SAAS_MUTATE_ROLES]);
	if (!permission.ok) {
		return NextResponse.json({ error: permission.error ?? "No autorizado" }, { status: permission.status ?? 403 });
	}

	const rawId = (await params).id;
	const id = typeof rawId === "string" ? rawId.trim() : "";
	if (!id) {
		return NextResponse.json({ error: "id faltante" }, { status: 400 });
	}

	const body = (await req.json().catch(() => ({}))) as PatchBody;
	const updates: Record<string, unknown> = {};
	if (body.name !== undefined) {
		const trimmed = String(body.name).trim();
		if (!trimmed) {
			return NextResponse.json({ error: "El nombre del plan no puede estar vacío." }, { status: 400 });
		}
		updates.name = trimmed;
	}
	if (body.price !== undefined) updates.price = Math.max(0, Number(body.price));
	if (body.prices_by_continent !== undefined) {
		updates.prices_by_continent = typeof body.prices_by_continent === "object" ? body.prices_by_continent : {};
	}
	if (body.max_branches !== undefined) updates.max_branches = Math.max(0, Math.min(9999, Number(body.max_branches)));
	if (body.max_users !== undefined) updates.max_users = Math.max(0, Math.min(999999, Number(body.max_users)));
	if (body.is_public !== undefined) updates.is_public = Boolean(body.is_public);
	if (body.is_active !== undefined) updates.is_active = Boolean(body.is_active);
	if (body.features !== undefined) updates.features = normalizePlanFeaturesPayload(body.features);
	if (body.marketing_lines !== undefined) {
		updates.marketing_lines = normalizeMarketingLines(body.marketing_lines);
	}
	if (body.name_i18n !== undefined) {
		const fallbackName = body.name !== undefined ? body.name : "Plan";
		updates.name_i18n = buildPlanNameI18nPayload(body.name_i18n, fallbackName);
	}
	if (body.marketing_lines_i18n !== undefined) {
		const fallbackLines = body.marketing_lines !== undefined ? body.marketing_lines : [];
		updates.marketing_lines_i18n = buildPlanMarketingLinesI18nPayload(body.marketing_lines_i18n, fallbackLines);
	}

	if (Object.keys(updates).length === 0) {
		return NextResponse.json({ error: "No hay cambios que guardar." }, { status: 400 });
	}

	const { data: updatedRows, error, optionalColumnsSkipped } = await adminUpdatePlanById(id, updates);

	if (error) {
		console.error("[plans/update] DB error:", error.message);
		const detail = process.env.NODE_ENV === "development" ? error.message : undefined;
		return NextResponse.json({ error: "Error al actualizar plan", detail }, { status: 500 });
	}

	const returnedRow = Array.isArray(updatedRows) && updatedRows.length > 0;
	if (!returnedRow) {
		/* PostgREST a veces devuelve cuerpo vacío pese a UPDATE OK (proxy/réplica). Si la fila existe, damos por bueno. */
		const { data: stillThere, error: readErr } = await supabaseAdmin
			.from("plans")
			.select("id")
			.eq("id", id)
			.maybeSingle();
		if (readErr) {
			console.error("[plans/update] verify error:", readErr.message);
			return NextResponse.json({ error: "Error al verificar el plan" }, { status: 500 });
		}
		if (!stillThere) {
			return NextResponse.json({ error: "No se encontró el plan." }, { status: 404 });
		}
	}

	let syncWarning: string | null = null;
	if (updates.features !== undefined) {
		try {
			const { synced } = await syncPlanPanelAccessToCompanies(id, updates.features);
			if (synced > 0) {
				syncWarning = null;
			}
		} catch (syncError) {
			const reason = syncError instanceof Error ? syncError.message : "Error desconocido";
			console.error("[plans/update] panelAccess sync error:", reason);
			syncWarning =
				"El plan se guardó, pero no se pudo sincronizar panelAccess en todas las empresas de este plan. Reintenta o revisa logs.";
		}
	}

	await logAdminAudit({
		actorEmail: permission.email ?? "",
		actorRole: permission.role,
		action: "plan.update",
		resourceType: "plan",
		resourceId: id,
		metadata: { fields: Object.keys(updates) },
	});
	revalidatePath("/");
	revalidateTag("tag:plans", "max");
	const warningMessages: string[] = [];
	if (optionalColumnsSkipped) {
		warningMessages.push(
			"Las traducciones no se guardaron: faltan columnas opcionales de i18n en la base de datos. Ejecuta las migraciones de planes.",
		);
	}
	if (syncWarning) {
		warningMessages.push(syncWarning);
	}

	return NextResponse.json({
		ok: true,
		...(warningMessages.length > 0
			? {
					warning: warningMessages.join(" "),
				}
			: {}),
	});
}
