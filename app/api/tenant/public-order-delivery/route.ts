import { NextRequest, NextResponse } from "next/server";
import currency from "currency.js";

import { jsonWithPublicCors, publicApiCorsHeaders } from "@/lib/infra/api-cors";
import { resolveNamedAreaFromAddress } from "@/lib/delivery/delivery-area-resolve";
import { UBER_NEEDS_COORDINATES_CODE } from "@/lib/delivery/delivery-quote-contract";
import {
	computeDeliveryFee,
	effectiveDeliveryPricingMode,
	normalizeDeliverySettings,
	orderItemsSubtotalFromPayload,
} from "@/lib/delivery/delivery-settings";
import {
	buildGoogleMapsDirectionsUrl,
	haversineKm,
	isValidLatLng,
} from "@/lib/geo/geo";
import { resolveUberOAuthCredentials } from "@/lib/integrations/company-integration-settings";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { fetchUberDeliveryEstimate } from "@/lib/delivery/uber-direct";

const MAX_ORDER_AGE_MS = 10 * 60 * 1000;
const TOTAL_EPS = 2;
const FEE_EPS = 0.5;

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
		const body = (await req.json().catch(() => ({}))) as {
			orderId?: unknown;
			orderType?: unknown;
			deliveryKm?: unknown;
			deliveryLat?: unknown;
			deliveryLng?: unknown;
			deliveryAddress?: unknown;
			deliveryFee?: unknown;
			namedAreaId?: unknown;
			uberQuoteId?: unknown;
		};

		const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
		const orderTypeRaw = String(body.orderType ?? "pickup");
		const deliveryKm = Number(body.deliveryKm);
		const deliveryFeeClient = Number(body.deliveryFee);
		const deliveryLat = Number(body.deliveryLat);
		const deliveryLng = Number(body.deliveryLng);
		const namedAreaIdRaw =
			typeof body.namedAreaId === "string" ? body.namedAreaId.trim() : "";
		const uberQuoteIdClient =
			typeof body.uberQuoteId === "string" ? body.uberQuoteId.trim() : "";

		if (!orderId) {
			return jsonWithPublicCors(req, { error: "Falta orderId" }, { status: 400 });
		}

		const { data: order, error: orderErr } = await supabaseAdmin
			.from("orders")
			.select("id, branch_id, total, items, created_at, status, discount_total")
			.eq("id", orderId)
			.maybeSingle();

		if (orderErr || !order) {
			return jsonWithPublicCors(req, { error: "Pedido no encontrado" }, { status: 404 });
		}

		const created = order.created_at ? new Date(String(order.created_at)) : null;
		if (
			!created ||
			!Number.isFinite(created.getTime()) ||
			Date.now() - created.getTime() > MAX_ORDER_AGE_MS
		) {
			return jsonWithPublicCors(
				req,
				{ error: "Pedido no elegible para actualización de envío" },
				{ status: 400 },
			);
		}

		if (String(order.status) !== "pending") {
			return jsonWithPublicCors(req, { error: "Solo pedidos pendientes" }, { status: 400 });
		}

		const { data: branch, error: brErr } = await supabaseAdmin
			.from("branches")
			.select("id, company_id, delivery_settings, origin_lat, origin_lng, order_intake_paused, order_intake_pause_message")
			.eq("id", order.branch_id)
			.maybeSingle();

		if (brErr || !branch) {
			return jsonWithPublicCors(req, { error: "Sucursal no encontrada" }, { status: 400 });
		}

		if (branch.order_intake_paused) {
			return jsonWithPublicCors(
				req,
				{
					error: "ORDER_INTAKE_PAUSED",
					message: branch.order_intake_pause_message || "Tenemos mucha demanda por el momento. Vuelve a intentar en unos minutos."
				},
				{ status: 423 }
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
				return jsonWithPublicCors(
					req,
					{ error: "Delivery no habilitado en esta sucursal" },
					{ status: 400 },
				);
			}
			const pricingMode = effectiveDeliveryPricingMode(settings);

			if (pricingMode === "external") {
				const storeId = settings.uberDirectStoreId?.trim() ?? "";
				if (!storeId) {
					return jsonWithPublicCors(
						req,
						{
							error:
								"Esta sucursal no tiene configurado el local de Uber Direct (store id).",
						},
						{ status: 400 },
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
						return jsonWithPublicCors(
							req,
							{
								error:
									"Faltan coordenadas de entrega válidas para validar el envío con Uber.",
								code: UBER_NEEDS_COORDINATES_CODE,
							},
							{ status: 400 },
						);
					}
					const oauth = resolveUberOAuthCredentials({
						integrationSettings: companyIntegration,
					});
					if (!oauth.ok) {
						return jsonWithPublicCors(req, { error: oauth.message }, { status: 400 });
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
						return jsonWithPublicCors(req, { error: uber.message }, { status: 502 });
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
							return jsonWithPublicCors(
								req,
								{ error: resolved.message },
								{
									status:
										resolved.code === "ambiguous"
											? 409
											: resolved.code === "short_address"
												? 400
												: 400,
								},
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
					let preciseKm =
						Number.isFinite(deliveryKm) && deliveryKm >= 0 ? deliveryKm : 0;
					if (
						isValidLatLng(deliveryLat, deliveryLng) &&
						isValidLatLng(olat, olng)
					) {
						preciseKm = haversineKm(
							{ lat: olat, lng: olng },
							{ lat: deliveryLat, lng: deliveryLng },
						);
					}
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
					return jsonWithPublicCors(req, { error: msg }, { status: 400 });
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
			return jsonWithPublicCors(req, { error: "Tarifa de envío no válida" }, { status: 400 });
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
		const orderTotal = Number(order.total) || 0;
		if (Math.abs(orderTotal - expectedTotal) > TOTAL_EPS) {
			return jsonWithPublicCors(
				req,
				{ error: "Total del pedido no coincide con ítems + envío" },
				{ status: 400 },
			);
		}

		const deliveryAddress: Record<string, unknown> | null =
			isDeliveryType(orderTypeRaw) && draftAddr
				? { ...draftAddr }
				: null;

		if (
			deliveryAddress &&
			isValidLatLng(deliveryLat, deliveryLng)
		) {
			deliveryAddress.lat = deliveryLat;
			deliveryAddress.lng = deliveryLng;
			deliveryAddress.maps_url = buildGoogleMapsDirectionsUrl(
				deliveryLat,
				deliveryLng,
			);
		}

		if (deliveryAddress && effectiveDeliveryPricingMode(settings) === "external") {
			deliveryAddress.delivery_provider = "uber_direct";
			if (uberQuoteIdResolved) {
				deliveryAddress.uber_quote_id = uberQuoteIdResolved;
			}
		}

		const handoff =
			isDeliveryType(orderTypeRaw) ? await pickHandoffCode() : null;

		// taxTotal is already pre-calculated in block scope

		const { error: upErr } = await supabaseAdmin
			.from("orders")
			.update({
				delivery_fee: expectedFee,
				delivery_address: deliveryAddress,
				tax_total: taxTotal,
				...(handoff ? { handoff_code: handoff } : {}),
			})
			.eq("id", orderId)
			.eq("branch_id", order.branch_id);

		if (upErr) {
			return jsonWithPublicCors(req, { error: upErr.message }, { status: 400 });
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
	const cors = publicApiCorsHeaders(req);
	if ([...cors.keys()].length === 0) {
		return new NextResponse(null, { status: 204 });
	}
	return new NextResponse(null, { status: 204, headers: cors });
}
