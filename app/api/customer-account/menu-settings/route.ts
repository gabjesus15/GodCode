import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { getCustomerAccountContext } from "@/lib/tenant/customer-account-context";
import { assertCustomerAccountRateLimit } from "@/lib/tenant/customer-account-rate-limit";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import {
	extractMenuSettingsFromIntegration,
	isOrderChannelMode,
	mergeMenuSettingsIntoIntegration,
	normalizeMenuSettingsPatch,
	type CompanyMenuSettings,
} from "@/lib/tenant/menu-settings";

export async function GET() {
	const ctx = await getCustomerAccountContext();
	if (!ctx) {
		return NextResponse.json({ error: "No autorizado" }, { status: 401 });
	}

	const limited = await assertCustomerAccountRateLimit(ctx.companyId, "menu_settings_get", 60, 60_000);
	if (limited) return limited;

	const { data, error } = await supabaseAdmin
		.from("companies")
		.select("integration_settings, public_slug, plans:plans(features)")
		.eq("id", ctx.companyId)
		.maybeSingle();

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	const menuSettings = extractMenuSettingsFromIntegration(data?.integration_settings);
	const planFeatures = (data?.plans as { features?: unknown } | null)?.features ?? null;

	return NextResponse.json({
		menuSettings,
		planAllowsOnlineOrdering:
			planFeatures == null ||
			(typeof planFeatures === "object" &&
				!Array.isArray(planFeatures) &&
				(planFeatures as { online_ordering?: boolean }).online_ordering !== false),
		publicSlug: data?.public_slug ?? null,
	});
}

export async function PUT(req: NextRequest) {
	const ctx = await getCustomerAccountContext();
	if (!ctx) {
		return NextResponse.json({ error: "No autorizado" }, { status: 401 });
	}

	if (ctx.role !== "ceo") {
		return NextResponse.json(
			{ error: "No autorizado. Solo el CEO puede editar la configuración del menú." },
			{ status: 403 },
		);
	}

	const limited = await assertCustomerAccountRateLimit(ctx.companyId, "menu_settings_put", 30, 60_000);
	if (limited) return limited;

	const payload = (await req.json().catch(() => ({}))) as Partial<CompanyMenuSettings>;
	const patch: Partial<CompanyMenuSettings> = {};

	if (Object.prototype.hasOwnProperty.call(payload, "cartEnabled")) {
		patch.cartEnabled = payload.cartEnabled !== false;
	}
	if (Object.prototype.hasOwnProperty.call(payload, "orderChannel")) {
		if (!isOrderChannelMode(payload.orderChannel)) {
			return NextResponse.json({ error: "Canal de pedidos inválido." }, { status: 400 });
		}
		patch.orderChannel = payload.orderChannel;
	}

	if (Object.keys(patch).length === 0) {
		return NextResponse.json({ error: "No hay cambios para guardar." }, { status: 400 });
	}

	const { data: company, error: loadError } = await supabaseAdmin
		.from("companies")
		.select("integration_settings, public_slug, plans:plans(features)")
		.eq("id", ctx.companyId)
		.maybeSingle();

	if (loadError) {
		return NextResponse.json({ error: loadError.message }, { status: 500 });
	}

	const planFeatures = (company?.plans as { features?: unknown } | null)?.features ?? null;
	const planAllows =
		planFeatures == null ||
		(typeof planFeatures === "object" &&
			!Array.isArray(planFeatures) &&
			(planFeatures as { online_ordering?: boolean }).online_ordering !== false);

	if (!planAllows && patch.cartEnabled !== false) {
		return NextResponse.json(
			{ error: "Tu plan no incluye pedidos en línea. No puedes activar el carrito." },
			{ status: 403 },
		);
	}

	const nextIntegration = mergeMenuSettingsIntoIntegration(company?.integration_settings, patch);
	const menuSettings = normalizeMenuSettingsPatch(
		extractMenuSettingsFromIntegration(nextIntegration),
	);

	const { error: updateError } = await supabaseAdmin
		.from("companies")
		.update({ integration_settings: nextIntegration })
		.eq("id", ctx.companyId);

	if (updateError) {
		return NextResponse.json({ error: updateError.message }, { status: 500 });
	}

	revalidateTag(`menu:${ctx.companyId}`, "max");
	const publicSlug = company?.public_slug?.trim();
	if (publicSlug) {
		revalidateTag(`company-slug:${publicSlug}`, "max");
	}

	return NextResponse.json({ menuSettings, planAllowsOnlineOrdering: planAllows });
}
