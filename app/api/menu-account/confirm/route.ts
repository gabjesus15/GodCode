import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { enforceRateLimit } from "@/lib/infra/api-guard";
import { logger } from "@/lib/infra/logger";
import { isMainDomain } from "@/lib/tenant/main-domain-host";
import { consumeLinkRequest, grantPasswordReset } from "@/lib/menu-account/account-service";
import { createMenuClientResponseClient } from "@/lib/menu-account/cookies";
import { MenuAccountError } from "@/lib/menu-account/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set<EmailOtpType>(["magiclink", "email", "recovery"]);

/**
 * Construye la ruta de "Mi cuenta" según cómo se sirva el negocio.
 *
 * En subdominio (`oishi.godcode.me`) y en dominio propio la ruta es `/mi-cuenta`;
 * solo en el dominio principal lleva el slug delante.
 */
function buildAccountPath(host: string, slug: string, query: string): string {
	const base = isMainDomain(host) && slug ? `/${slug}/mi-cuenta` : "/mi-cuenta";
	return query ? `${base}?${query}` : base;
}

/**
 * Punto único de canje de los enlaces enviados por correo.
 *
 * Se hace en el servidor a propósito: así el navegador nunca necesita instanciar un
 * cliente Supabase del scope `menu-client`, y la cookie se escribe aquí mismo.
 */
export async function GET(req: NextRequest) {
	const limited = await enforceRateLimit(req, "menu_account_confirm", 10, 60_000);
	if (limited) return limited;

	const params = req.nextUrl.searchParams;
	const tokenHash = params.get("token_hash") ?? "";
	const rawType = (params.get("type") ?? "") as EmailOtpType;
	const slug = (params.get("company") ?? "").trim().toLowerCase();
	const linkRequestId = params.get("link");
	const host = req.headers.get("host") ?? "";

	const fail = (reason: string) =>
		NextResponse.redirect(
			new URL(buildAccountPath(host, slug, `error=${reason}`), req.nextUrl.origin),
		);

	if (!tokenHash || !ALLOWED_TYPES.has(rawType)) return fail("link_invalid");

	const carrier = NextResponse.redirect(
		new URL(buildAccountPath(host, slug, ""), req.nextUrl.origin),
	);

	const supabase = createMenuClientResponseClient(req, carrier);
	const { data, error } = await supabase.auth.verifyOtp({ type: rawType, token_hash: tokenHash });

	if (error || !data?.user?.id) {
		logger.warn("menu_account_confirm_verify_failed", { message: error?.message });
		return fail("link_invalid");
	}

	const authUserId = data.user.id;

	try {
		if (rawType === "recovery") {
			await grantPasswordReset(authUserId);
			return redirectWithCookies(carrier, req, host, slug, "reset=1");
		}

		if (!linkRequestId) {
			// Magic link sin solicitud asociada: no hay nada que vincular, pero la
			// sesión quedó iniciada igual.
			return redirectWithCookies(carrier, req, host, slug, "");
		}

		// `authUserId` viene de la sesión recién creada, no de la URL: es lo que
		// impide confirmar la solicitud de vinculación de otra persona.
		const { companySlug } = await consumeLinkRequest(linkRequestId, authUserId);
		return redirectWithCookies(carrier, req, host, companySlug ?? slug, "linked=1");
	} catch (err) {
		if (err instanceof MenuAccountError) return fail(err.code);
		logger.error("menu_account_confirm_failed", {
			message: err instanceof Error ? err.message : String(err),
		});
		return fail("internal");
	}
}

/** Redirige al destino final conservando las cookies de sesión ya escritas. */
function redirectWithCookies(
	carrier: NextResponse,
	req: NextRequest,
	host: string,
	slug: string,
	query: string,
): NextResponse {
	const response = NextResponse.redirect(
		new URL(buildAccountPath(host, slug, query), req.nextUrl.origin),
	);
	for (const cookie of carrier.cookies.getAll()) {
		response.cookies.set(cookie);
	}
	return response;
}
