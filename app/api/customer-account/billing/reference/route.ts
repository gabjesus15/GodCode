import { NextRequest, NextResponse } from "next/server";

import { submitPortalReceipt } from "@/lib/billing/portal-billing";
import { notifyPortalReceipt } from "@/lib/email/account-notices";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { isOwnStorageUrl } from "@/lib/storage/own-storage-url";
import { getCustomerAccountContext } from "@/lib/tenant/customer-account-context";
import { assertCustomerAccountRateLimit } from "@/lib/tenant/customer-account-rate-limit";

/** @service-role customer-account
 *
 * Comprobante de un pago manual del portal. El pedido se busca con ctx.companyId: nadie
 * puede tocar pagos de otra empresa. Con el comprobante, el pedido pasa a revisión.
 */

export async function POST(req: NextRequest) {
	const ctx = await getCustomerAccountContext();
	if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

	const limited = await assertCustomerAccountRateLimit(ctx.companyId, "billing_reference_post", 15, 60_000);
	if (limited) return limited;

	const body = (await req.json().catch(() => ({}))) as {
		paymentId?: string;
		referenceFileUrl?: string;
		methodSlug?: string;
	};
	const paymentId = String(body.paymentId ?? "").trim();
	const referenceFileUrl = String(body.referenceFileUrl ?? "").trim();
	if (!paymentId || !referenceFileUrl) {
		return NextResponse.json({ error: "Falta el pago o el comprobante." }, { status: 400 });
	}
	// Solo archivos subidos a nuestro Storage: el equipo abre este enlace desde el panel.
	if (!isOwnStorageUrl(referenceFileUrl)) {
		return NextResponse.json({ error: "Sube el comprobante desde esta página." }, { status: 400 });
	}

	const { data: company } = await supabaseAdmin.from("companies").select("country").eq("id", ctx.companyId).maybeSingle();
	const result = await submitPortalReceipt({
		companyId: ctx.companyId,
		country: (company?.country as string | null) ?? null,
		paymentId,
		methodSlug: body.methodSlug,
		referenceFileUrl,
	});
	if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
	if (result.order) await notifyPortalReceipt(supabaseAdmin, result.order);

	return NextResponse.json({
		ok: true,
		order: result.order,
		message: "Recibimos tu comprobante. Te avisamos por correo cuando lo validemos (normalmente el mismo día hábil).",
	});
}
