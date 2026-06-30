import { NextRequest, NextResponse } from "next/server";

import { jsonWithPublicCors, publicApiCorsHeaders } from "@/lib/infra/api-cors";
import { assertPublicScopedRateLimit, assertPublicRateLimit } from "@/lib/infra/public-rate-limit";
import { resolveNamedAreaFromAddress } from "@/lib/delivery/delivery-area-resolve";
import { UBER_NEEDS_COORDINATES_CODE } from "@/lib/delivery/delivery-quote-contract";
import {
	computeDeliveryFee,
	effectiveDeliveryPricingMode,
	normalizeDeliverySettings,
} from "@/lib/delivery/delivery-settings";
import { haversineKm, isValidLatLng } from "@/lib/geo/geo";
import { resolveUberOAuthCredentials } from "@/lib/integrations/company-integration-settings";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { fetchUberDeliveryEstimate } from "@/lib/delivery/uber-direct";

function roundMoney(n: number): number {
	return Math.round(Number(n) || 0);
}

/**
 * Cotización pública de delivery (sin auth).
 * - `external` + Uber Direct: requiere lat/lng; puede devolver monto o solo texto.
 * - `distance`: coordenadas de entrega vs origen de la sucursal.
 * - `named_areas` + manual: `namedAreaId`.
 * - `named_areas` + address_matched: texto `address`.
 */
