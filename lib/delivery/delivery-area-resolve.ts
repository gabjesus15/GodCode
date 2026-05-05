/**
 * Resolución de dirección → zona con nombre (namedAreas) vía OpenStreetMap/Nominatim.
 * Usado en APIs públicas con rate limit; la lógica de tarifa sigue en computeDeliveryFee.
 */

import {
	openstreetForwardGeocodeFeatures,
	openstreetSearchAddressHits,
	type AddressGeocodeHit,
} from "./openstreet-geocoding";
import {
	computeDeliveryFee,
	type DeliveryNamedArea,
	type DeliverySettingsNormalized,
} from "./delivery-settings";

const MIN_ADDRESS_LEN = 8;

export type ResolveNamedAreaResult =
	| {
			ok: true;
			namedAreaId: string;
			label: string;
			fee: number;
			waivedFreeShipping: boolean;
	  }
	| {
			ok: false;
			code: "short_address" | "geocode_failed" | "no_match" | "ambiguous";
			message: string;
	  };

/** Alias histórico (checkout / APIs). */
export type PhotonAddressHit = AddressGeocodeHit;

function norm(s: string): string {
	return s
		.normalize("NFD")
		.replace(/\p{M}/gu, "")
		.toLowerCase()
		.replace(/[^a-z0-9áéíóúüñ\s]/gi, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function collectGeocodeStrings(props: Record<string, unknown>): string[] {
	const keys = [
		"name",
		"city",
		"district",
		"locality",
		"county",
		"state",
		"country",
	] as const;
	const out: string[] = [];
	for (const k of keys) {
		const v = props[k];
		if (typeof v === "string" && v.trim()) out.push(v.trim());
	}
	return out;
}

function areaSearchStrings(area: DeliveryNamedArea): string[] {
	const out = [area.name];
	const aliases = area.aliases;
	if (Array.isArray(aliases)) {
		for (const a of aliases) {
			if (typeof a === "string" && a.trim()) out.push(a.trim());
		}
	}
	return out;
}

/** Puntuación simple: coincidencia por inclusión o token compartido. */
function scoreAreaAgainstBlob(
	area: DeliveryNamedArea,
	blobNorm: string,
	tokens: Set<string>,
): number {
	let best = 0;
	for (const raw of areaSearchStrings(area)) {
		const n = norm(raw);
		if (!n) continue;
		if (blobNorm.includes(n) || n.includes(blobNorm)) {
			best = Math.max(best, 100 + n.length);
			continue;
		}
		const areaTokens = new Set(n.split(" ").filter((t) => t.length > 2));
		let overlap = 0;
		for (const t of areaTokens) {
			if (tokens.has(t)) overlap += 10;
		}
		best = Math.max(best, overlap);
	}
	return best;
}

/**
 * Intenta mapear una dirección en texto a una fila de namedAreas y calcular tarifa.
 */
export async function resolveNamedAreaFromAddress(
	settings: DeliverySettingsNormalized,
	addressText: string,
	itemsSubtotal: number,
): Promise<ResolveNamedAreaResult> {
	const areas = settings.namedAreas;
	if (!areas.length) {
		return {
			ok: false,
			code: "no_match",
			message: "Este local no tiene zonas por nombre configuradas.",
		};
	}

	const trimmed = addressText.trim();
	if (trimmed.length < MIN_ADDRESS_LEN) {
		return {
			ok: false,
			code: "short_address",
			message: "Escribe una dirección más completa (calle, número y comuna o ciudad).",
		};
	}

	const geoPropsList = await openstreetForwardGeocodeFeatures(trimmed);
	if (!geoPropsList || geoPropsList.length === 0) {
		return {
			ok: false,
			code: "geocode_failed",
			message: "No pudimos ubicar esa dirección. Revisa e intenta de nuevo.",
		};
	}

	const allStrings: string[] = [];
	for (const props of geoPropsList) {
		allStrings.push(...collectGeocodeStrings(props));
	}
	const blob = allStrings.join(" · ");
	const blobNorm = norm(blob);
	const tokenSet = new Set(blobNorm.split(" ").filter((x) => x.length > 2));

	let bestScore = 0;
	const scored: { area: DeliveryNamedArea; s: number }[] = [];
	for (const area of areas) {
		const s = scoreAreaAgainstBlob(area, blobNorm, tokenSet);
		scored.push({ area, s });
		bestScore = Math.max(bestScore, s);
	}

	const winners = scored.filter((x) => x.s === bestScore && x.s >= 10);
	if (winners.length === 0) {
		return {
			ok: false,
			code: "no_match",
			message:
				"No reconocemos esa zona en la lista del local. Elige otra dirección o contacta al local.",
		};
	}
	if (winners.length > 1) {
		return {
			ok: false,
			code: "ambiguous",
			message:
				"Hay varias zonas posibles. Añade más detalle en la dirección (comuna o ciudad).",
		};
	}

	const bestArea = winners[0].area;

	const r = computeDeliveryFee(settings, 0, itemsSubtotal, {
		namedAreaId: bestArea.id,
	});
	if (r.fee < 0) {
		const msg =
			r.fee === -2
				? "El pedido no alcanza el mínimo para envío a esa zona."
				: "No se pudo calcular el envío para esa zona.";
		return { ok: false, code: "no_match", message: msg };
	}

	return {
		ok: true,
		namedAreaId: bestArea.id,
		label: bestArea.name,
		fee: r.fee,
		waivedFreeShipping: r.waivedFreeShipping,
	};
}

/**
 * Sugerencias de dirección para el checkout (OpenStreetMap/Nominatim).
 */
export const photonSearchAddressHits = openstreetSearchAddressHits;
