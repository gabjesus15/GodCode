/**
 * Contrato JSON: `public.branches.delivery_settings` (JSONB por sucursal).
 * Claves en camelCase al guardar desde el panel.
 */

export const DELIVERY_MAX_PRICE_PER_KM = 500_000;
export const DELIVERY_MAX_BASE_FEE = 10_000_000;
export const DELIVERY_MAX_FEE_CAP = 50_000_000;
export const DELIVERY_MAX_KM = 500;
/** Máximo de anillos por sucursal en `delivery_settings.zones`. */
export const DELIVERY_MAX_ZONES = 12;
/** Zonas por nombre (barrio, comuna, sector) con tarifa fija — el cliente elige en checkout. */
export const DELIVERY_MAX_NAMED_AREAS = 40;
/** Alias por fila para matching con geocodificación. */
export const DELIVERY_MAX_ALIASES_PER_AREA = 8;

/** Cómo cotiza la sucursal cuando hay zonas por nombre configuradas (o distancia o proveedor externo). */
export type DeliveryPricingStrategy = "distance" | "named_areas" | "external";

/** Proveedor cuando `deliveryPricingStrategy === "external"`. */
export type ExternalDeliveryProvider = "uber_direct";

/** Si `named_areas`: lista manual o inferencia desde dirección (servidor). */
export type NamedAreaResolution = "manual_select" | "address_matched";

/** Anillo por distancia desde el local: si el envío cae dentro del radio, tarifa fija. */
export type DeliveryZoneNormalized = {
	id: string;
	radiusKm: number;
	feeFlat: number;
};

export type DeliveryNamedArea = {
	id: string;
	name: string;
	feeFlat: number;
	/** Nombres alternativos para matching con dirección (geocoding). */
	aliases?: string[];
};

export type DeliverySettingsNormalized = {
	enabled: boolean;
	/**
	 * `named_areas`: usa `namedAreas` + `namedAreaResolution`.
	 * `distance`: usa km desde el local (`zones`, `pricePerKm`, `baseFee`).
	 * `external`: cotización vía proveedor (p. ej. Uber Direct); ver `externalDeliveryProvider`.
	 */
	deliveryPricingStrategy: DeliveryPricingStrategy;
	/** Solo aplica con estrategia `external`. */
	externalDeliveryProvider: ExternalDeliveryProvider | null;
	/** Store ID de Uber Direct ligado al local (requerido para cotizar). */
	uberDirectStoreId: string | null;
	/**
	 * Si es false, el storefront muestra texto (`externalDeliveryDisplayText`) sin monto fijo;
	 * el envío se cotiza/negocia con la tienda (fee 0 en total).
	 */
	showExternalDeliveryFeeAmount: boolean;
	/** Texto cuando no se muestra monto de envío al cliente. */
	externalDeliveryDisplayText: string;
	namedAreaResolution: NamedAreaResolution;
	pricePerKm: number;
	baseFee: number;
	minFee: number | null;
	maxFee: number | null;
	maxDeliveryKm: number | null;
	freeDeliveryFromSubtotal: number | null;
	minOrderSubtotal: number | null;
	customerNotes: string;
	zones: DeliveryZoneNormalized[];
	namedAreas: DeliveryNamedArea[];
	/**
	 * Claves de método (`payment_methods` de sucursal) permitidas solo en delivery.
	 * `null` = sin restricción extra (todos los activos de la sucursal).
	 * `[]` = ningún método pasa el filtro (checkout sin opciones).
	 */
	allowedPaymentMethodsForDelivery: string[] | null;
};

export type DeliverySettingsPublic = DeliverySettingsNormalized;

const DEFAULTS: DeliverySettingsNormalized = {
	enabled: true,
	deliveryPricingStrategy: "distance",
	externalDeliveryProvider: null,
	uberDirectStoreId: null,
	showExternalDeliveryFeeAmount: true,
	externalDeliveryDisplayText: "Consultar con la tienda",
	namedAreaResolution: "manual_select",
	pricePerKm: 0,
	baseFee: 0,
	minFee: null,
	maxFee: null,
	maxDeliveryKm: null,
	freeDeliveryFromSubtotal: null,
	minOrderSubtotal: null,
	customerNotes: "",
	zones: [],
	namedAreas: [],
	allowedPaymentMethodsForDelivery: null,
};

