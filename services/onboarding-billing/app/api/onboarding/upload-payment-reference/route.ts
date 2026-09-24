import { NextRequest, NextResponse } from "next/server";

import { notifyOnboardingReceipt } from "@/lib/email/account-notices";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { isOwnStorageUrl } from "@/lib/storage/own-storage-url";

/** @service-role capability-token
 *
 * Comprobante de un pago manual (transferencia, Pago Móvil, Zelle…). Solo para el pago
 * manual vigente de la solicitud y solo con archivos de nuestro Storage.
 */

/** Se acepta mientras espera revisión o si el anterior fue rechazado (reenvío). */
const RECEIPT_ALLOWED_STATUSES = new Set(["pending_validation", "rejected"]);

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
			return NextResponse.json({ error: "Falta el comprobante o el enlace de tu solicitud." }, { status: 400 });
		}
		if (!isOwnStorageUrl(referenceFileUrl)) {
			return NextResponse.json({ error: "Sube el comprobante desde esta página." }, { status: 400 });
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
		// Los pagos con PayPal se confirman solos: un comprobante no los pasa a revisión manual.
		if (!currentReference.startsWith("manual-") || currentReference !== paymentReference) {
			return NextResponse.json({ error: "Esta referencia de pago ya no es la vigente. Vuelve a iniciar el pago." }, { status: 409 });
		}
		if (!RECEIPT_ALLOWED_STATUSES.has(currentStatus)) {
			return NextResponse.json({ error: "Este pago ya fue procesado." }, { status: 409 });
		}

		const { error: updateError } = await supabaseAdmin
			.from("onboarding_applications")
			.update({
				status: "payment_pending",
				payment_status: "pending_validation",
				payment_reference_url: referenceFileUrl,
				updated_at: new Date().toISOString(),
			})
			.eq("id", app.id);

		if (updateError) {
			return NextResponse.json({ error: "No pudimos guardar el comprobante. Intenta de nuevo." }, { status: 500 });
		}
		await notifyOnboardingReceipt(supabaseAdmin, String(app.id));

		return NextResponse.json({ ok: true, message: "Comprobante registrado. Te avisaremos cuando sea validado." });
	} catch (err) {
		console.error("upload-payment-reference error:", err);
		return NextResponse.json({ error: "Error interno" }, { status: 500 });
	}
}
