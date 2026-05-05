import { NextResponse } from "next/server";

import { getCustomerAccountContext } from "@/lib/tenant/customer-account-context";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";

export async function GET() {
  const ctx = await getCustomerAccountContext();
  if (!ctx) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const [companyRes, paymentsRes, ticketsRes, entitlementsRes, addonsRes] = await Promise.all([
    supabaseAdmin
      .from("companies")
      .select("id,subscription_status,subscription_ends_at")
      .eq("id", ctx.companyId)
      .maybeSingle(),
    supabaseAdmin
      .from("payments_history")
      .select("id,amount_paid,status,payment_date,payment_method,months_paid,payment_reference,reference_file_url")
      .eq("company_id", ctx.companyId)
      .order("payment_date", { ascending: false })
      .limit(50),
    supabaseAdmin
      .from("saas_tickets")
      .select("id,subject,description,category,priority,status,created_at,updated_at,last_message_at")
      .eq("company_id", ctx.companyId)
      .order("last_message_at", { ascending: false })
      .limit(50),
    supabaseAdmin
      .from("company_branch_extra_entitlements")
      .select("id,quantity,months_purchased,amount_paid,unit_price,status,starts_at,expires_at,created_at,payment:payments_history(payment_reference)")
      .eq("company_id", ctx.companyId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabaseAdmin
      .from("company_addons")
      .select("id,status,price_paid,expires_at,created_at,addon:addons(id,slug,name,type)")
      .eq("company_id", ctx.companyId)
      .eq("status", "active")
      .order("created_at", { ascending: false }),
  ]);

  if (paymentsRes.error) {
    return NextResponse.json({ error: paymentsRes.error.message }, { status: 500 });
  }
  if (companyRes.error) {
    return NextResponse.json({ error: companyRes.error.message }, { status: 500 });
  }
  if (ticketsRes.error) {
    return NextResponse.json({ error: ticketsRes.error.message }, { status: 500 });
  }
  if (entitlementsRes.error) {
    return NextResponse.json({ error: entitlementsRes.error.message }, { status: 500 });
  }
  if (addonsRes.error) {
    return NextResponse.json({ error: addonsRes.error.message }, { status: 500 });
  }

  const payments = (paymentsRes.data ?? []).map((row) => ({
    id: String(row.id),
    amount_paid: Number(row.amount_paid ?? 0) || 0,
    status: row.status,
    payment_date: row.payment_date,
    payment_method: row.payment_method,
    months_paid: row.months_paid,
    payment_reference: row.payment_reference,
    reference_file_url: row.reference_file_url,
  }));

  const tickets = (ticketsRes.data ?? []).map((row) => ({
    id: String(row.id),
    subject: String(row.subject ?? ""),
    description: String(row.description ?? ""),
    category: row.category,
    priority: row.priority,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastMessageAt: row.last_message_at,
  }));

  const branchEntitlements = (entitlementsRes.data ?? []).map((row) => {
    const relation = (row as { payment?: { payment_reference?: string | null } | Array<{ payment_reference?: string | null }> | null }).payment;
    const paymentRef = Array.isArray(relation)
      ? relation[0]?.payment_reference ?? null
      : relation?.payment_reference ?? null;

    return {
      id: String(row.id),
      quantity: Number(row.quantity ?? 0) || 0,
      monthsPurchased: Number(row.months_purchased ?? 0) || 0,
      amountPaid: Number(row.amount_paid ?? 0) || 0,
      unitPrice: Number(row.unit_price ?? 0) || 0,
      status: String(row.status ?? "pending"),
      startsAt: row.starts_at,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      paymentReference: paymentRef,
    };
  });

  const activeAddons = (addonsRes.data ?? []).map((row) => {
    const relation = (row as {
      addon?:
        | { id?: string | null; slug?: string | null; name?: string | null; type?: string | null }
        | Array<{ id?: string | null; slug?: string | null; name?: string | null; type?: string | null }>
        | null;
    }).addon;
    const addon = Array.isArray(relation) ? relation[0] : relation;

    return {
      id: String(row.id),
      status: String(row.status ?? "active"),
      price_paid: Number(row.price_paid ?? 0) || 0,
      expires_at: row.expires_at,
      created_at: row.created_at,
      addon_id: addon?.id ?? null,
      slug: addon?.slug ?? null,
      name: addon?.name ?? null,
      type: addon?.type ?? null,
    };
  });

  return NextResponse.json({
    ok: true,
    serverNow: new Date().toISOString(),
    company: companyRes.data
      ? {
          id: String(companyRes.data.id),
          subscription_status: companyRes.data.subscription_status,
          subscription_ends_at: companyRes.data.subscription_ends_at,
        }
      : null,
    payments,
    tickets,
    branchEntitlements,
    activeAddons,
  });
}
