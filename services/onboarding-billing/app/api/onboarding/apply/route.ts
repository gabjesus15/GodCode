import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { createRequestContext, logger } from "@/lib/infra/logger";
import { getAppUrl } from "@/lib/tenant/app-url";
import { sendEmail, teamInbox } from "@/lib/email/send";
import { isMissingColumnError } from "@/lib/onboarding/db-compat";
import { RECAPTCHA_ACTIONS, verifyRecaptcha } from "@/lib/onboarding/recaptcha";
import { isRateLimited } from "@/lib/onboarding/rate-limit";
import { alertOnboardingTeam } from "@/lib/onboarding/team-alerts";
import { sendOnboardingResumeLink } from "@/lib/onboarding/resume-application";
import { resolveOnboardingCountry, sanitizePlanHint } from "@/lib/onboarding/onboarding-entry";
import { normalizeEmail } from "@/lib/onboarding/trial-eligibility";
import { resolvePlanProductMode } from "@/lib/plans/plan-product-mode";

/** @service-role public
 *
 * Formulario de alta: reCAPTCHA y rate limit por IP y correo.
 *
 * Un correo que ya tenía alta recibe la misma respuesta que uno nuevo (y en su bandeja, el
 * enlace para seguir o el aviso de que ya tiene cuenta): el formulario no sirve para
 * averiguar qué correos están registrados en Gcode.
 */

const SENT_RESPONSE = { ok: true, emailSent: true, message: "Solicitud enviada. Revisa tu correo para seguir." } as const;
const NOT_SENT_RESPONSE = {
	ok: true,
	emailSent: false,
	message: "Guardamos tu solicitud, pero el correo no salió. Pulsa «Reenviar correo» en unos minutos.",
} as const;

/** Versión de los Términos que aceptó (`LEGAL_DOCUMENTS_VERSION` del paso 1): texto corto o nada. */
function readLegalVersion(raw: unknown): string | null {
	if (typeof raw !== "string") return null;
	const value = raw.trim().slice(0, 32);
	return /^[A-Za-z0-9._-]+$/.test(value) ? value : null;
}

const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY ?? "";

/**
 * Atajo de desarrollo: da el correo por verificado y no envia ningun email.
 * Apagado salvo que la variable valga 1/true/on. Debe quedar apagado en produccion:
 * con esto cualquiera puede seguir el alta con un correo que no le pertenece.
 */
const SKIP_EMAIL_VERIFICATION = /^(1|true|on)$/i.test(
	(process.env.ONBOARDING_SKIP_EMAIL_VERIFICATION ?? "").trim()
);

type ApplyBody = {
	business_name: string;
	responsible_name: string;
	email: string;
	phone?: string;
	sector?: string;
	message?: string;
	terms_accepted?: boolean;
	privacy_accepted?: boolean;
	recaptcha_token?: string;
	/** Del landing (`?plan=`): llega marcado al elegir el plan. */
	plan_id?: string;
	/** Del landing (`?pais=`) o del visitante. */
	country?: string;
	/** `LEGAL_DOCUMENTS_VERSION` que vio al aceptar (lib/legal/legal-documents.ts). */
	legal_version?: string;
};

function sanitize(str: string | undefined, maxLen: number): string {
	if (str == null) return "";
	return String(str).trim().slice(0, maxLen);
}

