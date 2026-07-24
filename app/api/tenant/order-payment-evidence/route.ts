import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { assertPublicRateLimit } from "@/lib/infra/public-rate-limit";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";

const RECEIPTS_BUCKET = "receipts";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

function cleanSegment(value: unknown): string {
  return String(value ?? "").trim().replace(/[^a-zA-Z0-9_-]/g, "");
}

export async function POST(req: NextRequest) {
  const limited = await assertPublicRateLimit(
    req,
    "tenant_order_payment_evidence",
    10,
    60_000,
  );
  if (limited) return limited;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const orderId = cleanSegment(form?.get("orderId"));
  const evidenceId = cleanSegment(form?.get("evidenceId"));
  const clientRequestId = cleanSegment(form?.get("clientRequestId"));

  if (!(file instanceof File) || !orderId || !evidenceId || !clientRequestId) {
    return NextResponse.json({ error: "Datos de comprobante incompletos." }, { status: 400 });
  }
  const extension = ALLOWED_TYPES.get(file.type.toLowerCase());
  if (!extension || file.size <= 0 || file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "El comprobante debe ser JPG, PNG, WebP o GIF y pesar hasta 5 MB." },
      { status: 400 },
    );
  }

  const db = supabaseAdmin;
  const { data: order, error: orderError } = await db
    .from("orders")
    .select("id, company_id, branch_id, client_request_id, payment_status")
    .eq("id", orderId)
    .eq("client_request_id", clientRequestId)
    .maybeSingle();
  if (orderError || !order?.company_id || !order?.branch_id) {
    return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });
  }

  const { data: evidence, error: evidenceError } = await db
    .from("order_payment_evidence")
    .select("id, status, storage_path")
    .eq("id", evidenceId)
    .eq("order_id", orderId)
    .eq("company_id", order.company_id)
    .maybeSingle();
  if (evidenceError || !evidence) {
    return NextResponse.json({ error: "Comprobante no autorizado." }, { status: 404 });
  }
  if (
    ["uploaded", "verified", "pending_verification"].includes(evidence.status)
    && evidence.storage_path
  ) {
    return NextResponse.json({
      ok: true,
      status: evidence.status,
      storagePath: evidence.storage_path,
      paymentStatus: order.payment_status,
      idempotentReplay: true,
    });
  }

  await db
    .from("order_payment_evidence")
    .update({ status: "uploading", error: null, updated_at: new Date().toISOString() })
    .eq("id", evidenceId)
    .eq("order_id", orderId);

  const now = new Date();
  const path = [
    cleanSegment(order.company_id),
    "orders",
    cleanSegment(order.branch_id),
    "receipts",
    String(now.getUTCFullYear()),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    orderId,
    `${randomUUID()}.${extension}`,
  ].join("/");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await db.storage
    .from(RECEIPTS_BUCKET)
    .upload(path, bytes, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    await db.rpc("attach_public_order_evidence_v1", {
      p_order_id: Number(orderId),
      p_client_request_id: clientRequestId,
      p_evidence_id: evidenceId,
      p_storage_path: null,
      p_error: uploadError.message,
    });
    return NextResponse.json(
      { error: "No se pudo guardar el comprobante. El pedido quedó creado para reintentar." },
      { status: 502 },
    );
  }

  const { data: attached, error: attachError } = await db.rpc(
    "attach_public_order_evidence_v1",
    {
      p_order_id: Number(orderId),
      p_client_request_id: clientRequestId,
      p_evidence_id: evidenceId,
      p_storage_path: path,
      p_error: null,
    },
  );
  if (attachError) {
    const { data: retryAttached, error: retryAttachError } = await db.rpc(
      "attach_public_order_evidence_v1",
      {
        p_order_id: Number(orderId),
        p_client_request_id: clientRequestId,
        p_evidence_id: evidenceId,
        p_storage_path: path,
        p_error: null,
      },
    );
    if (!retryAttachError) {
      return NextResponse.json({
        ok: true,
        ...retryAttached,
        recoveredAfterAmbiguousResponse: true,
      });
    }
    const [{ data: persistedEvidence }, { data: persistedOrder }] = await Promise.all([
      db
        .from("order_payment_evidence")
        .select("status, storage_path")
        .eq("id", evidenceId)
        .eq("order_id", orderId)
        .maybeSingle(),
      db
        .from("orders")
        .select("payment_status")
        .eq("id", orderId)
        .maybeSingle(),
    ]);
    if (persistedEvidence?.storage_path === path) {
      return NextResponse.json({
        ok: true,
        status: persistedEvidence.status,
        storagePath: path,
        paymentStatus: persistedOrder?.payment_status ?? null,
        recoveredAfterAmbiguousResponse: true,
      });
    }
    await db.storage.from(RECEIPTS_BUCKET).remove([path]);
    return NextResponse.json({ error: "No se pudo vincular el comprobante." }, { status: 409 });
  }

  return NextResponse.json({ ok: true, ...attached });
}
