import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { logger, createRequestContext } from "@/lib/infra/logger";
import { ensureOnboardingOwnerAccess } from "@/lib/onboarding/complete-onboarding-payment";

/** @service-role capability-token
 *
 * La referencia identifica la solicitud; esta ruta solo consulta el estado y se asegura
 * (de forma idempotente) de que el dueño tenga acceso. Nunca cobra ni activa: eso lo
 * hacen la captura de PayPal y la validación del equipo.
 */

export async function POST(req: NextRequest) {
	const ctx = createRequestContext("/api/onboarding/finalize", "POST");
	try {
		const ref = req.nextUrl.searchParams.get("ref") ?? (await req.json().catch(() => ({}))).ref;
		if (!ref || typeof ref !== "string" || ref.length > 100 || !/^[a-zA-Z0-9_-]+$/.test(ref)) {
			logger.warn("finalize: referencia con formato inválido", ctx, { ref });
			return NextResponse.json({ error: "Referencia de pago inválida o faltante" }, { status: 400 });
		}

		const result = await ensureOnboardingOwnerAccess({
			supabaseAdmin,
			paymentReference: ref,
		});

		if (result.status === "not_found") {
			return NextResponse.json({ status: "not_found", error: "No encontramos ese pago" }, { status: 404 });
		}
		if (result.status === "pending") {
			return NextResponse.json({ ok: true, status: "pending" });
		}
		return NextResponse.json({
			ok: true,
			status: "paid",
			ownerReady: result.ownerReady,
			welcomeSent: result.welcomeSent,
		});
	} catch (error) {
		logger.error("finalize error", ctx, { error: String(error) });
		return NextResponse.json({ error: "Error interno" }, { status: 500 });
	}
}