function clampNonNeg(n: number, max: number): number {
	if (!Number.isFinite(n) || n < 0) return 0;
	return Math.min(max, n);
}

function parseOptionalCap(raw: unknown): number | null {
	if (raw === null || raw === undefined || raw === "") return null;
	const n = Number(raw);
	if (!Number.isFinite(n) || n < 0) return null;
	return Math.min(DELIVERY_MAX_FEE_CAP, n);
}

function parseBool(raw: unknown, defaultVal: boolean): boolean {
	if (typeof raw === "boolean") return raw;
	return defaultVal;
}

function parseNotes(raw: unknown): string {
	if (typeof raw !== "string") return "";
	return raw.trim().slice(0, 2000);
}

/** Claves internas que no deben persistir en cliente público (panel admin). */
const STAFF_ONLY_DELIVERY_KEYS = [
	"trustedDriverWhatsApp",
	"trusted_driver_whatsapp",
	"driverWhatsAppInternal",
	"driver_whatsapp_internal",
] as const;

/**
 * Quita datos solo personal/repartidor del JSON de `delivery_settings` antes de usarlo en tienda pública.
 */
export function stripStaffOnlyDeliverySettings(raw: unknown): unknown {
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
	const o = { ...(raw as Record<string, unknown>) };
	for (const k of STAFF_ONLY_DELIVERY_KEYS) {
		delete o[k];
	}
	return o;
}

function parseAllowedPaymentMethodsForDelivery(raw: unknown): string[] | null {
	if (raw === null || raw === undefined) return null;
	if (!Array.isArray(raw)) return null;
	const out: string[] = [];
	const canonical = (value: string): string[] => {
		const k = value.trim().toLowerCase().replace(/-/g, "_");
		// Alias históricos del panel/admin hacia claves reales de checkout.
		if (k === "tienda" || k === "presencial" || k === "cash_on_delivery") {
			// `tienda` representa pago presencial en efectivo.
			// `tarjeta` se controla con su propia clave/chip.
			return ["efectivo"];
		}
		if (k === "transferencia") {
			return ["transferencia_bancaria"];
		}
		return [k];
	};
	for (const x of raw) {
		if (typeof x !== "string") continue;
		const keys = canonical(x).map((k) => k.slice(0, 48)).filter(Boolean);
		for (const k of keys) {
			if (!out.includes(k)) out.push(k);
			if (out.length >= 32) break;
		}
		if (out.length >= 32) break;
	}
	// Ojo: `[]` es un estado válido (significa "no permitir ninguno").
	return out;
}

function parseZones(raw: unknown): DeliveryZoneNormalized[] {
	if (!Array.isArray(raw)) return [];
	const out: DeliveryZoneNormalized[] = [];
	for (let i = 0; i < raw.length && out.length < DELIVERY_MAX_ZONES; i++) {
		const row = raw[i];
		if (!row || typeof row !== "object" || Array.isArray(row)) continue;
		const o = row as Record<string, unknown>;
		const radius = Number(o.radiusKm ?? o.radius_km ?? o.radius);
		const fee = Number(o.feeFlat ?? o.fee_flat ?? o.fee);
		if (!Number.isFinite(radius) || radius <= 0 || radius > DELIVERY_MAX_KM) continue;
		if (!Number.isFinite(fee) || fee < 0) continue;
		const idRaw = o.id;
		const id =
			typeof idRaw === "string" && idRaw.trim()
				? idRaw.trim().slice(0, 64)
				: `z${out.length}`;
		out.push({
			id,
			radiusKm: Math.min(DELIVERY_MAX_KM, radius),
			feeFlat: Math.min(DELIVERY_MAX_FEE_CAP, fee),
		});
	}
	out.sort((a, b) => a.radiusKm - b.radiusKm);
	return out;
}

