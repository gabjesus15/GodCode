import type { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonOk, parseJsonBody } from "@/lib/api/response";
import { enforceRateLimit } from "@/lib/infra/api-guard";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { ensureMenuAccountClient } from "@/lib/menu-account/client-link";
import { shortDisplayName } from "@/lib/menu-account/display-name";
import { sealOrderDeliveryAddress } from "@/lib/menu-account/order-address";
import { logger } from "@/lib/infra/logger";
import {
	menuAccountDisabledResponse,
	toMenuAccountErrorResponse,
} from "@/lib/menu-account/route-helpers";
import { requireMenuAccount } from "@/lib/menu-account/session";
import { orphanCancelNote } from "@/lib/orders/orphan-cancel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** @service-role menu-client-session
 *
 * Crea el pedido de una persona con sesión en el menú.
 *
 * El RPC `create_order_transaction` solo acepta la ficha de una cuenta si lo llama
 * el servicio o el personal del negocio: así el menú anónimo no puede colgarle
 * pedidos a una cuenta ajena conociendo el id de su ficha. Aquí la cuenta sale de
 * la sesión, nunca del cuerpo, y el RPC copia el contacto desde la ficha (nombre
 * corto y datos cifrados), no desde lo que manda el navegador.
 *
 * Lo demás (ítems, total, envío, cupón) lo valida el RPC igual que en la compra sin
 * cuenta: esta ruta solo fija quién compra.
 */

const bodySchema = z.object({
	branchId: z.string().uuid(),
	items: z.array(z.unknown()).min(1).max(200),
	total: z.number().finite().nonnegative(),
	paymentType: z.string().trim().min(1).max(40),
	paymentRef: z.string().max(500).nullable().optional(),
	paymentMethodSpecific: z.string().trim().min(1).max(60),
	note: z.string().max(2000).optional(),
	orderType: z.enum(["pickup", "delivery"]),
	deliveryFee: z.number().finite().nonnegative(),
	deliveryAddress: z.record(z.string(), z.unknown()).nullable().optional(),
	couponCode: z.string().trim().max(80).nullable().optional(),
	orderOrigin: z.string().trim().max(40).optional(),
	/** Credencial con la que el carrito cierra el pedido en `public-order-delivery`. */
	clientRequestId: z.string().uuid(),
});

/**
 * Último recurso cuando el pedido no se pudo sellar: cancelado y sin la dirección
 * en claro. Solo si sigue pendiente (carrera con caja). Si también falla, queda el
 * log con el id para limpiarlo a mano.
 */
async function abandonUnsealedOrder(
	created: { id?: unknown; note?: unknown },
	clientId: string,
	clearAddress: boolean,
): Promise<void> {
	const { error } = await supabaseAdmin
		.from("orders")
		.update({
			status: "cancelled",
			note: orphanCancelNote(typeof created.note === "string" ? created.note : null, "seal_failed"),
			...(clearAddress ? { delivery_address: null } : {}),
		})
		.eq("id", created.id as number)
		.eq("client_id", clientId)
		.eq("status", "pending");
	if (error) {
		logger.error("menu_account_order_abandon_failed", { orderId: created.id, message: error.message });
	}
}

export async function POST(req: NextRequest) {
	const disabled = menuAccountDisabledResponse();
	if (disabled) return disabled;

	const limited = await enforceRateLimit(req, "menu_account_order", 10, 60_000);
	if (limited) return limited;

	const parsed = await parseJsonBody(req, bodySchema);
	if (!parsed.ok) return parsed.response;
	const body = parsed.data;

	try {
		const { data: branch } = await supabaseAdmin
			.from("branches")
			.select("company_id")
			.eq("id", body.branchId)
			.maybeSingle();
		if (!branch?.company_id) return jsonError(404, "Sucursal no encontrada.", { code: "branch_not_found" });
		const companyId = String(branch.company_id);

		const { account } = await requireMenuAccount(companyId);
		const clientId = await ensureMenuAccountClient(account);

		const { data: order, error } = await supabaseAdmin.rpc("create_order_transaction", {
			// El RPC toma el contacto de la ficha; estos tres quedan solo por la firma.
			p_client_name: shortDisplayName(account.full_name),
			p_client_phone: "",
			p_client_rut: "",
			p_client_id: clientId,
			p_items: body.items as never,
			p_total: body.total,
			p_payment_type: body.paymentType,
			p_payment_ref: body.paymentRef ?? null,
			p_note: body.note ?? "",
			p_branch_id: body.branchId,
			p_company_id: companyId,
			// El menú siempre crea pedidos pendientes: caja los avanza.
			p_status: "pending",
			p_payment_method_specific: body.paymentMethodSpecific,
			p_order_type: body.orderType,
			p_delivery_fee: body.orderType === "delivery" ? body.deliveryFee : 0,
			p_delivery_address: body.orderType === "delivery" ? ((body.deliveryAddress ?? null) as never) : null,
			...(body.couponCode ? { p_coupon_code: body.couponCode } : {}),
			p_order_origin: body.orderOrigin || "web",
		});

		if (error) {
			// El carrito traduce el código del RPC (invalid_item_price, cupones…) igual que
			// cuando compra sin cuenta.
			return jsonError(400, error.message || "No se pudo crear el pedido.", { code: "order_rpc_error" });
		}

		// El RPC necesita la dirección en claro para calcular el envío; apenas existe
		// el pedido se cifra, antes de que nadie lo lea. En la misma escritura queda
		// atado al client_request_id del carrito, que es lo que le pide el cierre.
		const created = (order ?? {}) as { id?: unknown; delivery_address?: unknown; note?: unknown };
		const sealedAddress = sealOrderDeliveryAddress(created.delivery_address);
		const sealNeeded = Boolean(sealedAddress) && created.delivery_address !== sealedAddress;
		if (created.id != null) {
			const finalize = () =>
				supabaseAdmin
					.from("orders")
					.update({
						client_request_id: body.clientRequestId,
						...(sealNeeded ? { delivery_address: sealedAddress as never } : {}),
					})
					.eq("id", created.id as number)
					.eq("client_id", clientId);
			// Un reintento cubre el corte de red puntual; la escritura es idempotente.
			let { error: updateError } = await finalize();
			if (updateError) ({ error: updateError } = await finalize());
			if (updateError) {
				// Sin esta escritura el pedido queda con la dirección en claro y sin el
				// client_request_id, así que el cierre del carrito tampoco lo encontraría:
				// vivo en caja pero sin terminar. Se cancela y se borra la dirección en vez
				// de responder éxito; el carrito muestra el error y el reintento crea otro.
				logger.error("menu_account_order_seal_failed", { orderId: created.id, message: updateError.message });
				await abandonUnsealedOrder(created, clientId, sealNeeded);
				return jsonError(503, "No se pudo completar el pedido. Intenta nuevamente.", {
					code: "order_finalize_failed",
				});
			}
			if (sealNeeded) created.delivery_address = sealedAddress;
		}
		return jsonOk({ order: created });
	} catch (error) {
		return toMenuAccountErrorResponse(error, "menu_account_order");
	}
}
