import { NextRequest, NextResponse } from "next/server";

import { isRateLimited } from "@/lib/onboarding/rate-limit";
import type { ResendErrorCode } from "@/lib/onboarding/onboarding-ui-copy";
import { normalizeEmail } from "@/lib/onboarding/trial-eligibility";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { sendOnboardingResumeLink } from "@/lib/onboarding/resume-application";

/** @service-role public
 *
 * «Reenviar correo» y «retomar mi registro»: manda el enlace del paso donde quedó el alta
 * (`sendOnboardingResumeLink`: el de verificación sale sin la promesa de la tienda si el
 * plan sugerido es «solo panel CEO»; una cuenta que ya existe recibe un aviso sin token).
 * Rate limit por IP y correo; no revela si la cuenta existe ni en qué paso va.
 *
 * Los errores llevan un `code` estable que el paso 1 traduce (`lib/onboarding/onboarding-ui-copy.ts`);
 * el texto en español queda para el log y para clientes viejos.
 */

type Body = {
  email?: string;
};

function sanitize(str: string | undefined, maxLen: number): string {
  if (str == null) return "";
  return String(str).trim().slice(0, maxLen);
}

function getClientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

function fail(code: ResendErrorCode, error: string, status: number) {
  return NextResponse.json({ code, error }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const email = normalizeEmail(sanitize(body.email, 255));
    if (!email) {
      return fail("email_invalid", "Email requerido", 400);
    }

    const ip = getClientIp(req);
    if (await isRateLimited(`resend_verification:ip:${ip}`, 6, 60_000)) {
      return fail("rate_limited", "Demasiados intentos. Espera un minuto.", 429);
    }
    if (await isRateLimited(`resend_verification:email:${email}`, 3, 10 * 60_000)) {
      return fail("rate_limited", "Ya se enviaron varios correos. Intenta de nuevo en unos minutos.", 429);
    }

    // Sirve en cualquier paso: confirma el correo, sigue con el plan o el pago, o entra.
    const resumed = await sendOnboardingResumeLink(supabaseAdmin, email);
    if (resumed.found && resumed.email && resumed.email.status !== "sent" && resumed.email.status !== "duplicate") {
      console.error("resend onboarding link", resumed.email);
      return fail("email_not_sent", "No se pudo reenviar el correo. Intenta de nuevo en unos minutos.", 502);
    }

    return NextResponse.json({ ok: true, message: "Si hay un alta con ese correo, te enviamos un enlace para seguir." });
  } catch (err) {
    console.error("resend onboarding link error:", err);
    return fail("server_error", "Error interno", 500);
  }
}