export async function POST(req: NextRequest) {
	try {
		const limited = await assertPublicRateLimit(req, "geo_delivery_quote", 40, 60_000);
		if (limited) return limited;

		const body = (await req.json().catch(() => ({}))) as {
			branchId?: unknown;
			lat?: unknown;
			lng?: unknown;
			subtotal?: unknown;
			namedAreaId?: unknown;
			address?: unknown;
		};

		const branchId = typeof body.branchId === "string" ? body.branchId.trim() : "";
		const lat = Number(body.lat);
		const lng = Number(body.lng);
		const subtotal = Number(body.subtotal);
		const namedAreaId =
			typeof body.namedAreaId === "string" ? body.namedAreaId.trim() : "";
		const addressStr =
			typeof body.address === "string" ? body.address.trim() : "";

		if (!branchId) {
			return jsonWithPublicCors(req, { error: "Falta branchId" }, { status: 400 });
		}

		const branchLimited = await assertPublicScopedRateLimit(
			req,
			`geo_delivery_quote_branch:${branchId}`,
			25,
			60_000,
		);
		if (branchLimited) return branchLimited;

		if (!Number.isFinite(subtotal) || subtotal < 0) {
			return jsonWithPublicCors(req, { error: "Subtotal inválido" }, { status: 400 });
		}

		const { data: branch, error } = await supabaseAdmin
			.from("branches")
			.select("id, company_id, delivery_settings, origin_lat, origin_lng")
			.eq("id", branchId)
			.maybeSingle();

		if (error || !branch) {
			return jsonWithPublicCors(req, { error: "Sucursal no encontrada" }, { status: 404 });
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

		const settings = normalizeDeliverySettings(branch.delivery_settings);
		const mode = effectiveDeliveryPricingMode(settings);

		if (mode === "external") {
			if (!settings.enabled) {
				return jsonWithPublicCors(req, { error: "Delivery no habilitado" }, { status: 400 });
			}
			if (!isValidLatLng(lat, lng)) {
				return jsonWithPublicCors(
					req,
					{
						error:
							"Indica tu ubicación en el mapa o usa “Usar mi ubicación” para cotizar el envío.",
						code: UBER_NEEDS_COORDINATES_CODE,
					},
					{ status: 400 },
				);
			}
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
			if (!settings.showExternalDeliveryFeeAmount) {
				return jsonWithPublicCors(req, {
					ok: true,
					provider: "uber_direct",
					showDeliveryFeeAmount: false,
					deliveryDisplayText: settings.externalDeliveryDisplayText,
					fee: 0,
					currencyCode,
					uberQuoteId: null,
					waivedFreeShipping: false,
				});
			}
			const oauth = resolveUberOAuthCredentials({
				integrationSettings: companyIntegration,
			});
			if (!oauth.ok) {
				return jsonWithPublicCors(req, { error: oauth.message }, { status: 400 });
			}
			const uber = await fetchUberDeliveryEstimate({
				storeId,
				dropoffLat: lat,
				dropoffLng: lng,
				formattedAddress: addressStr || undefined,
				subtotalMajor: subtotal,
				currencyCode,
				oauth: { clientId: oauth.clientId, clientSecret: oauth.clientSecret },
				customerId: oauth.customerId,
			});
			if (!uber.ok) {
				const status = uber.httpStatus === 401 ? 502 : 502;
				return jsonWithPublicCors(req, { error: uber.message }, { status });
			}
			return jsonWithPublicCors(req, {
				ok: true,
				provider: "uber_direct",
				showDeliveryFeeAmount: true,
				fee: roundMoney(uber.feeMajor),
				currencyCode: uber.currencyCode,
				uberQuoteId: uber.estimateId,
				waivedFreeShipping: false,
			});
		}

		if (mode === "named") {
			if (settings.namedAreaResolution === "address_matched") {
				const resolved = await resolveNamedAreaFromAddress(
					settings,
					addressStr,
					subtotal,
				);
				if (!resolved.ok) {
					const status =
						resolved.code === "short_address"
							? 400
							: resolved.code === "ambiguous"
								? 409
								: 404;
					return jsonWithPublicCors(
						req,
						{ error: resolved.message, code: resolved.code },
						{ status },
					);
				}
				return jsonWithPublicCors(req, {
					ok: true,
					mode: "named_area",
					namedAreaResolution: "address_matched",
					namedAreaId: resolved.namedAreaId,
					label: resolved.label,
					fee: roundMoney(resolved.fee),
					waivedFreeShipping: resolved.waivedFreeShipping,
				});
			}

			if (!namedAreaId) {
				return jsonWithPublicCors(
					req,
					{ error: "Selecciona una zona de entrega", code: -3 },
					{ status: 400 },
				);
			}
			const r = computeDeliveryFee(settings, 0, subtotal, {
				namedAreaId,
			});
			if (r.fee < 0) {
				const msg =
					r.fee === -2
						? "No se alcanza el pedido mínimo para delivery"
						: r.fee === -4
							? "Zona de entrega no válida"
							: "No se pudo cotizar el envío";
				return jsonWithPublicCors(req, { error: msg, code: r.fee }, { status: 400 });
			}
			return jsonWithPublicCors(req, {
				ok: true,
				mode: "named_area",
				namedAreaResolution: "manual_select",
				namedAreaId,
				fee: roundMoney(r.fee),
				waivedFreeShipping: r.waivedFreeShipping,
			});
		}

		if (!isValidLatLng(lat, lng)) {
			return jsonWithPublicCors(req, { error: "Coordenadas inválidas" }, { status: 400 });
		}

		const olat = Number(branch.origin_lat);
		const olng = Number(branch.origin_lng);
		if (!isValidLatLng(olat, olng)) {
			return jsonWithPublicCors(
				req,
				{
					error:
						"Esta sucursal aún no tiene ubicación del local configurada para cotizar por distancia.",
				},
				{ status: 400 },
			);
		}

		const preciseKm = haversineKm({ lat: olat, lng: olng }, { lat, lng });
		if (
			settings.maxDeliveryKm != null &&
			preciseKm > settings.maxDeliveryKm + 1e-9
		) {
			return jsonWithPublicCors(
				req,
				{
					error: "Distancia fuera del máximo permitido",
					code: -1,
				},
				{ status: 400 },
			);
		}
		const billedKm = Math.max(0, Math.round(preciseKm));
		const r = computeDeliveryFee(settings, billedKm, subtotal);

		if (r.fee < 0) {
			return jsonWithPublicCors(
				req,
				{
					error:
						r.fee === -1
							? "Distancia fuera del máximo permitido"
							: "No se alcanza el pedido mínimo para delivery",
					code: r.fee,
				},
				{ status: 400 },
			);
		}

		return jsonWithPublicCors(req, {
			ok: true,
			mode: "distance",
			distanceKm: billedKm,
			fee: roundMoney(r.fee),
			waivedFreeShipping: r.waivedFreeShipping,
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
