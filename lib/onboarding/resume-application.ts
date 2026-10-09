import type { SupabaseClient } from "@supabase/supabase-js";

import { createPasswordSetupLink } from "@/lib/auth/password-setup-link";
import { sendEmail, type SendEmailResult } from "@/lib/email/send";
import { getAppUrl } from "@/lib/tenant/app-url";
import { isPanelOnlyPlan } from "./store-draft-service";
import { normalizeEmail } from "./trial-eligibility";

type ResumeRow = {
	id: string;
	status: string | null;
	payment_status: string | null;
	payment_reference_url: string | null;
	company_id: string | null;
	plan_id: string | null;
	business_name: string | null;
	responsible_name: string | null;
	email: string;
	verification_token: string | null;
};

/** Qué correo le corresponde a una solicitud según dónde quedó. */
export type ResumeTarget =
	| { kind: "verify" }
	| { kind: "continue"; step: "store" | "plan" | "payment" | "review"; path: string }
	| { kind: "login" }
	| { kind: "none" };

/** `panelOnly`: eligió «solo panel CEO», que no arma tienda y sigue con el plan y el pago. */
export function resolveResumeTarget(
	app: Pick<ResumeRow, "status" | "payment_status" | "payment_reference_url" | "company_id">,
	token: string,
	options: { panelOnly?: boolean } = {},
): ResumeTarget {
	const status = String(app.status ?? "").toLowerCase();
	const payment = String(app.payment_status ?? "").toLowerCase();
	const encoded = encodeURIComponent(token);

	const inReview = payment === "pending_validation" && Boolean(String(app.payment_reference_url ?? "").trim());

	if (status === "pending_verification") return { kind: "verify" };
	if (status === "active" || (payment === "paid" && app.company_id)) return { kind: "login" };
	// Ya creó su tienda en vista previa: tiene cuenta y contraseña, sigue desde su panel.
	if (app.company_id) {
		return inReview ? { kind: "continue", step: "review", path: `/onboarding/pago?token=${encoded}` } : { kind: "login" };
	}
	if (status === "email_verified") {
		return options.panelOnly
			? { kind: "continue", step: "plan", path: `/onboarding/complete?token=${encoded}` }
			: { kind: "continue", step: "store", path: `/onboarding/tienda?token=${encoded}` };
	}
	if (status === "form_completed" || status === "payment_pending") {
		if (inReview) return { kind: "continue", step: "review", path: `/onboarding/pago?token=${encoded}` };
		return { kind: "continue", step: "payment", path: `/onboarding/pago?token=${encoded}` };
	}
	return { kind: "none" };
}

export type ResumeResult = { found: false } | { found: true; target: ResumeTarget["kind"]; email: SendEmailResult | null };

/**
 * «Retomar mi registro»: manda a ese correo el enlace que le sirve según dónde quedó el
 * alta (confirmar el correo, elegir plan, pagar, ver el comprobante o entrar a su cuenta).
 * Antes, quien perdía el enlace del correo no tenía forma de volver: registrarse otra vez
 * daba «ya existe una solicitud» y reenviar solo funcionaba si aún no había verificado.
 *
 * No dice a quien llama dónde quedó el alta: eso solo lo ve el dueño del correo.
 */
export async function sendOnboardingResumeLink(supabaseAdmin: SupabaseClient, rawEmail: string): Promise<ResumeResult> {
	const email = normalizeEmail(rawEmail);
	if (!email) return { found: false };

	const { data } = await supabaseAdmin
		.from("onboarding_applications")
		.select("id,status,payment_status,payment_reference_url,company_id,plan_id,business_name,responsible_name,email,verification_token")
		.eq("email", email)
		.order("created_at", { ascending: false })
		.limit(1)
		.maybeSingle();
	const app = data as ResumeRow | null;
	if (!app?.verification_token) return { found: false };

	const appUrl = getAppUrl();
	const name = app.responsible_name ?? "";
	const businessName = app.business_name ?? "";
	const target = resolveResumeTarget(app, app.verification_token, {
		panelOnly: app.status === "email_verified" && !app.company_id && (await isPanelOnlyPlan(supabaseAdmin, app.plan_id)),
	});

	switch (target.kind) {
		case "verify": {
			const sent = await sendEmail({
				kind: "verify_email",
				to: app.email,
				applicationId: app.id,
				data: { name, businessName, verifyUrl: `${appUrl}/onboarding/verify/${app.verification_token}` },
			});
			return { found: true, target: target.kind, email: sent };
		}
		case "continue": {
			const sent = await sendEmail({
				kind: "onboarding_continue",
				to: app.email,
				applicationId: app.id,
				data: { name, businessName, continueUrl: `${appUrl}${target.path}`, step: target.step },
			});
			return { found: true, target: target.kind, email: sent };
		}
		case "login": {
			// Ya tiene cuenta: el enlace para crear (o cambiar) la contraseña le sirve para entrar.
			const resetUrl = await createPasswordSetupLink(supabaseAdmin, app.email);
			const sent = await sendEmail({
				kind: "password_reset",
				to: app.email,
				applicationId: app.id,
				companyId: app.company_id ?? undefined,
				data: { name, resetUrl: resetUrl ?? `${appUrl}/login/recuperar` },
			});
			return { found: true, target: target.kind, email: sent };
		}
		default:
			return { found: true, target: target.kind, email: null };
	}
}