function parseNamedAreas(raw: unknown): DeliveryNamedArea[] {
	if (!Array.isArray(raw)) return [];
	const out: DeliveryNamedArea[] = [];
	for (let i = 0; i < raw.length && out.length < DELIVERY_MAX_NAMED_AREAS; i++) {
		const row = raw[i];
		if (!row || typeof row !== "object" || Array.isArray(row)) continue;
		const o = row as Record<string, unknown>;
		const nameRaw = o.name ?? o.label ?? o.place ?? o.title;
		const name =
			typeof nameRaw === "string"
				? nameRaw.trim().slice(0, 120)
				: "";
		if (!name) continue;
		const fee = Number(o.feeFlat ?? o.fee_flat ?? o.fee ?? o.price);
		if (!Number.isFinite(fee) || fee < 0) continue;
		const idRaw = o.id;
		const id =
			typeof idRaw === "string" && idRaw.trim()
				? idRaw.trim().slice(0, 64)
				: `place_${out.length}_${name.slice(0, 20).replace(/\s+/g, "_")}`;
		const aliasesRaw = o.aliases;
		let aliases: string[] | undefined;
		if (Array.isArray(aliasesRaw)) {
			const al = aliasesRaw
				.filter((x): x is string => typeof x === "string")
				.map((x) => x.trim().slice(0, 80))
				.filter(Boolean)
				.slice(0, DELIVERY_MAX_ALIASES_PER_AREA);
			if (al.length > 0) aliases = al;
		}
		const area: DeliveryNamedArea = {
			id,
			name,
			feeFlat: Math.min(DELIVERY_MAX_FEE_CAP, fee),
		};
		if (aliases) area.aliases = aliases;
		out.push(area);
	}
	return out;
}

function parseDeliveryPricingStrategy(
	raw: unknown,
	namedAreasCount: number,
): DeliveryPricingStrategy {
	const v =
		typeof raw === "string"
			? raw.trim().toLowerCase().replace(/-/g, "_")
			: "";
	if (v === "external" || v === "uber" || v === "uber_direct" || v === "provider") {
		return "external";
	}
	if (v === "named_areas" || v === "namedareas") return "named_areas";
	if (v === "distance" || v === "km") return "distance";
	// Migración: JSON antiguo sin clave pero con zonas por nombre
	if (namedAreasCount > 0) return "named_areas";
	// JSON antiguo tipo per_km / tiered_km / fixed → distancia
	return "distance";
}

function parseExternalDeliveryProvider(raw: unknown): ExternalDeliveryProvider | null {
	const v =
		typeof raw === "string"
			? raw.trim().toLowerCase().replace(/-/g, "_")
			: "";
	if (v === "uber_direct" || v === "uber") return "uber_direct";
	return null;
}

function parseUberDirectStoreId(raw: unknown): string | null {
	if (typeof raw !== "string") return null;
	const t = raw.trim();
	return t.length > 0 ? t.slice(0, 128) : null;
}

function parseShowExternalDeliveryFeeAmount(
	raw: unknown,
	defaultVal: boolean,
): boolean {
	if (typeof raw === "boolean") return raw;
	if (raw === "false" || raw === 0) return false;
	if (raw === "true" || raw === 1) return true;
	return defaultVal;
}

function parseNamedAreaResolution(raw: unknown): NamedAreaResolution {
	const v = typeof raw === "string" ? raw.trim().toLowerCase() : "";
	if (v === "address_matched" || v === "address" || v === "auto") {
		return "address_matched";
	}
	return "manual_select";
}

