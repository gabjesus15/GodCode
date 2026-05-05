import { NextRequest, NextResponse } from "next/server";
import { logAdminAudit } from "@/lib/super-admin/admin-audit";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { SAAS_MUTATE_ROLES, SAAS_READ_ROLES, validateAdminRolesOnServer } from "../../../../utils/admin/server-auth";

export async function GET() {
	const permission = await validateAdminRolesOnServer([...SAAS_READ_ROLES]);
	if (!permission.ok) {
		return NextResponse.json({ error: permission.error ?? "No autorizado" }, { status: permission.status ?? 403 });
	}

	const { data, error } = await supabaseAdmin
		.from("addons")
		.select("id,slug,name,description,price_one_time,price_monthly,type,is_active,sort_order,created_at,updated_at")
		.order("sort_order", { ascending: true });

	if (error) {
		console.error("[addons/list] DB error:", error.message);
		return NextResponse.json({ error: "Error al cargar add-ons" }, { status: 500 });
	}
	return NextResponse.json({ data: data ?? [] });
}

type CreateBody = {
	slug: string;
	name: string;
	description?: string;
	price_one_time?: number | null;
	price_monthly?: number | null;
	type: "one_time" | "monthly";
	is_active?: boolean;
	sort_order?: number;
};

export async function POST(req: NextRequest) {
	const permission = await validateAdminRolesOnServer([...SAAS_MUTATE_ROLES]);
	if (!permission.ok) {
		return NextResponse.json({ error: permission.error ?? "No autorizado" }, { status: permission.status ?? 403 });
	}

	const body = (await req.json().catch(() => ({}))) as CreateBody;
	const slug = String(body.slug ?? "").trim().toLowerCase().replace(/\s+/g, "_");
	const name = String(body.name ?? "").trim();
	const type = body.type === "monthly" ? "monthly" : "one_time";

	if (!slug || !name) {
		return NextResponse.json({ error: "slug y name son obligatorios" }, { status: 400 });
	}

	const payload = {
		slug,
		name,
		description: body.description ? String(body.description).trim().slice(0, 500) : null,
		price_one_time: body.price_one_time != null ? Number(body.price_one_time) : null,
		price_monthly: body.price_monthly != null ? Number(body.price_monthly) : null,
		type,
		is_active: body.is_active !== false,
		sort_order: Math.max(0, Number(body.sort_order) || 0),
		updated_at: new Date().toISOString(),
	};

	const { data, error } = await supabaseAdmin.from("addons").insert(payload).select("id").single();

	if (error) {
		if (error.code === "23505") {
			return NextResponse.json({ error: "Ya existe un add-on con ese slug" }, { status: 409 });
		}
		console.error("[addons/create] DB error:", error.message);
		return NextResponse.json({ error: "Error al crear add-on" }, { status: 500 });
	}
	await logAdminAudit({
		actorEmail: permission.email ?? "",
		actorRole: permission.role,
		action: "addon.create",
		resourceType: "addon",
		resourceId: data?.id ?? undefined,
		metadata: { slug, name },
	});
	return NextResponse.json({ ok: true, id: data?.id });
}
