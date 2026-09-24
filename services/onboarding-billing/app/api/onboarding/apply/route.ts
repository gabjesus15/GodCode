import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { getAppUrl } from "@/lib/tenant/app-url";
import { sendEmail, teamInbox } from "@/lib/email/send";
import { verifyRecaptcha } from "@/lib/onboarding/recaptcha";
import { isRateLimited } from "@/lib/onboarding/rate-limit";
import { normalizeEmail } from "@/lib/onboarding/trial-eligibility";

/** @service-role public
 *
 * Formulario de alta: reCAPTCHA y rate limit por IP y correo.
 */

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

		const recaptcha = await verifyRecaptcha(body.recaptcha_token, RECAPTCHA_SECRET);
		if (!recaptcha.ok) {
			return NextResponse.json({ error: "Verificación de seguridad fallida. Intenta de nuevo." }, { status: 400 });
		}

		const verificationToken = randomUUID();
		const ipToStore = ip || null;
		const userAgent = req.headers.get("user-agent")?.slice(0, 500) || null;

		const { data: inserted, error: insertError } = await supabaseAdmin
			.from("onboarding_applications")
			.insert({
				business_name: businessName,
				responsible_name: responsibleName,
				email: emailRaw,
				phone: phone || null,
				sector: sector || null,
				message: message || null,
				terms_accepted: true,
				privacy_accepted: true,
				verification_token: verificationToken,
				status: SKIP_EMAIL_VERIFICATION ? "email_verified" : "pending_verification",
				email_verified_at: SKIP_EMAIL_VERIFICATION ? new Date().toISOString() : null,
				ip_address: ipToStore,
				user_agent: userAgent,
			})
			.select("id")
			.single();

		if (insertError) {
			if (insertError.code === "23505") {
				return NextResponse.json(
					{ error: "Ya existe una solicitud con este email. Revisa tu bandeja o espera unos minutos." },
					{ status: 409 }
				);
			}
			console.error("onboarding apply insert:", insertError);
			return NextResponse.json({ error: "Error al registrar la solicitud" }, { status: 500 });
		}

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
			data: { name: responsibleName, businessName, verifyUrl },
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
			return NextResponse.json({
				ok: true,
				emailSent: false,
				message: "Guardamos tu solicitud, pero el correo no salió. Pulsa «Reenviar correo» en unos minutos.",
			});
		}

		return NextResponse.json({
			ok: true,
			emailSent: true,
			message: "Solicitud enviada. Revisa tu correo para verificar tu email.",
		});
	} catch (err) {
		console.error("onboarding apply error:", err);
		return NextResponse.json({ error: "Error interno. Intenta más tarde." }, { status: 500 });
	}
}
