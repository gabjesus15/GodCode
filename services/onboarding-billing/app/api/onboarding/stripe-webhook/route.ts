import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { getStripeClient } from "../../../../lib/onboarding/stripe";
import { activateCompanyAddonsFromApplication, activateCompanySubscription } from "../../../../lib/onboarding/billing-activation";
import { provisionCompanyFromApplication, recordPayment, type OnboardingApplication } from "../../../../lib/onboarding/checkout-service";

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";

export async function POST(req: NextRequest) {
  try {
    if (!STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Webhook no configurado" }, { status: 503 });
    }

    const stripe = getStripeClient();
    if (!stripe) {
      return NextResponse.json({ error: "Stripe no configurado" }, { status: 503 });
    }

    const signature = req.headers.get("stripe-signature") || "";
    const rawBody = await req.text();
    let event;

    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Firma inválida" },
        { status: 400 }
      );
    }

    if (event.type === "checkout.session.completed") {
      const obj = event.data.object as {
        id?: string;
        payment_status?: string;
        metadata?: Record<string, string | undefined>;
        amount_total?: number;
      };

      const paymentReference = obj.id?.trim() || null;
      const onboardingApplicationId = obj.metadata?.onboarding_application_id?.trim() || null;
      const months = Math.min(12, Math.max(1, Number(obj.metadata?.months ?? 1) || 1));

      if (paymentReference) {
        const { data: existingPayment } = await supabaseAdmin
          .from("payments_history")
          .select("id,company_id,plan_id")
          .eq("payment_reference", paymentReference)
          .maybeSingle();

        if (existingPayment?.id && existingPayment.company_id) {
          await supabaseAdmin.from("payments_history").update({ status: "paid", payment_date: new Date().toISOString() }).eq("id", existingPayment.id);
          await supabaseAdmin
            .from("companies")
            .update({ subscription_status: "active", updated_at: new Date().toISOString() })
            .eq("id", existingPayment.company_id);
        } else if (onboardingApplicationId) {
          const { data: app } = await supabaseAdmin
            .from("onboarding_applications")
            .select("id,business_name,responsible_name,email,plan_id,company_id,billing_rut,fiscal_address,logo_url,social_instagram,custom_domain,custom_plan_name,custom_plan_price,subscription_payment_method,payment_reference,payment_status,payment_months,payment_amount")
            .eq("id", onboardingApplicationId)
            .maybeSingle();

          if (app) {
            const appRecord = app as OnboardingApplication;
            const companyResult = await provisionCompanyFromApplication(supabaseAdmin, appRecord, false);
            if (companyResult.ok) {
              const paymentInsert = await recordPayment(supabaseAdmin, {
                companyId: companyResult.company.id,
                planId: appRecord.plan_id,
                amountPaid: Number(obj.amount_total ?? appRecord.payment_amount ?? 0) / 100,
                paymentMethod: String(appRecord.subscription_payment_method ?? "stripe"),
                paymentMethodSlug: "stripe",
                paymentReference,
                status: "paid",
                monthsPaid: months,
              });

              if (paymentInsert.id) {
                const now = new Date();
                await supabaseAdmin
                  .from("onboarding_applications")
                  .update({ company_id: companyResult.company.id, status: "active", payment_status: "paid", updated_at: now.toISOString() })
                  .eq("id", appRecord.id);
                await activateCompanySubscription({ supabaseAdmin, companyId: companyResult.company.id, monthsPaid: months, now });
                await activateCompanyAddonsFromApplication({
                  supabaseAdmin,
                  applicationId: appRecord.id,
                  companyId: companyResult.company.id,
                  monthsPaid: months,
                  now,
                });
              }
            }
          }
        }
      }

      if (onboardingApplicationId) {
        await supabaseAdmin
          .from("onboarding_applications")
          .update({ status: "active", payment_status: "paid", updated_at: new Date().toISOString() })
          .eq("id", onboardingApplicationId);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook error" },
      { status: 500 }
    );
  }
}
