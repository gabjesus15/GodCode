import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { SAAS_READ_ROLES, validateAdminRolesOnServer } from "../../../../utils/admin/server-auth";
import { SAAS_MUTATE_ROLES } from "../../../../utils/admin/server-auth";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { logAdminAudit } from "@/lib/super-admin/admin-audit";

export async function GET() {
	const permission = await validateAdminRolesOnServer([...SAAS_READ_ROLES]);
	if (!permission.ok) {
		return NextResponse.json({ error: permission.error ?? "No autorizado" }, { status: permission.status ?? 403 });
	}

	const { data: methods, error } = await supabaseAdmin
		.from("plan_payment_methods")
		.select("id,slug,name,countries,auto_verify,sort_order,is_active")
		.order("sort_order", { ascending: true });

	if (error) {
		console.error("[plan-payment-methods] DB error:", error.message);
		return NextResponse.json({ error: "Error al cargar métodos de pago" }, { status: 500 });
	}

	const withConfig = await Promise.all(
		(methods ?? []).map(async (m) => {
			const { data: rows } = await supabaseAdmin
				.from("plan_payment_method_config")
				.select("key,value")
				.eq("method_id", m.id);
			const config: Record<string, string> = {};
			for (const row of rows ?? []) {
				if (row.key) config[row.key] = row.value ?? "";
			}
			return { ...m, config };
		})
	);

	return NextResponse.json({ data: withConfig });
}

export async function PATCH(req: NextRequest) {
	const permission = await validateAdminRolesOnServer([...SAAS_MUTATE_ROLES]);
	if (!permission.ok) {
		return NextResponse.json({ error: permission.error ?? "No autorizado" }, { status: permission.status ?? 403 });
	}

	const body = (await req.json().catch(() => ({}))) as { id?: string; is_active?: boolean };
	const methodId = typeof body.id === "string" ? body.id.trim() : "";
	if (!methodId) {
		return NextResponse.json({ error: "id es requerido" }, { status: 400 });
	}

	if (typeof body.is_active !== "boolean") {
		return NextResponse.json({ error: "is_active debe ser boolean" }, { status: 400 });
	}

	const { data, error } = await supabaseAdmin
		.from("plan_payment_methods")
		.update({ is_active: body.is_active })
		.eq("id", methodId)
		.select("id,slug,name,is_active")
		.maybeSingle();

	if (error || !data) {
		return NextResponse.json({ error: "No se pudo actualizar el método" }, { status: 500 });
	}

	await logAdminAudit({
		actorEmail: permission.email ?? "",
		actorRole: permission.role,
		action: "plan_payment_method.toggle_active",
		resourceType: "plan_payment_method",
		resourceId: methodId,
		metadata: {
			slug: data.slug,
			name: data.name,
			is_active: data.is_active,
		},
	});

	return NextResponse.json({ ok: true, data });
}
