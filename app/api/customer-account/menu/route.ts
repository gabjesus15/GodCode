import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { getCustomerAccountContext } from "@/lib/tenant/customer-account-context";
import { assertCustomerAccountRateLimit } from "@/lib/tenant/customer-account-rate-limit";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { getCountryConfig } from "@/lib/geo/country-registry";
import { isMenuImportEnabled } from "@/lib/menu/ai-menu-import";
import { createMenuItems, deleteSampleItems, getMenuStatus } from "@/lib/menu/create-menu-items";
import { countDraftProducts, normalizeMenuDraft } from "@/lib/menu/menu-draft";
import { buildSampleMenu, resolveSampleSector } from "@/lib/menu/sample-menus";

/** @service-role customer-account
 *
 * Con service role solo se lee lo que ya existe del negocio, filtrado por ctx.companyId.
 * Las escrituras van por las RPC del catálogo con la sesión del dueño (lib/menu/create-menu-items).
 */

export const maxDuration = 60;

async function companyCurrency(companyId: string): Promise<string> {
	const { data } = await supabaseAdmin.from("companies").select("country").eq("id", companyId).maybeSingle();
	return getCountryConfig((data as { country?: string | null } | null)?.country ?? null)?.currency ?? "USD";
}

export async function GET() {
	const ctx = await getCustomerAccountContext();
	if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

	const limited = await assertCustomerAccountRateLimit(ctx.companyId, "menu_status_get", 60, 60_000);
	if (limited) return limited;

	const status = await getMenuStatus(supabaseAdmin, ctx.companyId);
	return NextResponse.json({ ...status, importEnabled: isMenuImportEnabled() });
}

/**
 * - `{ action: "sample", sector }`: carga el menú de ejemplo de ese tipo de negocio.
 * - `{ action: "create", draft }`: crea lo que el dueño revisó después de importar.
 */
export async function POST(req: NextRequest) {
	const ctx = await getCustomerAccountContext();
	if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

	const limited = await assertCustomerAccountRateLimit(ctx.companyId, "menu_create", 10, 10 * 60_000);
	if (limited) return limited;

	const payload = (await req.json().catch(() => ({}))) as { action?: unknown; sector?: unknown; draft?: unknown };
	let draft;
	if (payload.action === "sample") {
		draft = buildSampleMenu(resolveSampleSector(typeof payload.sector === "string" ? payload.sector : null), await companyCurrency(ctx.companyId));
	} else if (payload.action === "create") {
		const normalized = normalizeMenuDraft(payload.draft);
		if (!normalized || countDraftProducts(normalized.draft) === 0) {
			return NextResponse.json({ error: "No hay productos con nombre y precio para crear." }, { status: 400 });
		}
		draft = normalized.draft;
	} else {
		return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
	}

	const userClient = await createSupabaseServerClient("super-admin");
	const result = await createMenuItems({ userClient, adminClient: supabaseAdmin, companyId: ctx.companyId, draft });
	if (result.productsCreated > 0 || result.categoriesCreated > 0) revalidateTag(`menu:${ctx.companyId}`, "max");

	const status = await getMenuStatus(supabaseAdmin, ctx.companyId);
	const failed = result.productsCreated === 0 && result.errors.length > 0;
	return NextResponse.json(
		{ ...result, errors: result.errors.slice(0, 10), status },
		{ status: failed ? 502 : 200 },
	);
}

/** Borra los productos de ejemplo que el dueño no cambió. */
export async function DELETE() {
	const ctx = await getCustomerAccountContext();
	if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

	const limited = await assertCustomerAccountRateLimit(ctx.companyId, "menu_delete_samples", 10, 10 * 60_000);
	if (limited) return limited;

	const userClient = await createSupabaseServerClient("super-admin");
	const result = await deleteSampleItems({ userClient, adminClient: supabaseAdmin, companyId: ctx.companyId });
	if (result.productsDeleted > 0 || result.categoriesDeleted > 0) revalidateTag(`menu:${ctx.companyId}`, "max");

	const status = await getMenuStatus(supabaseAdmin, ctx.companyId);
	return NextResponse.json({ ...result, errors: result.errors.slice(0, 10), status });
}