/** Normaliza lectura desde JSONB (camelCase; tolera algunos snake_case). */
export function normalizeDeliverySettings(raw: unknown): DeliverySettingsNormalized {
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
		return { ...DEFAULTS };
	}
	const o = raw as Record<string, unknown>;
	const price =
		o.pricePerKm ??
		o.price_per_km ??
		o.priceperkm ??
		o.per_km;
	const base = o.baseFee ?? o.base_fee;
	const minF = o.minFee ?? o.min_fee;
	const maxF = o.maxFee ?? o.max_fee;
	const maxKm = o.maxDeliveryKm ?? o.max_delivery_km;
	const freeFrom = o.freeDeliveryFromSubtotal ?? o.free_delivery_from_subtotal;
	const minOrder = o.minOrderSubtotal ?? o.min_order_subtotal;
	const notes = o.customerNotes ?? o.customer_notes ?? o.notes ?? o.customer_note;
	const allowedPayRaw =
		o.allowedPaymentMethodsForDelivery ?? o.allowed_payment_methods_for_delivery;
	const zonesRaw = o.zones ?? o.delivery_zones;
	const namedRaw =
		o.namedAreas ?? o.named_areas ?? o.delivery_places ?? o.places;
	const namedParsed = parseNamedAreas(namedRaw);
	const stratRaw =
		o.deliveryPricingStrategy ??
		o.delivery_pricing_strategy ??
		o.pricingStrategy ??
		o.pricing_mode;
	const narRaw =
		o.namedAreaResolution ?? o.named_area_resolution ?? o.namedAreaMatch;
	const extProvRaw =
		o.externalDeliveryProvider ??
		o.external_delivery_provider ??
		o.deliveryProvider ??
		o.delivery_provider;
	const uberStoreRaw =
		o.uberDirectStoreId ?? o.uber_direct_store_id ?? o.uberStoreId ?? o.uber_store_id;
	const showExtFeeRaw =
		o.showExternalDeliveryFeeAmount ??
		o.show_external_delivery_fee_amount ??
		o.showDeliveryFeeAmount ??
		o.show_delivery_fee_amount;
	const extDisplayRaw =
		o.externalDeliveryDisplayText ??
		o.external_delivery_display_text ??
		o.deliveryDisplayText ??
		o.delivery_display_text;

	// Migración: tiers antiguos [{ up_to_km, fee }] → zones (radio = km)
	let zones = parseZones(zonesRaw);
	if (zones.length === 0 && Array.isArray(o.tiers) && o.tiers.length > 0) {
		const tierRows: DeliveryZoneNormalized[] = [];
		for (const row of o.tiers as unknown[]) {
			if (!row || typeof row !== "object" || Array.isArray(row)) continue;
			const tr = row as Record<string, unknown>;
			const up = Number(tr.up_to_km ?? tr.upToKm);
			const fee = Number(tr.fee);
			if (!Number.isFinite(up) || up <= 0 || !Number.isFinite(fee) || fee < 0) continue;
			tierRows.push({
				id: `m${tierRows.length}`,
				radiusKm: Math.min(DELIVERY_MAX_KM, up),
				feeFlat: Math.min(DELIVERY_MAX_FEE_CAP, fee),
			});
		}
		tierRows.sort((a, b) => a.radiusKm - b.radiusKm);
		zones = tierRows;
	}

	const pricePerKm = clampNonNeg(Number(price) || 0, DELIVERY_MAX_PRICE_PER_KM);
	let baseFee = clampNonNeg(Number(base) || 0, DELIVERY_MAX_BASE_FEE);
	const pricingModeLegacy = String(o.pricing_mode ?? "").toLowerCase();
	if (pricingModeLegacy === "fixed") {
		baseFee = clampNonNeg(Number(o.base_fee ?? base) || 0, DELIVERY_MAX_BASE_FEE);
	}

	const deliveryPricingStrategy = parseDeliveryPricingStrategy(
		stratRaw,
		namedParsed.length,
	);
	let externalDeliveryProvider = parseExternalDeliveryProvider(extProvRaw);
	let uberDirectStoreId = parseUberDirectStoreId(uberStoreRaw);
	if (
		deliveryPricingStrategy === "external" &&
		externalDeliveryProvider == null
	) {
		externalDeliveryProvider = "uber_direct";
	}
	if (deliveryPricingStrategy !== "external") {
		externalDeliveryProvider = null;
		uberDirectStoreId = null;
	}

	return {
		enabled: parseBool(o.enabled, DEFAULTS.enabled),
		deliveryPricingStrategy,
		externalDeliveryProvider,
		uberDirectStoreId,
		showExternalDeliveryFeeAmount: parseShowExternalDeliveryFeeAmount(
			showExtFeeRaw,
			DEFAULTS.showExternalDeliveryFeeAmount,
		),
		externalDeliveryDisplayText: (() => {
			if (typeof extDisplayRaw === "string" && extDisplayRaw.trim()) {
				return extDisplayRaw.trim().slice(0, 500);
			}
			return DEFAULTS.externalDeliveryDisplayText;
		})(),
		namedAreaResolution: parseNamedAreaResolution(narRaw),
		pricePerKm,
		baseFee,
		minFee: parseOptionalCap(minF),
		maxFee: parseOptionalCap(maxF),
		zones,
		namedAreas: namedParsed,
		maxDeliveryKm: (() => {
			const v = maxKm;
			if (v === null || v === undefined || v === "") return null;
			const n = Number(v);
			if (!Number.isFinite(n) || n <= 0) return null;
			return Math.min(DELIVERY_MAX_KM, n);
		})(),
		freeDeliveryFromSubtotal: (() => {
			const v = freeFrom;
			if (v === null || v === undefined || v === "") return null;
			const n = Number(v);
			if (!Number.isFinite(n) || n < 0) return null;
			return Math.min(DELIVERY_MAX_FEE_CAP, n);
		})(),
		minOrderSubtotal: (() => {
			const v = minOrder;
			if (v === null || v === undefined || v === "") return null;
			const n = Number(v);
			if (!Number.isFinite(n) || n < 0) return null;
			return Math.min(DELIVERY_MAX_FEE_CAP, n);
		})(),
		customerNotes: parseNotes(notes),
		allowedPaymentMethodsForDelivery: (() => {
			const p = parseAllowedPaymentMethodsForDelivery(allowedPayRaw);
			if (p === null) return null;
			return p;
		})(),
	};
}

