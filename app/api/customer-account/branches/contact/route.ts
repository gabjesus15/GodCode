import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { getCustomerAccountContext } from "@/lib/tenant/customer-account-context";
import { assertCustomerAccountRateLimit } from "@/lib/tenant/customer-account-rate-limit";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";

export async function PATCH(req: NextRequest) {
	const ctx = await getCustomerAccountContext();
	if (!ctx) {
		return NextResponse.json({ error: "No autorizado" }, { status: 401 });
	}

	if (ctx.role !== "ceo") {
		return NextResponse.json(
			{ error: "No autorizado. Solo el CEO puede editar contactos de sucursal." },
			{ status: 403 },
		);
	}

	const limited = await assertCustomerAccountRateLimit(ctx.companyId, "branches_contact_patch", 40, 60_000);
	if (limited) return limited;

	const payload = await req.json().catch(() => ({}));
	const id = String(payload.id ?? "").trim();
	if (!id) {
		return NextResponse.json({ error: "El ID de la sucursal es requerido" }, { status: 400 });
	}

	const { data: branch, error: fetchError } = await supabaseAdmin
		.from("branches")
		.select("company_id")
		.eq("id", id)
		.maybeSingle();

	if (fetchError || !branch) {
		return NextResponse.json({ error: "Sucursal no encontrada" }, { status: 404 });
	}

	if (branch.company_id !== ctx.companyId) {
		return NextResponse.json({ error: "No tienes permisos para modificar esta sucursal" }, { status: 403 });
	}

	const trimOrNull = (value: unknown) => {
		if (typeof value !== "string") return undefined;
		const trimmed = value.trim();
		return trimmed ? trimmed : null;
	};

	const updates: Record<string, string | null> = {};
	const phone = trimOrNull(payload.phone);
	const address = trimOrNull(payload.address);
	const schedule = trimOrNull(payload.schedule);
	const whatsappUrl = trimOrNull(payload.whatsapp_url);
	const instagramUrl = trimOrNull(payload.instagram_url);
	const mapUrl = trimOrNull(payload.map_url);

	if (phone !== undefined) updates.phone = phone;
	if (address !== undefined) updates.address = address;
	if (schedule !== undefined) updates.schedule = schedule;
	if (whatsappUrl !== undefined) updates.whatsapp_url = whatsappUrl;
	if (instagramUrl !== undefined) updates.instagram_url = instagramUrl;
	if (mapUrl !== undefined) updates.map_url = mapUrl;

	if (Object.keys(updates).length === 0) {
		return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
	}

	const { error: updateError } = await supabaseAdmin.from("branches").update(updates).eq("id", id);

	if (updateError) {
		return NextResponse.json({ error: updateError.message }, { status: 500 });
	}

	revalidateTag(`menu:${ctx.companyId}`, "max");

	return NextResponse.json({ ok: true });
}
