import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { isPanelOnlyPlan } from "@/lib/onboarding/store-draft-service";
import { alertOnboardingTeam } from "@/lib/onboarding/team-alerts";

/** @service-role capability-token
 *
 * El verification_token del correo confirma el correo. La respuesta dice además si el plan
 * es «solo panel CEO», para que la página no prometa armar una tienda («Ahora elige tu plan»).
 */

export async function GET(req: NextRequest) {
	const token = req.nextUrl.searchParams.get("token");
	if (!token) {
		return NextResponse.json({ error: "Token faltante" }, { status: 400 });
	}

	const { data, error } = await supabaseAdmin
		.from("onboarding_applications")
		.select("id, status, email_verified_at, business_name, responsible_name, email, phone, plan_id")
		.eq("verification_token", token)
		.maybeSingle();

	if (error) {
		return NextResponse.json({ error: "Error al verificar" }, { status: 500 });
	}
	if (!data) {
		return NextResponse.json({ error: "Enlace inválido o expirado" }, { status: 404 });
	}

	const nowIso = new Date().toISOString();
	const shouldSetEmailVerifiedAt = !data.email_verified_at;
	const shouldPromoteStatus = data.status === "pending_verification";

	if (shouldSetEmailVerifiedAt || shouldPromoteStatus) {
		const updatePayload: { status?: string; email_verified_at?: string; updated_at: string } = {
			updated_at: nowIso,
		};
		if (shouldSetEmailVerifiedAt) {
			updatePayload.email_verified_at = nowIso;
		}
		if (shouldPromoteStatus) {
			updatePayload.status = "email_verified";
		}

		const { error: updateError } = await supabaseAdmin
			.from("onboarding_applications")
			.update(updatePayload)
			.eq("id", data.id);

		if (updateError) {
			return NextResponse.json({ error: "Error al confirmar" }, { status: 500 });
		}
		// Solo la primera vez que pasa de "pendiente" a "verificado": un reintento del enlace no avisa de nuevo.
		if (shouldPromoteStatus) {
			await alertOnboardingTeam({
				kind: "email_verified",
				businessName: String(data.business_name ?? ""),
				responsibleName: data.responsible_name ?? null,
				email: String(data.email ?? ""),
				phone: data.phone ?? null,
			});
		}
	}

	// El mismo criterio que usa «Crear mi tienda» para mandarlo a elegir el plan. Si la
	// consulta falla, el correo igual queda confirmado y la página muestra los textos de siempre.
	const panelOnly = await isPanelOnlyPlan(supabaseAdmin, data.plan_id).catch(() => false);

	return NextResponse.json({
		ok: true,
		token,
		alreadyVerified: !shouldPromoteStatus,
		panelOnly,
		message: "Email verificado. Puedes continuar con el formulario.",
	});
}
