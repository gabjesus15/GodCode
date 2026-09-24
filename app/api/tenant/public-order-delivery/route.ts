import { NextRequest } from "next/server";
import currency from "currency.js";

import { jsonWithPublicCors, publicApiPreflightResponse } from "@/lib/infra/api-cors";
import { assertPublicRateLimit, assertPublicScopedRateLimit } from "@/lib/infra/public-rate-limit";
import { resolveNamedAreaFromAddress } from "@/lib/delivery/delivery-area-resolve";
import { pickClientAddressFields } from "@/lib/delivery/client-address-fields";
import { UBER_NEEDS_COORDINATES_CODE } from "@/lib/delivery/delivery-quote-contract";
import {
	computeDeliveryFee,
	effectiveDeliveryPricingMode,
	normalizeDeliverySettings,
	orderItemsSubtotalFromPayload,
} from "@/lib/delivery/delivery-settings";
import { haversineKm, isValidLatLng } from "@/lib/geo/geo";
import { getCountryConfig } from "@/lib/geo/country-registry";
import { normalizeDeliveryLocationSource, resolveDeliveryMapsUrl } from "@/lib/delivery/delivery-location";
import { resolveUberOAuthCredentials } from "@/lib/integrations/company-integration-settings";
import {
	canAutoCancelOrphanOrder,
	orderPatchEligibility,
	orphanCancelNote,
} from "@/lib/orders/orphan-cancel";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { isMenuAccountClient, sealOrderDeliveryAddress } from "@/lib/menu-account/order-address";
import { fetchUberDeliveryEstimate } from "@/lib/delivery/uber-direct";

/** @service-role public
 *
 * Cierre del pedido público; el pedido se ata por client_request_id y edad máxima.
 */

const TOTAL_EPS = 2;
const FEE_EPS = 0.5;

/**
 * Cancela el pedido que quedó a medias cuando este cierre no puede completarse.
 *
 * Vive aquí y no en el navegador porque la clave anónima no tiene UPDATE sobre
 * `orders`: el intento del cliente siempre murió en un 42501 que nadie miraba, y
 * el pedido se quedaba vivo en el panel mientras la persona veía un error.
 */
async function cancelOrphanOrder(
	order: { id: unknown; note?: unknown; status?: unknown; created_at?: unknown },
	reason: string,
): Promise<void> {
	if (!canAutoCancelOrphanOrder({ status: String(order.status ?? ""), createdAt: String(order.created_at ?? "") }, Date.now())) {
		return;
	}
	const { error } = await supabaseAdmin
		.from("orders")
		.update({
			status: "cancelled",
			note: orphanCancelNote(typeof order.note === "string" ? order.note : null, reason),
		})
		.eq("id", order.id)
		// Carrera con caja: si el pedido ya se movió, esta cancelación no le toca.
		.eq("status", "pending");
	if (error) {
		console.error("[public-order-delivery] pedido huérfano sin cancelar", {
			orderId: order.id,
			reason,
			error: error.message,
		});
	}
}

function parseItems(raw: unknown): Array<{ price?: unknown; quantity?: unknown }> {
	if (!raw) return [];
	if (Array.isArray(raw)) return raw;
	if (typeof raw === "string") {
		try {
			const p = JSON.parse(raw);
			return Array.isArray(p) ? p : [];
		} catch {
			return [];
		}
	}
	return [];
}

function isDeliveryType(orderType: string): boolean {
	const t = orderType.trim().toLowerCase();
	return t === "delivery" || t === "envio" || t === "envío" || t === "despacho";
}

