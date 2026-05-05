import { NextRequest, NextResponse } from "next/server";

import { resolveNamedAreaFromAddress } from "@/lib/delivery/delivery-area-resolve";
import {
	deliveryGeocodeCacheGet,
	deliveryGeocodeCacheSet,
	deliveryPublicRateOk,
	hashDeliveryAddressKey,
} from "@/lib/delivery/delivery-public-limiter";
import {
	effectiveDeliveryPricingMode,
	normalizeDeliverySettings,
} from "@/lib/delivery/delivery-settings";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";

const CACHE_TTL_MS = 15 * 60 * 1000;

function clientKey(req: NextRequest): string {
	const xf = req.headers.get("x-forwarded-for");
	if (xf) return xf.split(",")[0]?.trim() || "unknown";
	return "unknown";
}

/**
 * Cotiza zona de envío a partir de dirección en texto (named_areas + address_matched).
 * Público, con rate limit y caché.
 */
export async function POST(req: NextRequest) {
	try {
		const body = (await req.json().catch(() => ({}))) as {
			branchId?: unknown;
			address?: unknown;
			subtotal?: unknown;
		};

		const branchId = typeof body.branchId === "string" ? body.branchId.trim() : "";
		const address = typeof body.address === "string" ? body.address.trim() : "";
		const subtotal = Number(body.subtotal);

		if (!branchId) {
			return NextResponse.json({ error: "Falta branchId" }, { status: 400 });
		}
		if (!Number.isFinite(subtotal) || subtotal < 0) {
			return NextResponse.json({ error: "Subtotal inválido" }, { status: 400 });
		}

		const ip = clientKey(req);
		if (!deliveryPublicRateOk(`geo:${ip}`, 50, 60_000)) {
			return NextResponse.json(
				{ error: "Demasiadas consultas. Espera un momento." },
				{ status: 429 },
			);
		}
		if (!deliveryPublicRateOk(`geo:${ip}:${branchId}`, 35, 60_000)) {
			return NextResponse.json(
				{ error: "Demasiadas consultas para esta sucursal." },
				{ status: 429 },
			);
		}

		const cacheKey = `${hashDeliveryAddressKey(branchId, address)}:s${Math.round(subtotal * 100)}`;
		const cached = deliveryGeocodeCacheGet<Record<string, unknown>>(cacheKey);
		if (cached) {
			return NextResponse.json(cached);
		}

		const { data: branch, error } = await supabaseAdmin
			.from("branches")
			.select("id, delivery_settings")
			.eq("id", branchId)
			.maybeSingle();

		if (error || !branch) {
			return NextResponse.json({ error: "Sucursal no encontrada" }, { status: 404 });
		}

		const settings = normalizeDeliverySettings(branch.delivery_settings);
		if (!settings.enabled) {
			return NextResponse.json(
				{ error: "Delivery no disponible en esta sucursal" },
				{ status: 400 },
			);
		}
		if (effectiveDeliveryPricingMode(settings) !== "named") {
			return NextResponse.json(
				{ error: "Esta sucursal no cotiza por comunas con dirección" },
				{ status: 400 },
			);
		}
		if (settings.namedAreaResolution !== "address_matched") {
			return NextResponse.json(
				{ error: "Esta sucursal usa lista de zonas manual" },
				{ status: 400 },
			);
		}

		const resolved = await resolveNamedAreaFromAddress(settings, address, subtotal);
		if (!resolved.ok) {
			const status =
				resolved.code === "short_address"
					? 400
					: resolved.code === "ambiguous"
						? 409
						: 404;
			const payload = {
				ok: false,
				code: resolved.code,
				error: resolved.message,
			};
			return NextResponse.json(payload, { status });
		}

		const payload = {
			ok: true,
			namedAreaId: resolved.namedAreaId,
			label: resolved.label,
			fee: resolved.fee,
			waivedFreeShipping: resolved.waivedFreeShipping,
		};
		deliveryGeocodeCacheSet(cacheKey, payload, CACHE_TTL_MS);
		return NextResponse.json(payload);
	} catch (err) {
		const message = err instanceof Error ? err.message : "Error en el servidor";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
