import { NextRequest, NextResponse } from "next/server";

import { sendEmail } from "@/lib/email/send";
import { findCatalogEntry } from "@/lib/email/templates";
import { isRateLimited } from "@/lib/onboarding/rate-limit";
import { SAAS_MUTATE_ROLES, validateAdminRolesOnServer } from "@/utils/admin/server-auth";

const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

/**
 * Manda una plantilla con sus datos de ejemplo (nunca datos de clientes) para ver cómo
 * llega a una bandeja real. Por defecto al correo de la sesión; se puede indicar otro.
 * Solo super_admin y con límite de envíos.
 */
export async function POST(req: NextRequest) {
	const permission = await validateAdminRolesOnServer([...SAAS_MUTATE_ROLES]);
	if (!permission.ok || !permission.email) {
		return NextResponse.json({ error: permission.error ?? "No autorizado" }, { status: permission.status ?? 403 });
	}

	const body = (await req.json().catch(() => ({}))) as { kind?: string; to?: string };
	const entry = findCatalogEntry(String(body.kind ?? ""));
	if (!entry) return NextResponse.json({ error: "Ese correo no existe." }, { status: 400 });

	const to = String(body.to ?? "").trim().toLowerCase() || permission.email;
	if (!EMAIL_PATTERN.test(to)) return NextResponse.json({ error: "Escribe un correo válido." }, { status: 400 });

	if (await isRateLimited(`email_test:${permission.email}`, 25, 10 * 60_000)) {
		return NextResponse.json({ error: "Mandaste muchas pruebas seguidas. Espera unos minutos." }, { status: 429 });
	}

	const result = await sendEmail({
		kind: entry.kind,
		to,
		data: entry.sample as never,
		subjectPrefix: "[Prueba] ",
		metadata: { source: "super-admin-test", requestedBy: permission.email },
	});

	if (result.status === "sent") {
		return NextResponse.json({ ok: true, message: `Enviado a ${to}. Puede tardar un minuto en llegar.` });
	}
	const reason = result.status === "failed" ? result.error : result.status === "skipped" ? result.reason : "Ya se había enviado.";
	return NextResponse.json({ error: `No se pudo enviar: ${reason}` }, { status: 502 });
}
