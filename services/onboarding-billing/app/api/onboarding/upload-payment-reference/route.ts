import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";

export async function POST(req: NextRequest) {
	try {
		const body = (await req.json().catch(() => ({}))) as {
			token?: string;
			payment_reference?: string;
			reference_file_url?: string;
		};
		const token = typeof body.token === "string" ? body.token.trim() : "";
		const paymentReference = typeof body.payment_reference === "string" ? body.payment_reference.trim() : "";
		const referenceFileUrl = typeof body.reference_file_url === "string" ? body.reference_file_url.trim() : "";

		if (!token || !paymentReference || !referenceFileUrl) {
			return NextResponse.json(
				{ error: "Faltan token, payment_reference o reference_file_url" },
				{ status: 400 }
			);
		}

		const { data: app } = await supabaseAdmin
			.from("onboarding_applications")
			.select("id,payment_reference,payment_status")
			.eq("verification_token", token)
			.maybeSingle();

		if (!app) {
			return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
		}

		const currentReference = String(app.payment_reference ?? "").trim();
		const currentStatus = String(app.payment_status ?? "").trim().toLowerCase();
		if (currentReference && currentReference !== paymentReference) {
			return NextResponse.json({ error: "La referencia no coincide con la solicitud" }, { status: 409 });
		}
		if (currentStatus && !["pending_validation", "rejected", "pending"].includes(currentStatus)) {
			return NextResponse.json(
				{ error: "Este pago ya fue procesado o no admite referencia" },
				{ status: 400 }
			);
		}

		const { error: updateError } = await supabaseAdmin
			.from("onboarding_applications")
			.update({
				status: "payment_pending",
				payment_reference: paymentReference,
				payment_status: "pending_validation",
				payment_reference_url: referenceFileUrl,
				updated_at: new Date().toISOString(),
			})
			.eq("id", app.id);

		if (updateError) {
			return NextResponse.json({ error: "Error al guardar la referencia" }, { status: 500 });
		}

		return NextResponse.json({ ok: true, message: "Comprobante registrado. Te avisaremos cuando sea validado." });
	} catch (err) {
		console.error("upload-payment-reference error:", err);
		return NextResponse.json({ error: "Error interno" }, { status: 500 });
	}
}
