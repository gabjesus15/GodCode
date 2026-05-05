import { NextRequest, NextResponse } from "next/server";
import { logAdminAudit } from "@/lib/super-admin/admin-audit";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { SAAS_MUTATE_ROLES, validateAdminRolesOnServer } from "../../../../../utils/admin/server-auth";

type PatchBody = {
	slug?: string;
	name?: string;
	description?: string;
	price_one_time?: number | null;
	price_monthly?: number | null;
	type?: "one_time" | "monthly";
	is_active?: boolean;
	sort_order?: number;
};

export async function PATCH(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const permission = await validateAdminRolesOnServer([...SAAS_MUTATE_ROLES]);
	if (!permission.ok) {
		return NextResponse.json({ error: permission.error ?? "No autorizado" }, { status: permission.status ?? 403 });
	}

	const { id } = await params;
	if (!id) {
		return NextResponse.json({ error: "id faltante" }, { status: 400 });
	}

	const body = (await req.json().catch(() => ({}))) as PatchBody;
	const updates: Record<string, unknown> = {
		updated_at: new Date().toISOString(),
	};
	if (body.slug !== undefined) updates.slug = String(body.slug).trim().toLowerCase().replace(/\s+/g, "_");
	if (body.name !== undefined) updates.name = String(body.name).trim();
	if (body.description !== undefined) updates.description = body.description ? String(body.description).trim().slice(0, 500) : null;
	if (body.price_one_time !== undefined) updates.price_one_time = body.price_one_time != null ? Number(body.price_one_time) : null;
	if (body.price_monthly !== undefined) updates.price_monthly = body.price_monthly != null ? Number(body.price_monthly) : null;
	if (body.type !== undefined) updates.type = body.type === "monthly" ? "monthly" : "one_time";
	if (body.is_active !== undefined) updates.is_active = Boolean(body.is_active);
	if (body.sort_order !== undefined) updates.sort_order = Math.max(0, Number(body.sort_order) || 0);

	const { error } = await supabaseAdmin.from("addons").update(updates).eq("id", id);

	if (error) {
		if (error.code === "23505") {
			return NextResponse.json({ error: "Ya existe un add-on con ese slug" }, { status: 409 });
		}
		console.error("[addons/update] DB error:", error.message);
		return NextResponse.json({ error: "Error al actualizar add-on" }, { status: 500 });
	}
	await logAdminAudit({
		actorEmail: permission.email ?? "",
		actorRole: permission.role,
		action: "addon.update",
		resourceType: "addon",
		resourceId: id,
		metadata: { fields: Object.keys(updates) },
	});
	return NextResponse.json({ ok: true });
}
