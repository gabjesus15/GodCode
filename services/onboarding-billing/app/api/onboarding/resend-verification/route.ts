import { NextRequest, NextResponse } from "next/server";

import { isRateLimited } from "@/lib/onboarding/rate-limit";
import { normalizeEmail } from "@/lib/onboarding/trial-eligibility";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { sendOnboardingResumeLink } from "@/lib/onboarding/resume-application";

/** @service-role public
 *
 * «Reenviar correo» y «retomar mi registro»: manda el enlace del paso donde quedó el alta.
 * Rate limit por IP y correo; no revela si la cuenta existe ni en qué paso va.
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

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const email = normalizeEmail(sanitize(body.email, 255));
    if (!email) {
      return NextResponse.json({ error: "Email requerido" }, { status: 400 });
    }

    const ip = getClientIp(req);
    if (await isRateLimited(`resend_verification:ip:${ip}`, 6, 60_000)) {
      return NextResponse.json({ error: "Demasiados intentos. Espera un minuto." }, { status: 429 });
    }
    if (await isRateLimited(`resend_verification:email:${email}`, 3, 10 * 60_000)) {
      return NextResponse.json({ error: "Ya se enviaron varios correos. Intenta de nuevo en unos minutos." }, { status: 429 });
    }

    // Sirve en cualquier paso: confirma el correo, sigue con el plan o el pago, o entra.
    const resumed = await sendOnboardingResumeLink(supabaseAdmin, email);
    if (resumed.found && resumed.email && resumed.email.status !== "sent" && resumed.email.status !== "duplicate") {
      console.error("resend onboarding link", resumed.email);
      return NextResponse.json({ error: "No se pudo reenviar el correo. Intenta de nuevo en unos minutos." }, { status: 502 });
    }

    return NextResponse.json({ ok: true, message: "Si hay un alta con ese correo, te enviamos un enlace para seguir." });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
