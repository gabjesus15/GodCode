/**
 * Cliente mínimo Uber Direct: token OAuth (client credentials) + cotización
 * POST /v1/eats/deliveries/estimates.
 * @see https://developer.uber.com/docs/deliveries/direct/api/v1/post-eats-deliveries-estimates
 */

import { createHash } from "crypto";

const UBER_TOKEN_URL = "https://auth.uber.com/oauth/v2/token";
const UBER_ESTIMATES_URL = "https://api.uber.com/v1/eats/deliveries/estimates";

type TokenCache = { token: string; expiresAtMs: number };
const tokenCacheByKey = new Map<string, TokenCache>();

const TOKEN_SKEW_MS = 60_000;

function cacheKeyForCredentials(clientId: string, clientSecret: string): string {
	const h = createHash("sha256").update(clientSecret, "utf8").digest("hex").slice(0, 24);
	return `${clientId.trim()}::${h}`;
}

function currencyMinorExponent(currencyCode: string): number {
	const c = currencyCode.trim().toUpperCase();
	if (
		c === "CLP" ||
		c === "JPY" ||
		c === "KRW" ||
		c === "VND" ||
		c === "UGX" ||
		c === "XAF" ||
		c === "XOF"
	) {
		return 0;
	}
	return 2;
}

/** Convierte monto mayor (ej. pesos) a unidades mínimas que espera Uber. */
export function toUberMinorUnits(major: number, currencyCode: string): number {
	const exp = currencyMinorExponent(currencyCode);
	const factor = 10 ** exp;
	return Math.round(Number(major) * factor);
}

/** Convierte total en unidades mínimas de Uber a monto mayor para UI/DB. */
export function fromUberMinorUnits(minor: number, currencyCode: string): number {
	const exp = currencyMinorExponent(currencyCode);
	const factor = 10 ** exp;
	return minor / factor;
}

export type UberOAuthCredentials = { clientId: string; clientSecret: string };

/**
 * Token OAuth. Si no se pasan credenciales, usa `UBER_CLIENT_ID` / `UBER_CLIENT_SECRET`.
 */
export async function getUberDirectAccessToken(
	credentials?: UberOAuthCredentials | null,
): Promise<{ ok: true; accessToken: string } | { ok: false; message: string }> {
	let clientId: string;
	let clientSecret: string;
	if (credentials?.clientId?.trim() && credentials?.clientSecret) {
		clientId = credentials.clientId.trim();
		clientSecret = credentials.clientSecret;
	} else {
		clientId = process.env.UBER_CLIENT_ID?.trim() ?? "";
		clientSecret = process.env.UBER_CLIENT_SECRET?.trim() ?? "";
	}
	if (!clientId || !clientSecret) {
		return {
			ok: false,
			message:
				"Uber Direct no configurado: credenciales de empresa o UBER_CLIENT_ID / UBER_CLIENT_SECRET.",
		};
	}

	const cacheKey = cacheKeyForCredentials(clientId, clientSecret);
	const now = Date.now();
	const cached = tokenCacheByKey.get(cacheKey);
	if (cached && cached.expiresAtMs > now + TOKEN_SKEW_MS) {
		return { ok: true, accessToken: cached.token };
	}

	const body = new URLSearchParams({
		client_id: clientId,
		client_secret: clientSecret,
		grant_type: "client_credentials",
		scope: "eats.deliveries",
	});

	let res: Response;
	try {
		res = await fetch(UBER_TOKEN_URL, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: body.toString(),
		});
	} catch {
		return { ok: false, message: "No se pudo contactar a Uber (token)." };
	}

	const j = (await res.json().catch(() => ({}))) as Record<string, unknown>;
	if (!res.ok) {
		tokenCacheByKey.delete(cacheKey);
		const msg =
			typeof j.error_description === "string"
				? j.error_description
				: typeof j.error === "string"
					? j.error
					: "Error al obtener token de Uber.";
		return { ok: false, message: msg };
	}

	const accessToken = typeof j.access_token === "string" ? j.access_token : "";
	const expiresIn = Number(j.expires_in) || 0;
	if (!accessToken) {
		return { ok: false, message: "Respuesta de token de Uber inválida." };
	}

	tokenCacheByKey.set(cacheKey, {
		token: accessToken,
		expiresAtMs: now + Math.max(60, expiresIn) * 1000,
	});
	return { ok: true, accessToken };
}

