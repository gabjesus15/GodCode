import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { verifyUnsubscribe } from "@/lib/email/unsubscribe-token";

/** @service-role capability-token */

/**
 * Baja de los correos de cupones (`?a=<cuenta>&c=<empresa>&s=<firma>`).
 *
 * El enlace lo firma la Edge Function `coupon-emails` del panel con
 * `EMAIL_UNSUBSCRIBE_SECRET`; sin la firma no se puede dar de baja una cuenta ajena.
 *
 * - GET muestra una página con un botón: los antivirus de correo abren los enlaces
 *   por su cuenta, y un GET que diera de baja los daría de baja sin que el cliente
 *   hiciera nada.
 * - POST da de baja. Lo usa ese botón y el «Cancelar suscripción» de Gmail y Yahoo
 *   (`List-Unsubscribe-Post`), que llega sin `Origin`: por eso esta ruta está en
 *   `CSRF_EXEMPT_API_PATHS` de `proxy.ts`. La firma reemplaza a ese control.
 */

type Params = { accountId: string; companyId: string; signature: string };

function readParams(req: NextRequest): Params {
	const q = req.nextUrl.searchParams;
	return {
		accountId: String(q.get("a") ?? "").trim().toLowerCase(),
		companyId: String(q.get("c") ?? "").trim().toLowerCase(),
		signature: String(q.get("s") ?? "").trim(),
	};
}

async function isValid(params: Params): Promise<boolean> {
	const secret = process.env.EMAIL_UNSUBSCRIBE_SECRET ?? "";
	try {
		return await verifyUnsubscribe(secret, params.accountId, params.companyId, params.signature);
	} catch {
		return false;
	}
}

async function companyName(companyId: string): Promise<string> {
	const { data } = await supabaseAdmin.from("companies").select("name, theme_config").eq("id", companyId).maybeSingle();
	const row = data as { name: string | null; theme_config: { displayName?: unknown } | null } | null;
	const display = typeof row?.theme_config?.displayName === "string" ? row.theme_config.displayName.trim() : "";
	return display || row?.name?.trim() || "este negocio";
}

function escapeHtml(value: string): string {
	return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function page(title: string, body: string, status = 200): NextResponse {
	const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>${escapeHtml(title)}</title></head>
<body style="margin:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
<main style="max-width:440px;margin:64px auto;padding:28px 24px;background:#fff;border:1px solid #e5e7eb;border-radius:16px;">
<h1 style="margin:0 0 12px;font-size:20px;line-height:28px;">${escapeHtml(title)}</h1>
${body}
</main></body></html>`;
	return new NextResponse(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

const INVALID = () =>
	page(
		"Enlace no válido",
		`<p style="margin:0;font-size:15px;line-height:22px;color:#334155;">Este enlace de baja no es válido o está incompleto. Usa el enlace del último correo que te llegó.</p>`,
		400,
	);

export async function GET(req: NextRequest) {
	const params = readParams(req);
	if (!(await isValid(params))) return INVALID();
	const name = await companyName(params.companyId);
	const action = `/api/email/unsubscribe?${new URLSearchParams({ a: params.accountId, c: params.companyId, s: params.signature })}`;
	return page(
		"¿Dejar de recibir cupones?",
		`<p style="margin:0 0 20px;font-size:15px;line-height:22px;color:#334155;">Ya no te mandaremos cupones de <strong>${escapeHtml(name)}</strong> por correo. Tu cuenta del menú sigue igual.</p>
<form method="post" action="${escapeHtml(action)}"><button type="submit" style="padding:12px 20px;border:0;border-radius:10px;background:#0f172a;color:#fff;font-size:15px;font-weight:600;cursor:pointer;">Sí, dar de baja</button></form>`,
	);
}

export async function POST(req: NextRequest) {
	const params = readParams(req);
	if (!(await isValid(params))) return INVALID();

	const { error } = await supabaseAdmin
		.from("menu_client_accounts")
		.update({ marketing_email_opt_out_at: new Date().toISOString() })
		.eq("id", params.accountId)
		.eq("company_id", params.companyId)
		.is("marketing_email_opt_out_at", null);
	if (error) {
		console.error("[email/unsubscribe]", error.message);
		return page("No se pudo completar", `<p style="margin:0;color:#334155;">Inténtalo de nuevo en un momento.</p>`, 500);
	}

	// El one-click de Gmail solo mira el código; la persona que apretó el botón ve esto.
	const name = await companyName(params.companyId);
	return page(
		"Listo, te diste de baja",
		`<p style="margin:0;font-size:15px;line-height:22px;color:#334155;">Ya no recibirás cupones de <strong>${escapeHtml(name)}</strong> por correo.</p>`,
	);
}
