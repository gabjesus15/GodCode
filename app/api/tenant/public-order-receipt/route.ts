import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";

import { jsonWithPublicCors, publicApiPreflightResponse } from "@/lib/infra/api-cors";
import { logger } from "@/lib/infra/logger";
import { assertPublicRateLimit } from "@/lib/infra/public-rate-limit";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { orderPatchEligibility } from "@/lib/orders/orphan-cancel";
import { MAX_FILE_SIZE_BYTES, sniffImageType } from "@/lib/storage/image-file";
import {
	PRIVATE_RECEIPTS_BUCKET,
	isOrderReceiptPath,
	orderReceiptPath,
} from "@/lib/storage/private-receipts";

/** @service-role public
 *
 * Comprobante de pago del checkout del menú (transferencia, Pago Móvil, Zelle…),
 * adjuntado al pedido recién creado. Igual que en `public-order-delivery`, la
 * credencial es el client_request_id que generó el navegador, y solo vale mientras el
 * pedido sigue pendiente y dentro de la ventana de cierre. El archivo va al bucket
 * privado `receipts`, bajo la carpeta de la empresa, y su ruta queda en
 * `orders.payment_ref`: es donde la caja (Panel) busca el comprobante y lo abre con su
 * propia sesión. Antes el checkout subía el archivo a un bucket público y descartaba el
 * enlace, así que el local nunca lo veía.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EXT_BY_TYPE = new Map([
	["image/jpeg", "jpg"],
	["image/png", "png"],
	["image/webp", "webp"],
]);
/** Margen para los separadores y cabeceras del multipart sobre el tamaño máximo del archivo. */
const MULTIPART_OVERHEAD_BYTES = 64 * 1024;
/** Lo que ve el carrito cuando falla algo interno; el detalle queda en el log. */
const GENERIC_FAILURE = "No se pudo guardar el comprobante.";
const ALREADY_ATTACHED = "El pedido ya tiene un comprobante.";

export async function OPTIONS(req: NextRequest) {
	return publicApiPreflightResponse(req);
}

export async function POST(req: NextRequest) {
	const limited = await assertPublicRateLimit(req, "tenant_public_order_receipt", 10, 60_000);
	if (limited) return limited;

	// `formData()` carga el cuerpo entero en memoria: lo que declara pesar de más se
	// descarta antes de leerlo (fetch con FormData siempre manda Content-Length).
	const declaredLength = Number(req.headers.get("content-length") ?? "");
	if (!Number.isFinite(declaredLength) || declaredLength <= 0) {
		return jsonWithPublicCors(req, { error: "Falta el tamaño de la subida." }, { status: 411 });
	}
	if (declaredLength > MAX_FILE_SIZE_BYTES + MULTIPART_OVERHEAD_BYTES) {
		return jsonWithPublicCors(req, { error: "La imagen es muy pesada (max. 5 MB)." }, { status: 413 });
	}

	const form = await req.formData().catch(() => null);
	const file = form?.get("file");
	const orderId = String(form?.get("orderId") ?? "").trim();
	const clientRequestId = String(form?.get("clientRequestId") ?? "").trim();
	if (!/^\d+$/.test(orderId) || !UUID_RE.test(clientRequestId)) {
		return jsonWithPublicCors(req, { error: "Faltan los datos del pedido." }, { status: 400 });
	}
	if (!(file instanceof File) || file.size <= 0) {
		return jsonWithPublicCors(req, { error: "Archivo no valido." }, { status: 400 });
	}
	if (file.size > MAX_FILE_SIZE_BYTES) {
		return jsonWithPublicCors(req, { error: "La imagen es muy pesada (max. 5 MB)." }, { status: 413 });
	}

	const { data: order, error: orderError } = await supabaseAdmin
		.from("orders")
		.select("id, company_id, branch_id, status, created_at, payment_ref")
		.eq("id", orderId)
		.eq("client_request_id", clientRequestId)
		.maybeSingle();
	if (orderError || !order) {
		return jsonWithPublicCors(req, { error: "Pedido no encontrado." }, { status: 404 });
	}
	const eligibility = orderPatchEligibility(
		{ status: String(order.status ?? ""), createdAt: String(order.created_at ?? "") },
		Date.now(),
	);
	if (eligibility !== "ok") {
		return jsonWithPublicCors(req, { error: "El pedido ya no admite comprobante." }, { status: 400 });
	}

	const companyId = String(order.company_id ?? "");
	const existingRef = String(order.payment_ref ?? "").trim();
	if (existingRef) {
		// Reintento del mismo navegador: ya quedó adjunto. Cualquier otra referencia no se pisa.
		if (isOrderReceiptPath(existingRef, companyId)) {
			return jsonWithPublicCors(req, { ok: true, path: existingRef, status: "uploaded", idempotentReplay: true });
		}
		return jsonWithPublicCors(req, { error: ALREADY_ATTACHED }, { status: 409 });
	}

	// El tipo declarado lo elige quien arma la petición: se decide por los primeros bytes.
	const bytes = new Uint8Array(await file.arrayBuffer());
	const contentType = sniffImageType(bytes);
	const extension = contentType ? EXT_BY_TYPE.get(contentType) : undefined;
	if (!contentType || !extension) {
		return jsonWithPublicCors(req, { error: "Solo se permiten imagenes JPG, PNG o WebP." }, { status: 400 });
	}

	const path = orderReceiptPath({
		companyId,
		branchId: String(order.branch_id ?? ""),
		orderId,
		fileId: randomUUID(),
		extension,
	});
	if (!path) {
		logger.error("public_order_receipt_bad_path", { orderId, companyId, branchId: order.branch_id });
		return jsonWithPublicCors(req, { error: GENERIC_FAILURE }, { status: 500 });
	}

	const { error: uploadError } = await supabaseAdmin.storage
		.from(PRIVATE_RECEIPTS_BUCKET)
		.upload(path, bytes, { cacheControl: "3600", contentType, upsert: false });
	if (uploadError) {
		logger.error("public_order_receipt_upload_failed", { orderId, message: uploadError.message });
		return jsonWithPublicCors(req, { error: GENERIC_FAILURE }, { status: 500 });
	}

	// Solo si el pedido sigue sin comprobante: dos subidas a la vez no se pisan.
	let update = supabaseAdmin
		.from("orders")
		.update({ payment_ref: path })
		.eq("id", orderId)
		.eq("client_request_id", clientRequestId);
	update = order.payment_ref == null ? update.is("payment_ref", null) : update.eq("payment_ref", order.payment_ref);
	const { data: updated, error: updateError } = await update.select("id");
	if (updateError || !updated || updated.length === 0) {
		await supabaseAdmin.storage.from(PRIVATE_RECEIPTS_BUCKET).remove([path]);
		if (updateError) {
			logger.error("public_order_receipt_attach_failed", { orderId, message: updateError.message });
			return jsonWithPublicCors(req, { error: GENERIC_FAILURE }, { status: 500 });
		}
		return jsonWithPublicCors(req, { error: ALREADY_ATTACHED }, { status: 409 });
	}

	return jsonWithPublicCors(req, { ok: true, path, status: "uploaded" });
}
