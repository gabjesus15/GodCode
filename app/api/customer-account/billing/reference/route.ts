import { NextRequest, NextResponse } from "next/server";

import { getCustomerAccountContext } from "@/lib/tenant/customer-account-context";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";

export async function POST(req: NextRequest) {
  const ctx = await getCustomerAccountContext();
  if (!ctx) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    paymentId?: string;
    referenceFileUrl?: string;
  };

  const paymentId = String(body.paymentId ?? "").trim();
  const referenceFileUrl = String(body.referenceFileUrl ?? "").trim();

  if (!paymentId || !referenceFileUrl) {
    return NextResponse.json({ error: "Falta paymentId o referenceFileUrl" }, { status: 400 });
  }

  const { data: payment, error: paymentError } = await supabaseAdmin
    .from("payments_history")
    .select("id,company_id,status,payment_reference")
    .eq("id", paymentId)
    .maybeSingle();

  if (paymentError || !payment || payment.company_id !== ctx.companyId) {
    return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
  }

  if (payment.status && !["pending_validation", "pending", "rejected"].includes(payment.status)) {
    return NextResponse.json(
      { error: "Este pago no acepta carga de comprobante en su estado actual" },
      { status: 400 }
    );
  }

  const { error: updateError } = await supabaseAdmin
    .from("payments_history")
    .update({ reference_file_url: referenceFileUrl })
    .eq("id", payment.id);

  if (updateError) {
    return NextResponse.json({ error: "No se pudo guardar el comprobante" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