export function deliverySettingsToPublic(
	s: DeliverySettingsNormalized,
): DeliverySettingsPublic {
	return { ...s };
}

/** Merge parcial guardando solo claves conocidas; preserva el resto del JSON previo. */
export function mergeDeliverySettingsJson(
	prev: unknown,
	patch: Partial<Record<string, unknown>>,
): Record<string, unknown> {
	const base =
		prev && typeof prev === "object" && !Array.isArray(prev)
			? { ...(prev as Record<string, unknown>) }
			: {};
	const next = { ...base };

	const assignNum = (
		key: string,
		val: unknown,
		clampMax: number,
		allowNull = false,
	) => {
		if (!(key in patch)) return;
		const v = patch[key];
		if (allowNull && (v === null || v === "")) {
			next[key] = null;
			return;
		}
		const n = Number(v);
		if (!Number.isFinite(n)) return;
		next[key] = Math.min(clampMax, Math.max(0, n));
	};

	if ("enabled" in patch && typeof patch.enabled === "boolean") {
		next.enabled = patch.enabled;
	}
	assignNum("pricePerKm", patch.pricePerKm, DELIVERY_MAX_PRICE_PER_KM);
	assignNum("baseFee", patch.baseFee, DELIVERY_MAX_BASE_FEE);
	if ("minFee" in patch) {
		const v = patch.minFee;
		if (v === null || v === "") next.minFee = null;
		else assignNum("minFee", v, DELIVERY_MAX_FEE_CAP);
	}
	if ("maxFee" in patch) {
		const v = patch.maxFee;
		if (v === null || v === "") next.maxFee = null;
		else assignNum("maxFee", v, DELIVERY_MAX_FEE_CAP);
	}
	if ("maxDeliveryKm" in patch) {
		const v = patch.maxDeliveryKm;
		if (v === null || v === "") next.maxDeliveryKm = null;
		else {
			const n = Number(v);
			if (Number.isFinite(n) && n > 0) {
				next.maxDeliveryKm = Math.min(DELIVERY_MAX_KM, n);
			}
		}
	}
	if ("freeDeliveryFromSubtotal" in patch) {
		const v = patch.freeDeliveryFromSubtotal;
		if (v === null || v === "") next.freeDeliveryFromSubtotal = null;
		else assignNum("freeDeliveryFromSubtotal", v, DELIVERY_MAX_FEE_CAP);
	}
	if ("minOrderSubtotal" in patch) {
		const v = patch.minOrderSubtotal;
		if (v === null || v === "") next.minOrderSubtotal = null;
		else assignNum("minOrderSubtotal", v, DELIVERY_MAX_FEE_CAP);
	}
	if ("customerNotes" in patch && typeof patch.customerNotes === "string") {
		next.customerNotes = parseNotes(patch.customerNotes);
	}
	if ("zones" in patch) {
		next.zones = parseZones(patch.zones);
	}
	if ("namedAreas" in patch) {
		next.namedAreas = parseNamedAreas(patch.namedAreas);
	}
	if ("deliveryPricingStrategy" in patch) {
		const v = patch.deliveryPricingStrategy;
		if (v === "named_areas" || v === "distance" || v === "external") {
			next.deliveryPricingStrategy = v;
		}
	}
	if ("externalDeliveryProvider" in patch) {
		const v = patch.externalDeliveryProvider;
		if (v === "uber_direct" || v === null) {
			next.externalDeliveryProvider = v;
		}
	}
	if ("uberDirectStoreId" in patch) {
		const v = patch.uberDirectStoreId;
		if (v === null) next.uberDirectStoreId = null;
		else if (typeof v === "string") next.uberDirectStoreId = v.trim().slice(0, 128);
	}
	if ("showExternalDeliveryFeeAmount" in patch) {
		const v = patch.showExternalDeliveryFeeAmount;
		if (typeof v === "boolean") next.showExternalDeliveryFeeAmount = v;
	}
	if ("externalDeliveryDisplayText" in patch && typeof patch.externalDeliveryDisplayText === "string") {
		next.externalDeliveryDisplayText = parseNotes(patch.externalDeliveryDisplayText).slice(
			0,
			500,
		);
	}
	if ("namedAreaResolution" in patch) {
		const v = patch.namedAreaResolution;
		if (v === "manual_select" || v === "address_matched") {
			next.namedAreaResolution = v;
		}
	}
	if ("allowedPaymentMethodsForDelivery" in patch) {
		const v = patch.allowedPaymentMethodsForDelivery;
		if (v === null || v === undefined) {
			next.allowedPaymentMethodsForDelivery = null;
		} else if (Array.isArray(v)) {
			const parsed = parseAllowedPaymentMethodsForDelivery(v);
			next.allowedPaymentMethodsForDelivery =
				parsed && parsed.length > 0 ? parsed : null;
		}
	}

	if (
		typeof next.minFee === "number" &&
		typeof next.maxFee === "number" &&
		next.minFee > next.maxFee
	) {
		const t = next.minFee;
		next.minFee = next.maxFee;
		next.maxFee = t;
	}

	return next;
}

