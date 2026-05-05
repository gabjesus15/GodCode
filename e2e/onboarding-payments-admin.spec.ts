import fs from "node:fs";
import path from "node:path";

import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type RuntimeConfig = {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  adminEmail: string;
  adminPassword: string;
};

function onboardingBillingUrl(path: string): string {
  return `${onboardingBillingBaseUrl}${path}`;
}

function parseDotEnvFile(): Record<string, string> {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return {};

  const map: Record<string, string> = {};
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    map[key] = value;
  }
  return map;
}

function getRuntimeConfig(): RuntimeConfig | null {
  const envFromFile = parseDotEnvFile();

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? envFromFile.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const supabaseServiceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? envFromFile.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  const adminEmail = (process.env.PLAYWRIGHT_ADMIN_EMAIL ?? "").trim();
  const adminPassword = (process.env.PLAYWRIGHT_ADMIN_PASSWORD ?? "").trim();

  if (!supabaseUrl || !supabaseServiceRoleKey || !adminEmail || !adminPassword) {
    return null;
  }

  return {
    supabaseUrl,
    supabaseServiceRoleKey,
    adminEmail,
    adminPassword,
  };
}

const envFromFile = parseDotEnvFile();
const onboardingBillingBaseUrl = (process.env.ONBOARDING_BILLING_SERVICE_URL ?? envFromFile.ONBOARDING_BILLING_SERVICE_URL ?? "http://127.0.0.1:3001").replace(/\/$/, "");
const onboardingBillingApiKey = (process.env.SERVICE_API_KEY ?? envFromFile.SERVICE_API_KEY ?? "").trim();