async function pickHandoffCode(): Promise<string> {
	for (let i = 0; i < 15; i++) {
		const code = String(Math.floor(100000 + Math.random() * 900000));
		const { data } = await supabaseAdmin
			.from("orders")
			.select("id")
			.eq("handoff_code", code)
			.maybeSingle();
		if (!data) return code;
	}
	return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Tras crear el pedido vía RPC, persiste metadatos de envío con validación server-side
 * (tarifa coherente con `branches.delivery_settings` y total = ítems + envío).
 */
export async function POST(req: NextRequest) {
	try {
		const limited = await assertPublicRateLimit(req, "tenant_public_order_delivery", 15, 60_000);
		if (limited) return limited;

		const body = (await req.json().catch(() => ({}))) as {
			orderId?: unknown;
			orderType?: unknown;
			deliveryKm?: unknown;
			deliveryLat?: unknown;
			deliveryLng?: unknown;
			deliveryAddress?: unknown;
			deliveryLocationSource?: unknown;
			deliveryFee?: unknown;
			namedAreaId?: unknown;
			uberQuoteId?: unknown;
		};

		const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
		const orderTypeRaw = String(body.orderType ?? "pickup");
		const deliveryFeeClient = Number(body.deliveryFee);
		const deliveryLat = Number(body.deliveryLat);
		const deliveryLng = Number(body.deliveryLng);
		const deliveryLocationSource = normalizeDeliveryLocationSource(body.deliveryLocationSource);
		const namedAreaIdRaw =
			typeof body.namedAreaId === "string" ? body.namedAreaId.trim() : "";
		const uberQuoteIdClient =
			typeof body.uberQuoteId === "string" ? body.uberQuoteId.trim() : "";

		if (!orderId) {
			return jsonWithPublicCors(req, { error: "Falta orderId" }, { status: 400 });
		}

		const { data: order, error: orderErr } = await supabaseAdmin
			.from("orders")
			.select("id, branch_id, client_id, total, items, created_at, status, discount_total, note")
			.eq("id", orderId)
			.maybeSingle();

		if (orderErr || !order) {
			return jsonWithPublicCors(req, { error: "Pedido no encontrado" }, { status: 404 });
		}

		const elegibilidad = orderPatchEligibility(
			{ status: String(order.status ?? ""), createdAt: String(order.created_at ?? "") },
			Date.now(),
		);
		// Ni el pedido viejo ni el que ya avanzó se cancelan: son justo los ajenos que
		// alguien podría intentar tumbar adivinando un id correlativo.
		if (elegibilidad === "expired") {
			return jsonWithPublicCors(
				req,
				{ error: "Pedido no elegible para actualización de envío" },
				{ status: 400 },
			);
		}
		if (elegibilidad === "not_pending") {
			return jsonWithPublicCors(req, { error: "Solo pedidos pendientes" }, { status: 400 });
		}

		/**
		 * De aquí en adelante el pedido ya existe y es cancelable: cada rechazo lo
		 * cancela antes de responder. El límite por IP acota el daño si alguien usa
		 * esta vía para tumbar pedidos: una compra normal cancela como mucho uno.
		 */
		const rechazarYCancelar = async (payload: Record<string, unknown>, status: number) => {
			const motivo = String(payload.error ?? payload.message ?? "patch");
			const cancelLimitado = await assertPublicScopedRateLimit(
				req,
				"tenant_public_order_cancel",
				5,
				10 * 60_000,
			);
			if (cancelLimitado) {
				console.warn("[public-order-delivery] cancelación omitida por límite", {
					orderId: order.id,
					reason: motivo,
				});
			} else {
				await cancelOrphanOrder(order, motivo);
			}
			return jsonWithPublicCors(req, payload, { status });
		};

		const { data: branch, error: brErr } = await supabaseAdmin
			.from("branches")
			.select("id, company_id, country, delivery_settings, origin_lat, origin_lng, order_intake_paused, order_intake_pause_message")
			.eq("id", order.branch_id)
			.maybeSingle();

		if (brErr || !branch) {
			return await rechazarYCancelar({ error: "Sucursal no encontrada" }, 400);
		}

		if (branch.order_intake_paused) {
			return await rechazarYCancelar(
				{
					error: "ORDER_INTAKE_PAUSED",
					message: branch.order_intake_pause_message || "Tenemos mucha demanda por el momento. Vuelve a intentar en unos minutos."
				},
				423,
			);
		}

		let currencyCode = "CLP";
		let companyIntegration: unknown = null;
		if (branch.company_id) {
			const { data: comp } = await supabaseAdmin
				.from("companies")
				.select("currency, integration_settings")
				.eq("id", branch.company_id)
				.maybeSingle();
			const c = typeof comp?.currency === "string" ? comp.currency.trim() : "";
			if (c) currencyCode = c.toUpperCase().slice(0, 8);
			companyIntegration = comp?.integration_settings ?? null;
		}

		const items = parseItems(order.items);
		const subtotal = orderItemsSubtotalFromPayload(items);
		const settings = normalizeDeliverySettings(branch.delivery_settings);

		const draftAddr =
			body.deliveryAddress &&
			typeof body.deliveryAddress === "object" &&
			!Array.isArray(body.deliveryAddress)
				? (body.deliveryAddress as Record<string, unknown>)
				: null;

		let expectedFee = 0;
		/** Id de cotización Uber a persistir en `delivery_address` (estimación actual en servidor). */
		let uberQuoteIdResolved: string | null = null;

		if (isDeliveryType(orderTypeRaw)) {
			if (!settings.enabled) {
				return await rechazarYCancelar(
					{ error: "Delivery no habilitado en esta sucursal" },
					400,
				);
			}
			const pricingMode = effectiveDeliveryPricingMode(settings);

			if (pricingMode === "external") {
				const storeId = settings.uberDirectStoreId?.trim() ?? "";
				if (!storeId) {
					return await rechazarYCancelar(
						{
							error:
								"Esta sucursal no tiene configurado el local de Uber Direct (store id).",
						},
						400,
					);
				}
				const addrLine = String(
					draftAddr?.formatted_address ?? draftAddr?.address ?? "",
				).trim();

				if (!settings.showExternalDeliveryFeeAmount) {
					expectedFee = 0;
					uberQuoteIdResolved = uberQuoteIdClient || null;
				} else {
					if (!isValidLatLng(deliveryLat, deliveryLng)) {
						return await rechazarYCancelar(
							{
								error:
									"Faltan coordenadas de entrega válidas para validar el envío con Uber.",
								code: UBER_NEEDS_COORDINATES_CODE,
							},
							400,
						);
					}
					const oauth = resolveUberOAuthCredentials({
						integrationSettings: companyIntegration,
					});
					if (!oauth.ok) {
						return await rechazarYCancelar({ error: oauth.message }, 400);
					}
					const uber = await fetchUberDeliveryEstimate({
						storeId,
						dropoffLat: deliveryLat,
						dropoffLng: deliveryLng,
						formattedAddress: addrLine || undefined,
						subtotalMajor: subtotal,
						currencyCode,
						oauth: { clientId: oauth.clientId, clientSecret: oauth.clientSecret },
					});
					if (!uber.ok) {
						return await rechazarYCancelar({ error: uber.message }, 502);
					}
					expectedFee = Math.round(uber.feeMajor);
					uberQuoteIdResolved = uber.estimateId;
				}
			} else {
				let r: ReturnType<typeof computeDeliveryFee> | null = null;

				if (pricingMode === "named") {
					if (settings.namedAreaResolution === "address_matched") {
						const addrLineInner = String(
							draftAddr?.address ?? draftAddr?.formatted_address ?? "",
						)
							.trim();
						const resolved = await resolveNamedAreaFromAddress(
							settings,
							addrLineInner,
							subtotal,
						);
						if (!resolved.ok) {
							return await rechazarYCancelar(
								{ error: resolved.message },
								resolved.code === "ambiguous" ? 409 : 400,
							);
						}
						r = computeDeliveryFee(settings, 0, subtotal, {
							namedAreaId: resolved.namedAreaId,
						});
					} else {
						r = computeDeliveryFee(settings, 0, subtotal, {
							namedAreaId: namedAreaIdRaw || null,
						});
					}
				} else {
					const olat = Number(branch.origin_lat);
					const olng = Number(branch.origin_lng);
					if (
						!isValidLatLng(deliveryLat, deliveryLng) ||
						!isValidLatLng(olat, olng)
					) {
						return await rechazarYCancelar(
							{
								error:
									"Se requieren coordenadas validas de origen y destino para calcular el envio.",
							},
							400,
						);
					}
					const preciseKm = haversineKm(
						{ lat: olat, lng: olng },
						{ lat: deliveryLat, lng: deliveryLng },
					);
					if (
						settings.maxDeliveryKm != null &&
						preciseKm > settings.maxDeliveryKm + 1e-9
					) {
						r = { fee: -1, waivedFreeShipping: false };
					} else {
						const billedKm = Math.max(0, Math.round(preciseKm));
						r = computeDeliveryFee(settings, billedKm, subtotal);
					}
				}

				if (!r || r.fee < 0) {
					const fee = r?.fee ?? -1;
					const msg =
						fee === -1
							? "Distancia fuera del máximo permitido"
							: fee === -2
								? "No se alcanza el pedido mínimo para delivery"
								: fee === -3
									? "Debes elegir una zona de entrega"
									: "Zona de entrega no válida";
					return await rechazarYCancelar({ error: msg }, 400);
				}
				expectedFee = Math.round(r.fee);
			}
		} else {
			expectedFee = 0;
		}

		if (
			!Number.isFinite(deliveryFeeClient) ||
			Math.abs(deliveryFeeClient - expectedFee) > FEE_EPS
		) {
			return await rechazarYCancelar({ error: "Tarifa de envío no válida" }, 400);
		}

		const discount = Number(order.discount_total) || 0;
		const taxRatePercent = settings.taxRate ? settings.taxRate : 0;
		const taxIncluded = settings.taxIncluded ?? false;

		const sub = currency(subtotal);
		const disc = currency(discount);
		const devFee = currency(expectedFee);

		const subAfterDiscount = currency(Math.max(0, sub.subtract(disc).value));

		let taxTotal = 0;
		let baseTotal = currency(0);

		if (taxRatePercent > 0) {
			if (taxIncluded) {
				const divisor = currency(1).add(currency(taxRatePercent).divide(100));
				const net = subAfterDiscount.divide(divisor);
				taxTotal = subAfterDiscount.subtract(net).value;
				baseTotal = subAfterDiscount.add(devFee);
			} else {
				const taxTotalVal = subAfterDiscount.multiply(currency(taxRatePercent).divide(100));
				taxTotal = taxTotalVal.value;
				baseTotal = subAfterDiscount.add(taxTotalVal).add(devFee);
			}
		} else {
			baseTotal = subAfterDiscount.add(devFee);
		}

		const expectedTotal = Math.round(Math.max(0, baseTotal.value));
		// RPC stores total as items − coupon + fee (without excluded IVA). Compare against that contract.
		const expectedRpcTotal = Math.round(Math.max(0, subAfterDiscount.add(devFee).value));
		const orderTotal = Number(order.total) || 0;
		if (Math.abs(orderTotal - expectedRpcTotal) > TOTAL_EPS) {
			return await rechazarYCancelar(
				{ error: "Total del pedido no coincide con ítems + envío" },
				400,
			);
		}

		const deliveryAddress: Record<string, unknown> | null =
			isDeliveryType(orderTypeRaw) && draftAddr
				? pickClientAddressFields(draftAddr)
				: null;

		if (deliveryAddress) {
			const hasPoint = isValidLatLng(deliveryLat, deliveryLng);
			if (hasPoint) {
				deliveryAddress.lat = deliveryLat;
				deliveryAddress.lng = deliveryLng;
				// Cómo se obtuvo el punto: el panel avisa al cajero si es aproximado.
				if (deliveryLocationSource) deliveryAddress.location_source = deliveryLocationSource;
			}
			/* El enlace lo arma el servidor (nunca el cliente). Con un punto aproximado
			   por la dirección escrita, o sin coordenadas (zonas por nombre), busca la
			   dirección en Google Maps en vez de mandar al repartidor al centro de la calle. */
			const mapsUrl = resolveDeliveryMapsUrl({
				lat: hasPoint ? deliveryLat : null,
				lng: hasPoint ? deliveryLng : null,
				source: deliveryLocationSource,
				address: deliveryAddress,
				countryName: getCountryConfig(branch.country)?.name ?? null,
			});
			if (mapsUrl) deliveryAddress.maps_url = mapsUrl;
		}

		if (deliveryAddress && effectiveDeliveryPricingMode(settings) === "external") {
			deliveryAddress.delivery_provider = "uber_direct";
			if (uberQuoteIdResolved) {
				deliveryAddress.uber_quote_id = uberQuoteIdResolved;
			}
		}

		// Pedido de un cliente con cuenta: la dirección se guarda cifrada, con la zona y
		// el proveedor en claro (ver lib/menu-account/order-address.ts).
		const storedAddress =
			deliveryAddress && (await isMenuAccountClient(order.client_id, branch.company_id))
				? sealOrderDeliveryAddress(deliveryAddress)
				: deliveryAddress;

		const handoff =
			isDeliveryType(orderTypeRaw) ? await pickHandoffCode() : null;

		const { error: upErr } = await supabaseAdmin
			.from("orders")
			.update({
				delivery_fee: expectedFee,
				delivery_address: storedAddress,
				tax_total: taxTotal,
				// Keep display total aligned when IVA is excluded from RPC total.
				...(taxRatePercent > 0 && !taxIncluded ? { total: expectedTotal } : {}),
				...(handoff ? { handoff_code: handoff } : {}),
			})
			.eq("id", orderId)
			.eq("branch_id", order.branch_id);

		if (upErr) {
			return await rechazarYCancelar({ error: upErr.message }, 400);
		}

		return jsonWithPublicCors(req, {
			ok: true,
			delivery_fee: expectedFee,
			handoff_code: handoff,
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : "Error en el servidor";
		return jsonWithPublicCors(req, { error: message }, { status: 500 });
	}
}

export async function OPTIONS(req: NextRequest) {
	return publicApiPreflightResponse(req);
}
