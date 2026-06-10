import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getCustomerAccountContext } from "@/lib/tenant/customer-account-context";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";

export async function PUT(req: NextRequest) {
  const ctx = await getCustomerAccountContext();
  
  if (!ctx) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Enforce CEO-only access as confirmed by the user
  if (ctx.role !== "ceo") {
    return NextResponse.json(
      { error: "No autorizado. Solo el CEO puede editar sucursales." },
      { status: 403 }
    );
  }

  const payload = await req.json().catch(() => ({}));
  const {
    id,
    name,
    address,
    phone,
    schedule,
    instagram_url,
    whatsapp_url,
    map_url,
    origin_lat,
    origin_lng,
    payment_methods,
    pago_movil,
    zelle,
    transferencia_bancaria,
    stripe,
    mercadopago,
    paypal,
    order_intake_paused,
    order_intake_pause_message,
  } = payload;

  if (!id) {
    return NextResponse.json({ error: "El ID de la sucursal es requerido" }, { status: 400 });
  }

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "El nombre de la sucursal es requerido" }, { status: 400 });
  }

  // Verify branch ownership and get current pause state
  const { data: branch, error: fetchError } = await supabaseAdmin
    .from("branches")
    .select("company_id, order_intake_paused")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !branch) {
    return NextResponse.json({ error: "Sucursal no encontrada" }, { status: 404 });
  }

  if (branch.company_id !== ctx.companyId) {
    return NextResponse.json(
      { error: "No tienes permisos para modificar esta sucursal" },
      { status: 403 }
    );
  }

  const parsedPaused = !!order_intake_paused;
  const wasPaused = !!branch.order_intake_paused;

  let finalPausedAt = undefined;
  let finalPausedBy = undefined;

  if (parsedPaused !== wasPaused) {
    if (parsedPaused) {
      finalPausedAt = new Date().toISOString();
      finalPausedBy = ctx.userId;
    } else {
      finalPausedAt = null;
      finalPausedBy = null;
    }
  }

  // Perform update
  const { error: updateError } = await supabaseAdmin
    .from("branches")
    .update({
      name: name.trim(),
      address: address ? address.trim() : null,
      phone: phone ? phone.trim() : null,
      schedule: schedule ? schedule.trim() : null,
      instagram_url: instagram_url ? instagram_url.trim() : null,
      whatsapp_url: whatsapp_url ? whatsapp_url.trim() : null,
      map_url: map_url ? map_url.trim() : null,
      origin_lat: origin_lat != null ? Number(origin_lat) : null,
      origin_lng: origin_lng != null ? Number(origin_lng) : null,
      payment_methods: Array.isArray(payment_methods) ? payment_methods : [],
      pago_movil: pago_movil ? JSON.stringify(pago_movil) : null,
      zelle: zelle ? JSON.stringify(zelle) : null,
      transferencia_bancaria: transferencia_bancaria ? JSON.stringify(transferencia_bancaria) : null,
      stripe: stripe ? JSON.stringify(stripe) : null,
      mercadopago: mercadopago ? JSON.stringify(mercadopago) : null,
      paypal: paypal ? JSON.stringify(paypal) : null,
      order_intake_paused: parsedPaused,
      order_intake_pause_message: parsedPaused ? (order_intake_pause_message ? order_intake_pause_message.trim() : null) : null,
      ...(finalPausedAt !== undefined ? { order_intake_paused_at: finalPausedAt } : {}),
      ...(finalPausedBy !== undefined ? { order_intake_paused_by: finalPausedBy } : {}),
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Purge menu cache for this tenant
  revalidateTag(`menu:${ctx.companyId}`, "max");

  return NextResponse.json({
    ok: true,
    message: "Sucursal actualizada correctamente",
  });
}
