import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import {
	PRIVATE_RECEIPTS_BUCKET,
	PRIVATE_RECEIPT_SIGNED_URL_TTL,
	isPrivateReceiptPath,
	paymentReferenceCompanyId,
} from "@/lib/storage/private-receipts";
import { getCustomerAccountContext } from "@/lib/tenant/customer-account-context";
import { SAAS_READ_ROLES, validateAdminRolesOnServer } from "@/utils/admin/server-auth";

/** @service-role super-admin, customer-account
 *
 * Abre un comprobante del bucket privado `receipts`. El equipo (super_admin/soporte) ve
 * cualquiera; el CEO del portal solo los de su empresa, que van en la ruta del archivo.
 * Responde con un redirect a una URL firmada de pocos minutos, así los enlaces guardados
 * en la base no caducan y tampoco sirven a quien no tenga sesión.
 */

export const runtime = "nodejs";

function notFound() {
	return NextResponse.json({ error: "Comprobante no encontrado." }, { status: 404 });
}

async function canOpen(path: string): Promise<boolean> {
	const admin = await validateAdminRolesOnServer([...SAAS_READ_ROLES]);
	if (admin.ok) return true;

	const ownerCompanyId = paymentReferenceCompanyId(path);
	if (!ownerCompanyId) return false;
	const ctx = await getCustomerAccountContext();
	return Boolean(ctx && ctx.companyId === ownerCompanyId);
}

export async function GET(req: NextRequest) {
	const path = req.nextUrl.searchParams.get("path") ?? "";
	if (!isPrivateReceiptPath(path)) return notFound();

	// Mismo 404 sin permiso que sin archivo: no confirmar qué rutas existen.
	if (!(await canOpen(path))) return notFound();

	const { data, error } = await supabaseAdmin.storage
		.from(PRIVATE_RECEIPTS_BUCKET)
		.createSignedUrl(path, PRIVATE_RECEIPT_SIGNED_URL_TTL);
	const signedUrl = String(data?.signedUrl ?? "").trim();
	if (error || !signedUrl) return notFound();

	const res = NextResponse.redirect(signedUrl, 302);
	res.headers.set("Cache-Control", "private, no-store");
	res.headers.set("Referrer-Policy", "no-referrer");
	return res;
}