/** Modo efectivo para UI: `named` solo si estrategia + lista no vacía; `external` explícito. */
export function effectiveDeliveryPricingMode(
	s: DeliverySettingsNormalized,
): "named" | "distance" | "external" {
	if (
		s.deliveryPricingStrategy === "external" &&
		s.externalDeliveryProvider === "uber_direct"
	) {
		return "external";
	}
	if (
		s.deliveryPricingStrategy === "named_areas" &&
		s.namedAreas.length > 0
	) {
		return "named";
	}
	return "distance";
}

export type ComputeDeliveryFeeOptions = {
	/** Si la sucursal tiene `namedAreas`, debe coincidir con un id configurado. */
	namedAreaId?: string | null;
};

/**
 * Códigos de error en `fee`: -1 distancia máxima, -2 pedido mínimo, -3 falta zona por nombre, -4 zona inválida.
 */
export function computeDeliveryFee(
	settings: DeliverySettingsNormalized,
	deliveryKm: number,
	itemsSubtotal: number,
	options?: ComputeDeliveryFeeOptions,
): { fee: number; waivedFreeShipping: boolean } {
	if (!settings.enabled) {
		return { fee: 0, waivedFreeShipping: false };
	}

	if (effectiveDeliveryPricingMode(settings) === "external") {
		return { fee: 0, waivedFreeShipping: false };
	}

	const namedId =
		options?.namedAreaId != null && String(options.namedAreaId).trim() !== ""
			? String(options.namedAreaId).trim()
			: null;
	const areas = settings.namedAreas;
	const useNamed =
		effectiveDeliveryPricingMode(settings) === "named" && areas.length > 0;

	if (useNamed) {
		if (!namedId) {
			return { fee: -3, waivedFreeShipping: false };
		}
		const area = areas.find((a) => a.id === namedId);
		if (!area) {
			return { fee: -4, waivedFreeShipping: false };
		}
		if (
			settings.minOrderSubtotal != null &&
			itemsSubtotal + 1e-9 < settings.minOrderSubtotal
		) {
			return { fee: -2, waivedFreeShipping: false };
		}
		if (
			settings.freeDeliveryFromSubtotal != null &&
			itemsSubtotal + 1e-9 >= settings.freeDeliveryFromSubtotal
		) {
			return { fee: 0, waivedFreeShipping: true };
		}
		let fee = area.feeFlat;
		if (settings.minFee != null) fee = Math.max(fee, settings.minFee);
		if (settings.maxFee != null) fee = Math.min(fee, settings.maxFee);
		if (!Number.isFinite(fee) || fee < 0) fee = 0;
		return { fee: Math.round(fee * 100) / 100, waivedFreeShipping: false };
	}

	const km = Number(deliveryKm);
	const safeKm = Number.isFinite(km) && km >= 0 ? km : 0;
	if (
		settings.maxDeliveryKm != null &&
		safeKm > settings.maxDeliveryKm + 1e-9
	) {
		return { fee: -1, waivedFreeShipping: false };
	}
	if (
		settings.minOrderSubtotal != null &&
		itemsSubtotal + 1e-9 < settings.minOrderSubtotal
	) {
		return { fee: -2, waivedFreeShipping: false };
	}
	if (
		settings.freeDeliveryFromSubtotal != null &&
		itemsSubtotal + 1e-9 >= settings.freeDeliveryFromSubtotal
	) {
		return { fee: 0, waivedFreeShipping: true };
	}
	let fee: number;
	const zones = settings.zones;
	if (zones && zones.length > 0) {
		let flat: number | null = null;
		for (const z of zones) {
			if (safeKm <= z.radiusKm + 1e-9) {
				flat = z.feeFlat;
				break;
			}
		}
		fee =
			flat != null
				? flat
				: settings.baseFee + safeKm * settings.pricePerKm;
	} else {
		fee = settings.baseFee + safeKm * settings.pricePerKm;
	}
	if (settings.minFee != null) fee = Math.max(fee, settings.minFee);
	if (settings.maxFee != null) fee = Math.min(fee, settings.maxFee);
	if (!Number.isFinite(fee) || fee < 0) fee = 0;
	return { fee: Math.round(fee * 100) / 100, waivedFreeShipping: false };
}