function getClientIp(req: NextRequest): string {
	return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: NextRequest) {
	try {
		const body = (await req.json().catch(() => ({}))) as ApplyBody;

		const businessName = sanitize(body.business_name, 200);
		const responsibleName = sanitize(body.responsible_name, 200);
		const emailRaw = normalizeEmail(sanitize(body.email, 255));
		const ip = getClientIp(req);
		const phone = sanitize(body.phone, 50);
		const sector = sanitize(body.sector, 100);
		const message = sanitize(body.message, 2000);

		if (!businessName || businessName.length < 2) {
			return NextResponse.json({ error: "El nombre del negocio es requerido" }, { status: 400 });
		}
		if (!responsibleName || responsibleName.length < 2) {
			return NextResponse.json({ error: "El nombre del responsable es requerido" }, { status: 400 });
		}
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRaw || !emailRegex.test(emailRaw)) {
			return NextResponse.json({ error: "Email inválido" }, { status: 400 });
		}
		if (await isRateLimited(`onboarding_apply:ip:${ip}`, 12, 60_000)) {
			return NextResponse.json({ error: "Demasiados intentos. Intenta de nuevo en un minuto." }, { status: 429 });
		}
		if (await isRateLimited(`onboarding_apply:email:${emailRaw}`, 5, 10 * 60_000)) {
			return NextResponse.json({ error: "Demasiados intentos con este correo. Intenta más tarde." }, { status: 429 });
		}

		if (body.terms_accepted !== true || body.privacy_accepted !== true) {
			return NextResponse.json({ error: "Debes aceptar los términos y la política de privacidad" }, { status: 400 });
		}

		// La acción es la que pide el paso 1 al enviar (`OnboardingStep1Form`).
		const recaptcha = await verifyRecaptcha(body.recaptcha_token, RECAPTCHA_SECRET, { expectedAction: RECAPTCHA_ACTIONS.onboardingApply });
		if (!recaptcha.ok) {
			// El motivo (código de Google, puntaje bajo u otra acción) solo queda en el log, no se le muestra al cliente.
			logger.warn("recaptcha_failed", createRequestContext("/api/onboarding/apply", "POST", "onboarding-billing"), {
				reason: recaptcha.error,
				score: recaptcha.score,
				action: recaptcha.action,
			});
			return NextResponse.json({ error: "Verificación de seguridad fallida. Intenta de nuevo." }, { status: 400 });
		}

		// El plan del landing solo se guarda si existe y está a la venta.
		const planHint = sanitizePlanHint(body.plan_id);
		const { data: hintedPlan } = planHint
			? await supabaseAdmin.from("plans").select("id,features").eq("id", planHint).eq("is_active", true).eq("is_public", true).maybeSingle()
			: { data: null };
		const hinted = hintedPlan as { id?: string; features?: unknown } | null;
		// «Solo panel CEO» no arma tienda: el correo de verificación no promete armarla gratis.
		const panelOnly = Boolean(hinted?.id) && resolvePlanProductMode(hinted?.features) === "panel_only";
		const country = resolveOnboardingCountry(body.country);
		const legalVersion = readLegalVersion(body.legal_version);

		const verificationToken = randomUUID();
		const ipToStore = ip || null;
		const userAgent = req.headers.get("user-agent")?.slice(0, 500) || null;

		const row: Record<string, unknown> = {
			business_name: businessName,
			responsible_name: responsibleName,
			email: emailRaw,
			phone: phone || null,
			sector: sector || null,
			message: message || null,
			plan_id: hinted?.id ?? null,
			country,
			terms_accepted: true,
			privacy_accepted: true,
			...(legalVersion ? { legal_version: legalVersion } : {}),
			verification_token: verificationToken,
			status: SKIP_EMAIL_VERIFICATION ? "email_verified" : "pending_verification",
			email_verified_at: SKIP_EMAIL_VERIFICATION ? new Date().toISOString() : null,
			ip_address: ipToStore,
			user_agent: userAgent,
		};
		const insertApplication = (values: Record<string, unknown>) =>
			supabaseAdmin.from("onboarding_applications").insert(values).select("id").single();

		let { data: inserted, error: insertError } = await insertApplication(row);
		if (insertError && "legal_version" in row && isMissingColumnError(insertError, "legal_version")) {
			// La migración 20261010_onboarding_legal_version.sql todavía no corrió: el alta sigue
			// sin guardar la versión aceptada (los booleanos de aceptación sí quedan).
			logger.warn("onboarding_legal_version_column_missing", createRequestContext("/api/onboarding/apply", "POST", "onboarding-billing"), {
				legalVersion,
			});
			const withoutVersion = { ...row };
			delete withoutVersion.legal_version;
			({ data: inserted, error: insertError } = await insertApplication(withoutVersion));
		}

		if (insertError) {
			if (insertError.code === "23505") {
				// Ya hay un alta con este correo: en vez de un error sin salida, a ese correo le
				// llega el enlace para seguir donde quedó (o el aviso de que ya tiene cuenta). La
				// respuesta es la misma que la de un alta nueva.
				const resumed = await sendOnboardingResumeLink(supabaseAdmin, emailRaw);
				if (!resumed.found || !resumed.email) {
					// Sin enlace que mandar (solicitud sin token o rechazada): queda en el log para el
					// equipo y la respuesta sigue siendo la de siempre.
					console.error("onboarding apply: alta repetida sin correo para retomar", { target: resumed.found ? resumed.target : "not_found" });
					return NextResponse.json(SENT_RESPONSE);
				}
				const delivered = resumed.email.status === "sent" || resumed.email.status === "duplicate";
				if (!delivered) console.error("onboarding apply: correo para retomar", resumed.email);
				return NextResponse.json(delivered ? SENT_RESPONSE : NOT_SENT_RESPONSE);
			}
			console.error("onboarding apply insert:", insertError);
			return NextResponse.json({ error: "Error al registrar la solicitud" }, { status: 500 });
		}

		// Aviso por Telegram al equipo (si está configurado): la solicitud ya existe aunque
		// el correo de verificación falle después.
		await alertOnboardingTeam({
			kind: "application_created",
			businessName,
			responsibleName,
			email: emailRaw,
			phone,
			sector,
		});

		if (SKIP_EMAIL_VERIFICATION) {
			console.warn(
				"onboarding apply: ONBOARDING_SKIP_EMAIL_VERIFICATION activo, se omite el correo de verificacion"
			);
			return NextResponse.json({
				ok: true,
				skippedVerification: true,
				token: verificationToken,
				message: "Verificacion de correo desactivada. Continua con el formulario.",
			});
		}

		const baseUrl = getAppUrl();
		const verifyUrl = `${baseUrl}/onboarding/verify/${verificationToken}`;

		const applicationId = (inserted as { id?: string } | null)?.id ?? null;
		const verification = await sendEmail({
			kind: "verify_email",
			to: emailRaw,
			applicationId,
			data: { name: responsibleName, businessName, verifyUrl, ...(panelOnly ? { panelOnly: true } : {}) },
		});
		const team = teamInbox();
		if (team && team !== emailRaw) {
			const notice = await sendEmail({
				kind: "team_new_application",
				to: team,
				applicationId,
				data: { businessName, name: responsibleName, email: emailRaw, adminUrl: `${baseUrl}/dashboard` },
			});
			if (notice.status === "failed" || notice.status === "skipped") console.error("onboarding apply: team notice", notice);
		}

		if (verification.status !== "sent") {
			// La solicitud ya existe: se sigue a la pantalla de «revisa tu correo», desde donde se
			// puede reenviar. Antes se devolvía un 502 con el nombre de las variables de entorno.
			console.error("onboarding apply: verification email", verification);
			return NextResponse.json(NOT_SENT_RESPONSE);
		}

		return NextResponse.json(SENT_RESPONSE);
	} catch (err) {
		console.error("onboarding apply error:", err);
		return NextResponse.json({ error: "Error interno. Intenta más tarde." }, { status: 500 });
	}
}
