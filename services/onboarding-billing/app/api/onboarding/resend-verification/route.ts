import { NextRequest, NextResponse } from "next/server";

import { getAppUrl } from "@/lib/tenant/app-url";
import { sendOnboardingEmail } from "@/lib/onboarding/emails";
import { isRateLimited } from "@/lib/onboarding/rate-limit";
import { normalizeEmail } from "@/lib/onboarding/trial-eligibility";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const RESEND_FROM = process.env.RESEND_FROM ?? "noreply@example.com";

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

    const { data: app, error } = await supabaseAdmin
      .from("onboarding_applications")
      .select("id,business_name,responsible_name,email,verification_token,status")
      .ilike("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "Error buscando solicitud" }, { status: 500 });
    }

    if (!app) {
      return NextResponse.json({ ok: true, message: "Si el correo existe, te enviaremos un nuevo enlace." });
    }

    if (app.status !== "pending_verification") {
      return NextResponse.json({ ok: true, alreadyVerified: true, status: app.status });
    }

    const verifyUrl = `${getAppUrl()}/onboarding/verify/${app.verification_token}`;
    const sent = await sendOnboardingEmail({
      type: "verification",
      to: app.email,
      from: RESEND_FROM,
      apiKey: RESEND_API_KEY,
      responsibleName: app.responsible_name,
      businessName: app.business_name,
      verifyUrl,
    });

    if (!sent.ok) {
      return NextResponse.json({ error: "No se pudo reenviar el correo de verificación" }, { status: 502 });
    }

    return NextResponse.json({ ok: true, message: "Correo de verificación reenviado." });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
