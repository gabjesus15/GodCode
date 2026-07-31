import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { getCustomerAccountContext } from "@/lib/tenant/customer-account-context";
import { assertCustomerAccountRateLimit } from "@/lib/tenant/customer-account-rate-limit";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";

export async function GET() {
	const ctx = await getCustomerAccountContext();
	if (!ctx) {
		return NextResponse.json({ error: "No autorizado" }, { status: 401 });
	}

	const limited = await assertCustomerAccountRateLimit(ctx.companyId, "business_info_get", 60, 60_000);
	if (limited) return limited;

	const { data, error } = await supabaseAdmin
		.from("business_info")
		.select("name,phone,address,instagram,schedule,country,currency")
		.eq("company_id", ctx.companyId)
		.maybeSingle();

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	return NextResponse.json({ businessInfo: data ?? null });
}

export async function PUT(req: NextRequest) {
	const ctx = await getCustomerAccountContext();
	if (!ctx) {
		return NextResponse.json({ error: "No autorizado" }, { status: 401 });
	}

	if (ctx.role !== "ceo") {
		return NextResponse.json(
			{ error: "No autorizado. Solo el CEO puede editar el perfil público." },
			{ status: 403 },
		);
	}

	const limited = await assertCustomerAccountRateLimit(ctx.companyId, "business_info_put", 30, 60_000);
	if (limited) return limited;

	const payload = await req.json().catch(() => ({}));
	const hasSchedule = Object.prototype.hasOwnProperty.call(payload, "schedule");
	const hasPhone = Object.prototype.hasOwnProperty.call(payload, "phone");
	const hasAddress = Object.prototype.hasOwnProperty.call(payload, "address");
	const hasInstagram = Object.prototype.hasOwnProperty.call(payload, "instagram");

	const { data: existing } = await supabaseAdmin
		.from("business_info")
		.select("name,phone,address,instagram,schedule,country,currency")
		.eq("company_id", ctx.companyId)
		.maybeSingle();

	const patch: Record<string, unknown> = {
		company_id: ctx.companyId,
		updated_at: new Date().toISOString(),
	};

	if (hasSchedule) {
		patch.schedule = typeof payload.schedule === "string" ? payload.schedule.trim() : "";
	} else if (existing) {
		patch.schedule = existing.schedule ?? "";
	}

	if (hasPhone) {
		patch.phone = typeof payload.phone === "string" ? payload.phone.trim() : "";
	} else if (existing) {
		patch.phone = existing.phone ?? "";
	}

	if (hasAddress) {
		patch.address = typeof payload.address === "string" ? payload.address.trim() : "";
	} else if (existing) {
		patch.address = existing.address ?? "";
	}

	if (hasInstagram) {
		patch.instagram = typeof payload.instagram === "string" ? payload.instagram.trim() : "";
	} else if (existing) {
		patch.instagram = existing.instagram ?? "";
	}

	// Preserve business_info.name / country / currency unless absent (bootstrap).
	patch.name = existing?.name ?? null;
	patch.country = existing?.country ?? null;
	patch.currency = existing?.currency ?? null;

	if (!existing) {
		const { data: company } = await supabaseAdmin
			.from("companies")
			.select("name,country,currency")
			.eq("id", ctx.companyId)
			.maybeSingle();
		patch.name = company?.name?.trim() || null;
		patch.country = company?.country ?? null;
		patch.currency = company?.currency ?? null;
	}

	const { error } = await supabaseAdmin.from("business_info").upsert(patch, {
		onConflict: "company_id",
	});

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	revalidateTag(`menu:${ctx.companyId}`, "max");

	return NextResponse.json({ ok: true });
}