function createServiceClient(cfg: RuntimeConfig): SupabaseClient {
  return createClient(cfg.supabaseUrl, cfg.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function cleanupByEmail(supabase: SupabaseClient, email: string): Promise<void> {
  const { data: apps } = await supabase
    .from("onboarding_applications")
    .select("id,company_id")
    .ilike("email", email);

  const appIds = (apps ?? []).map((a) => a.id).filter(Boolean);
  const companyIds = [...new Set((apps ?? []).map((a) => a.company_id).filter(Boolean) as string[])];

  if (appIds.length > 0) {
    await supabase.from("onboarding_application_addons").delete().in("application_id", appIds);
  }

  await supabase.from("onboarding_applications").delete().ilike("email", email);

  if (companyIds.length === 0) return;

  await supabase.from("subscription_notifications").delete().in("company_id", companyIds);
  await supabase.from("payments_history").delete().in("company_id", companyIds);
  await supabase.from("business_info").delete().in("company_id", companyIds);
  await supabase.from("company_addons").delete().in("company_id", companyIds);
  await supabase.from("company_branch_extra_entitlements").delete().in("company_id", companyIds);
  await supabase.from("saas_tickets").delete().in("company_id", companyIds);
  await supabase.from("branches").delete().in("company_id", companyIds);
  await supabase.from("users").delete().in("company_id", companyIds);
  await supabase.from("companies").delete().in("id", companyIds);
}

test.describe.serial("onboarding + pagos + saas admin antifraude", () => {
  const cfg = getRuntimeConfig();
  const createdEmails: string[] = [];
  let supabase: SupabaseClient | null = null;

  const getSupabase = (): SupabaseClient => {
    if (!cfg) {
      throw new Error("Missing runtime config for extended e2e");
    }
    if (!supabase) {
      supabase = createServiceClient(cfg);
    }
    return supabase;
  };

  test.afterAll(async () => {
    if (!cfg) return;
    const sb = getSupabase();
    for (const email of createdEmails) {
      await cleanupByEmail(sb, email);
    }
  });

  test("endpoints antifraude rechazan entradas invalidas", async ({ request }) => {
    test.skip(!cfg, "Sin configuracion completa para pruebas extensas");

    const verifyInvalid = await request.get(onboardingBillingUrl("/api/onboarding/verify?token=e2e-token-invalido"));
    expect([404, 503]).toContain(verifyInvalid.status());

    const completeInvalid = await request.post(onboardingBillingUrl("/api/onboarding/complete"), {
      data: {
        token: "e2e-token-invalido",
        plan_id: "ee1f46c5-5bfb-4863-b3df-efa7ec9debd4",
        country: "Chile",
        currency: "USD",
        subscription_payment_method: "transferencia",
      },
    });
    expect([404, 503]).toContain(completeInvalid.status());

    const checkoutMissingToken = await request.post(onboardingBillingUrl("/api/onboarding/checkout"), {
      data: {},
    });
    expect([400, 503]).toContain(checkoutMissingToken.status());

    const uploadMissingFields = await request.post(onboardingBillingUrl("/api/onboarding/upload-payment-reference"), {
      data: {
        token: "",
        payment_reference: "",
        reference_file_url: "",
      },
    });
    expect([400, 503]).toContain(uploadMissingFields.status());
  });

  test("flujo completo: onboarding + checkout manual + visibilidad en admin + bloqueo de metodo desactivado", async ({ page, request }) => {
    test.skip(!cfg, "Sin configuracion completa para pruebas extensas");
    const sb = getSupabase();

    const nonce = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const email = `e2e.onboarding.${nonce}@example.com`;
    const businessName = `E2E Negocio ${nonce}`;
    createdEmails.push(email);

    await cleanupByEmail(sb, email);

    const applyRes = await request.post(onboardingBillingUrl("/api/onboarding/apply"), {
      data: {
        business_name: businessName,
        responsible_name: "E2E Responsable",
        email,
        terms_accepted: true,
        privacy_accepted: true,
      },
    });
    expect(applyRes.status()).toBe(200);

    const applyJson = await applyRes.json();
    expect(applyJson.ok).toBeTruthy();

    const { data: appAfterApply, error: appAfterApplyError } = await sb
      .from("onboarding_applications")
      .select("id,company_id,verification_token,status")
      .ilike("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    expect(appAfterApplyError).toBeNull();
    expect(appAfterApply).toBeTruthy();
    expect(appAfterApply?.status).toBe("pending_verification");
    expect(appAfterApply?.verification_token).toBeTruthy();

    const token = String(appAfterApply?.verification_token ?? "");

    const verifyRes = await request.get(onboardingBillingUrl(`/api/onboarding/verify?token=${encodeURIComponent(token)}`));
    expect(verifyRes.status()).toBe(200);
    const verifyJson = await verifyRes.json();
    expect(verifyJson.ok).toBeTruthy();

    const verifyAgainRes = await request.get(onboardingBillingUrl(`/api/onboarding/verify?token=${encodeURIComponent(token)}`));
    expect(verifyAgainRes.status()).toBe(200);

    const planMethodsRes = await request.get(onboardingBillingUrl("/api/onboarding/plan-payment-methods?country=Chile"));
    expect(planMethodsRes.status()).toBe(200);
    const planMethodsJson = await planMethodsRes.json() as { data?: Array<{ slug: string }> };
    const activeMethodSlugs = (planMethodsJson.data ?? []).map((m) => (m.slug ?? "").trim().toLowerCase());
    expect(activeMethodSlugs).toContain("transferencia");

    const completeRes = await request.post(onboardingBillingUrl("/api/onboarding/complete"), {
      data: {
        token,
        legal_name: `E2E Legal ${nonce}`,
        fiscal_address: "Calle Test 123",
        billing_address: "Calle Test 123",
        billing_rut: "12345678-9",
        description: "Prueba E2E onboarding extendido",
        plan_id: "ee1f46c5-5bfb-4863-b3df-efa7ec9debd4",
        country: "Chile",
        currency: "USD",
        subscription_payment_method: "transferencia",
        payment_methods: [],
      },
    });

    expect(completeRes.status()).toBe(200);

    const { data: appAfterComplete } = await sb
      .from("onboarding_applications")
      .select("id,company_id,status")
      .ilike("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    expect(appAfterComplete?.status).toBe("form_completed");

    const checkoutRes = await request.post(onboardingBillingUrl("/api/onboarding/checkout"), {
      data: { token, months: 1 },
    });

    expect(checkoutRes.status()).toBe(200);
    const checkoutJson = await checkoutRes.json();
    expect(checkoutJson.ok).toBeTruthy();
    expect(checkoutJson.manual).toBeTruthy();
    expect(typeof checkoutJson.payment_reference).toBe("string");
    const checkoutPaymentReference = String(checkoutJson.payment_reference ?? "");

    const { data: appAfterCheckout } = await sb
      .from("onboarding_applications")
      .select("id,company_id,status,subscription_payment_method,payment_reference,payment_status,payment_reference_url,payment_months,payment_amount")
      .ilike("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    expect(appAfterCheckout?.status).toBe("payment_pending");
    expect(appAfterCheckout?.company_id).toBeNull();
    expect(appAfterCheckout?.payment_status).toBe("pending_validation");
    expect(appAfterCheckout?.payment_reference).toBeTruthy();
    expect((appAfterCheckout?.subscription_payment_method ?? "").toLowerCase()).toBe("transferencia");

    const paymentReference = String(appAfterCheckout?.payment_reference ?? checkoutPaymentReference ?? "");

    const uploadRes = await request.post(onboardingBillingUrl("/api/onboarding/upload-payment-reference"), {
      data: {
        token,
        payment_reference: paymentReference,
        reference_file_url: "https://example.com/comprobante-e2e.png",
      },
    });

    expect(uploadRes.status()).toBe(200);

    await page.goto("/login");
    await page.getByRole("textbox", { name: /email/i }).fill((cfg as RuntimeConfig).adminEmail);
    await page.getByRole("textbox", { name: /password/i }).fill((cfg as RuntimeConfig).adminPassword);
    await page.getByRole("button", { name: /entrar/i }).click();
    await page.waitForLoadState("networkidle", { timeout: 20_000 });

    const validateRes = await request.post(onboardingBillingUrl("/api/super-admin/payments/validate"), {
      headers: onboardingBillingApiKey ? { "x-internal-api-key": onboardingBillingApiKey } : undefined,
      data: { payment_reference: paymentReference },
    });
    expect(validateRes.status()).toBe(200);

    const { data: appAfterValidate } = await sb
      .from("onboarding_applications")
      .select("id,company_id,status,payment_status")
      .ilike("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    expect(appAfterValidate?.status).toBe("active");
    expect(appAfterValidate?.company_id).toBeTruthy();

    const companyId = String(appAfterValidate?.company_id ?? "");

    const { data: company } = await sb
      .from("companies")
      .select("id,name,subscription_status")
      .eq("id", companyId)
      .maybeSingle();

    expect(company?.id).toBe(companyId);
    expect(company?.subscription_status).toBe("active");

    let payment: { id?: string; status?: string | null; payment_method_slug?: string | null } | null = null;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const { data } = await sb
        .from("payments_history")
        .select("id,status,payment_method_slug")
        .eq("payment_reference", paymentReference)
        .maybeSingle();
      payment = data;
      if (payment?.id) break;
      await page.waitForTimeout(300);
    }

    expect(payment?.id).toBeTruthy();
  expect(payment?.status).toBe("paid");
    expect((payment?.payment_method_slug ?? "").toLowerCase()).toBe("transferencia");

    await page.goto("/companies");
    await expect(page.getByRole("heading", { name: /empresas/i })).toBeVisible({ timeout: 20_000 });
    await page.getByPlaceholder("Buscar empresa...").fill(businessName);
    await expect(page.getByText(businessName)).toBeVisible({ timeout: 20_000 });

    await sb
      .from("onboarding_applications")
      .update({ subscription_payment_method: "stripe", updated_at: new Date().toISOString() })
      .eq("id", appAfterCheckout?.id ?? "");

    const blockedCheckoutRes = await request.post(onboardingBillingUrl("/api/onboarding/checkout"), {
      data: { token, months: 1 },
    });

    expect(blockedCheckoutRes.ok()).toBeFalsy();
    expect(blockedCheckoutRes.status()).toBeGreaterThanOrEqual(400);
    const blockedCheckoutJson = await blockedCheckoutRes.json();
    expect(String(blockedCheckoutJson.error ?? "").length).toBeGreaterThan(0);
  });
});