export type CheckoutFulfillment = "pickup" | "delivery";

/**
 * Lista de métodos de pago a mostrar en checkout: activos en sucursal ∩ restricción delivery (si aplica).
 */
export function resolveDeliveryPaymentMethodsForCheckout(
	branchPaymentMethods: string[],
	settings: DeliverySettingsNormalized,
	fulfillment: CheckoutFulfillment,
): string[] {
	const base = Array.isArray(branchPaymentMethods)
		? branchPaymentMethods.filter((m) => typeof m === "string" && m.trim())
		: [];
	if (fulfillment !== "delivery" || !settings.enabled) {
		return base;
	}
	const list = settings.allowedPaymentMethodsForDelivery;
	if (list == null) {
		return base;
	}
	const allowed = new Set(list);
	return base.filter((m) => allowed.has(m));
}

/** Valida si el método elegido está permitido para delivery según reglas de sucursal. */
export function isOrderPaymentAllowedForDelivery(
	methodKey: string,
	settings: DeliverySettingsNormalized,
): boolean {
	const list = settings.allowedPaymentMethodsForDelivery;
	if (list == null) {
		return true;
	}
	return list.includes(methodKey);
}

/** Suma ítems del pedido (precio efectivo × cantidad). */
export function orderItemsSubtotalFromPayload(
	items: Array<{ price?: unknown; quantity?: unknown; extras_total?: unknown }>,
): number {
	if (!Array.isArray(items)) return 0;
	let sum = 0;
	for (const it of items) {
		const p = Number(it.price) || 0;
		const extras = Math.max(0, Number(it.extras_total) || 0);
		const q = Math.max(1, Number(it.quantity) || 1);
		sum += (p + extras) * q;
	}
	return Math.round(sum);
}
