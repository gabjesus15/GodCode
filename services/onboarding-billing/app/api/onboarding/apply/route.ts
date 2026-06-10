import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { getAppUrl } from "@/lib/tenant/app-url";
import { sendOnboardingEmail } from "@/lib/onboarding/emails";
import { verifyRecaptcha } from "@/lib/onboarding/recaptcha";
import { isRateLimited } from "@/lib/onboarding/rate-limit";
import { normalizeEmail } from "@/lib/onboarding/trial-eligibility";

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const RESEND_FROM = process.env.RESEND_FROM ?? "noreply@example.com";
const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY ?? "";
const TEAM_EMAIL = process.env.ONBOARDING_TEAM_EMAIL ?? process.env.RESEND_FROM ?? "";

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

		const { error: insertError } = await supabaseAdmin
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
				status: "pending_verification",
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

		const baseUrl = getAppUrl();
		const verifyUrl = `${baseUrl}/onboarding/verify/${verificationToken}`;

		const verificationEmail = await sendOnboardingEmail({
			type: "verification",
			to: emailRaw,
			from: RESEND_FROM,
			apiKey: RESEND_API_KEY,
			responsibleName,
			businessName,
			verifyUrl,
		});
		if (!verificationEmail.ok) {
			console.error("onboarding apply: verification email failed:", verificationEmail.error);
			return NextResponse.json(
				{
					error:
						"La solicitud se guardó pero no pudimos enviar el correo de verificación. Revisa RESEND_API_KEY y RESEND_FROM en el servicio de onboarding.",
					detail: verificationEmail.error,
				},
				{ status: 502 }
			);
		}

		if (TEAM_EMAIL && TEAM_EMAIL !== emailRaw) {
			const dashboardUrl = `${baseUrl}/onboarding/solicitudes`;
			const teamEmail = await sendOnboardingEmail({
				type: "team_notification",
				to: TEAM_EMAIL,
				from: RESEND_FROM,
				apiKey: RESEND_API_KEY,
				businessName,
				responsibleName,
				email: emailRaw,
				sector,
				dashboardUrl,
			});
			if (!teamEmail.ok) {
				console.error("onboarding apply: team_notification email failed:", teamEmail.error);
			}
		}

		return NextResponse.json({
			ok: true,
			message: "Solicitud enviada. Revisa tu correo para verificar tu email.",
		});
	} catch (err) {
		console.error("onboarding apply error:", err);
		return NextResponse.json({ error: "Error interno. Intenta más tarde." }, { status: 500 });
	}
}
