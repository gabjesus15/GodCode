import { NextRequest, NextResponse } from "next/server";
import { logAdminAudit } from "@/lib/super-admin/admin-audit";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { MERCADOPAGO_RATE_KEY } from "@/lib/onboarding/checkout-service";
import { parseUsdClpRate } from "@/lib/payments/mercadopago";
import { SAAS_MUTATE_ROLES, validateAdminRolesOnServer } from "../../../../../../utils/admin/server-auth";

/** @service-role super-admin */

/** PATCH { "config": { "phone": "...", "email": "...", "bank": "..." } }
 * Crea o actualiza las filas en plan_payment_method_config para el method_id.
 */
export async function PATCH(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const permission = await validateAdminRolesOnServer([...SAAS_MUTATE_ROLES]);
	if (!permission.ok) {
		return NextResponse.json({ error: permission.error ?? "No autorizado" }, { status: permission.status ?? 403 });
	}

	const { id: methodId } = await params;
	if (!methodId) {
		return NextResponse.json({ error: "method id faltante" }, { status: 400 });
	}

	const body = (await req.json().catch(() => ({}))) as { config?: Record<string, string> };
	const config = body.config && typeof body.config === "object" ? body.config : {};
	// Con una tasa inválida Mercado Pago dejaría de ofrecerse en silencio: se avisa al guardar.
	const rate = config[MERCADOPAGO_RATE_KEY];
	if (rate !== undefined && String(rate).trim() && !parseUsdClpRate(String(rate))) {
		return NextResponse.json({ error: "La tasa USD → CLP debe ser un número mayor que 0 (ej: 950)." }, { status: 400 });
	}

	const { data: existing } = await supabaseAdmin
		.from("plan_payment_method_config")
		.select("id,key,value")
		.eq("method_id", methodId);

	const configKeys = new Set(Object.keys(config).map((k) => String(k).trim()).filter(Boolean));
	for (const row of existing ?? []) {
		if (row.key && !configKeys.has(row.key)) {
			await supabaseAdmin.from("plan_payment_method_config").delete().eq("id", row.id);
		}
	}

	for (const [key, value] of Object.entries(config)) {
		const k = String(key).trim().slice(0, 100);
		const v = String(value).trim().slice(0, 500);
		if (!k) continue;
		const row = existing?.find((r) => r.key === k);
		if (row) {
			await supabaseAdmin
				.from("plan_payment_method_config")
				.update({ value: v })
				.eq("id", row.id);
		} else {
			await supabaseAdmin
				.from("plan_payment_method_config")
				.insert({ method_id: methodId, key: k, value: v });
		}
	}

	await logAdminAudit({
		actorEmail: permission.email ?? "",
		actorRole: permission.role,
		action: "plan_payment_method.config_update",
		resourceType: "plan_payment_method",
		resourceId: methodId,
		metadata: { keys: Object.keys(config) },
	});
	return NextResponse.json({ ok: true });
}