export type UberDeliveryEstimateResult =
	| {
			ok: true;
			estimateId: string;
			feeMajor: number;
			currencyCode: string;
	  }
	| { ok: false; message: string; httpStatus?: number };

export async function fetchUberDeliveryEstimate(params: {
	storeId: string;
	dropoffLat: number;
	dropoffLng: number;
	formattedAddress?: string;
	subtotalMajor: number;
	currencyCode: string;
	/** Si se omite, se usa el par global en env. */
	oauth?: UberOAuthCredentials | null;
	customerId?: string;
}): Promise<UberDeliveryEstimateResult> {
	const tokenRes = await getUberDirectAccessToken(params.oauth ?? null);
	if (!tokenRes.ok) {
		return { ok: false, message: tokenRes.message };
	}

	const oauthKey = params.oauth
		? cacheKeyForCredentials(params.oauth.clientId, params.oauth.clientSecret)
		: cacheKeyForCredentials(
				process.env.UBER_CLIENT_ID?.trim() ?? "",
				process.env.UBER_CLIENT_SECRET?.trim() ?? "",
			);

	const customerId = params.customerId?.trim() || process.env.UBER_CUSTOMER_ID?.trim() || "";
	const url = customerId
		? `https://api.uber.com/v1/customers/${customerId}/delivery_estimates`
		: UBER_ESTIMATES_URL;

	const currency = params.currencyCode.trim().toUpperCase() || "CLP";
	const dropoff_address: Record<string, unknown> = {
		location: {
			latitude: params.dropoffLat,
			longitude: params.dropoffLng,
		},
	};
	if (params.formattedAddress && params.formattedAddress.trim().length >= 4) {
		dropoff_address.formatted_address = params.formattedAddress.trim().slice(0, 500);
	}

	const payload: Record<string, unknown> = {
		pickup: { store_id: params.storeId.trim() },
		dropoff_address,
		pickup_times: [0],
		order_summary: {
			currency_code: currency,
			order_value: toUberMinorUnits(params.subtotalMajor, currency),
		},
	};

	// Si es el endpoint corporativo de Direct, a veces prefiere campos planos en la raíz.
	if (customerId) {
		payload.currency_code = currency;
		payload.order_value = toUberMinorUnits(params.subtotalMajor, currency);
	}

	let res: Response;
	try {
		res = await fetch(url, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${tokenRes.accessToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		});
	} catch {
		return { ok: false, message: "No se pudo contactar a Uber (cotización)." };
	}

	const j = (await res.json().catch(() => ({}))) as Record<string, unknown>;
	if (!res.ok) {
		if (res.status === 401) {
			tokenCacheByKey.delete(oauthKey);
		}
		const msg =
			typeof j.message === "string"
				? j.message
				: typeof j.error === "string"
					? j.error
					: `Uber rechazó la cotización (${res.status}).`;
		return { ok: false, message: msg, httpStatus: res.status };
	}

	const estimateId = typeof j.estimate_id === "string" ? j.estimate_id.trim() : "";
	const estimates = Array.isArray(j.estimates) ? j.estimates : [];
	const first = estimates[0] as Record<string, unknown> | undefined;
	const feeObj =
		first && typeof first.delivery_fee === "object" && first.delivery_fee !== null
			? (first.delivery_fee as Record<string, unknown>)
			: null;
	const totalMinor = feeObj != null ? Number(feeObj.total) : NaN;
	const feeCurrency =
		typeof feeObj?.currency_code === "string"
			? feeObj.currency_code.trim().toUpperCase()
			: currency;

	if (!estimateId || !Number.isFinite(totalMinor) || totalMinor < 0) {
		return { ok: false, message: "Respuesta de cotización Uber incompleta." };
	}

	return {
		ok: true,
		estimateId,
		feeMajor: fromUberMinorUnits(totalMinor, feeCurrency),
		currencyCode: feeCurrency,
	};
}
