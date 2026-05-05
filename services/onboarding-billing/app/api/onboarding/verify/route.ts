import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";

export async function GET(req: NextRequest) {
	const token = req.nextUrl.searchParams.get("token");
	if (!token) {
		return NextResponse.json({ error: "Token faltante" }, { status: 400 });
	}

	const { data, error } = await supabaseAdmin
		.from("onboarding_applications")
		.select("id, status, email_verified_at")
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
	}

	return NextResponse.json({
		ok: true,
		token,
		alreadyVerified: !shouldPromoteStatus,
		message: "Email verificado. Puedes continuar con el formulario.",
	});
}
