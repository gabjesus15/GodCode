"use client";

import { useCallback, useEffect, useState } from "react";

import { gpsLocationSource, type DeliveryLocationSource } from "@/lib/delivery/delivery-location";
import { TENANT_UI_CONFIG } from "@/lib/tenant/config/tenant-ui-config";
import {
	joinAddressLine,
	joinStreetAndNumber,
	splitStreetAndNumber,
} from "../utils/street-number";

export type AddressPrecision = "exact" | "approx" | null;

type GeocodeHit = { lat: number; lng: number; precision?: "exact" | "approx" };

export type DeliveryAddressBranch = {
	id?: string | null;
	origin_lat?: number | null;
	origin_lng?: number | null;
};

export type UseDeliveryAddressParams = {
	/** Solo geocodifica cuando el paso de delivery con mapa está a la vista. */
	active: boolean;
	branch: DeliveryAddressBranch | null | undefined;
	line1: string;
	area: string;
	setLine1: (value: string) => void;
	setArea: (value: string) => void;
	setCoords: (lat: number | null, lng: number | null, source?: DeliveryLocationSource | null) => void;
	t: (key: string) => string;
};

export type DeliveryAddressController = {
	street: string;
	number: string;
	precision: AddressPrecision;
	geoHint: string | null;
	geocoding: boolean;
	onStreetChange: (value: string) => void;
	onNumberChange: (value: string) => void;
	onAreaChange: (value: string) => void;
	requestGeolocation: () => void;
	/** Buscando el GPS (para el estado del botón). */
	locating: boolean;
	/** El cliente movió el mapa hasta su puerta: ese punto manda. */
	pinCoords: (lat: number, lng: number) => void;
};

function buildSearchParams(
	query: string,
	area: string,
	branch: DeliveryAddressBranch | null | undefined,
): URLSearchParams {
	const params = new URLSearchParams({ q: query });
	if (area.length >= 2) params.set("communeHint", area);
	if (branch?.id) params.set("branchId", branch.id);
	if (branch?.origin_lat != null && branch?.origin_lng != null) {
		const lat = Number(branch.origin_lat);
		const lng = Number(branch.origin_lng);
		if (Number.isFinite(lat) && Number.isFinite(lng)) {
			params.set("nearLat", String(lat));
			params.set("nearLon", String(lng));
		}
	}
	return params;
}

/**
 * Dirección de entrega en modo mapa: tres campos (zona, calle, número) que se
 * funden en `deliveryLine1`, geocodificación silenciosa al terminar de escribir
 * y GPS con geocodificación inversa. Sin autocompletado visual: se decidió no
 * mostrar sugerencias, así que aquí no queda rastro de esa mecánica.
 */
export function useDeliveryAddress(params: UseDeliveryAddressParams): DeliveryAddressController {
	const { active, branch, line1, area, setLine1, setArea, setCoords, t } = params;

	// Calle y número se derivan de `line1` salvo mientras el cliente los edita:
	// el borrador solo vale si sigue coincidiendo con la línea guardada.
	const [draft, setDraft] = useState<{ street: string; number: string; line1: string } | null>(
		null,
	);
	const fields = draft && draft.line1 === line1 ? draft : splitStreetAndNumber(line1);

	const [precision, setPrecision] = useState<AddressPrecision>(null);
	const [geoHint, setGeoHint] = useState<string | null>(null);
	const [locating, setLocating] = useState(false);
	const [debounced, setDebounced] = useState({ line1: "", area: "" });
	/** Última dirección geocodificada (o descartada), para saber si hay una búsqueda pendiente. */
	const [settledKey, setSettledKey] = useState("");
	/** Dirección escrita por el GPS: no volver a geocodificarla, pisaría las coordenadas exactas. */
	const [skipKey, setSkipKey] = useState("");

	useEffect(() => {
		const timer = window.setTimeout(() => {
			setDebounced({ line1: line1.trim(), area: area.trim() });
		}, TENANT_UI_CONFIG.cartGeocodeDebounceMs);
		return () => window.clearTimeout(timer);
	}, [line1, area]);

	const geocodeKey =
		active &&
		debounced.line1.length >= 4 &&
		debounced.area.length >= 2 &&
		/\d/.test(debounced.line1)
			? joinAddressLine(debounced.line1, debounced.area)
			: "";
	const geocoding = geocodeKey !== "" && settledKey !== geocodeKey && skipKey !== geocodeKey;

	useEffect(() => {
		if (!geocodeKey || skipKey === geocodeKey || settledKey === geocodeKey) return;
		const controller = new AbortController();
		fetch(`/api/geo/address-search?${buildSearchParams(geocodeKey, debounced.area, branch)}`, {
			signal: controller.signal,
		})
			.then((response) => response.json())
			.then((payload: { results?: GeocodeHit[] }) => {
				const first = Array.isArray(payload.results) ? payload.results[0] : undefined;
				if (first) {
					// Sin número de casa encontrado, el punto cae en el centro de la calle.
					const exact = first.precision === "exact";
					setCoords(first.lat, first.lng, exact ? "address" : "address_approx");
					setPrecision(exact ? "exact" : "approx");
				}
				setSettledKey(geocodeKey);
			})
			.catch(() => {
				if (!controller.signal.aborted) setSettledKey(geocodeKey);
			});
		return () => controller.abort();
	}, [geocodeKey, skipKey, settledKey, debounced.area, branch, setCoords]);

	const applyStreet = useCallback(
		(street: string, number: string) => {
			const nextLine1 = joinStreetAndNumber(street, number);
			setDraft({ street, number, line1: nextLine1 });
			setPrecision(null);
			setSkipKey("");
			setLine1(nextLine1);
		},
		[setLine1],
	);

	const onStreetChange = useCallback(
		(value: string) => applyStreet(value, fields.number),
		[applyStreet, fields.number],
	);
	const onNumberChange = useCallback(
		(value: string) => applyStreet(fields.street, value),
		[applyStreet, fields.street],
	);
	const onAreaChange = useCallback(
		(value: string) => {
			setPrecision(null);
			setSkipKey("");
			setArea(value);
		},
		[setArea],
	);

	const requestGeolocation = useCallback(() => {
		if (typeof navigator === "undefined" || !navigator.geolocation) {
			setGeoHint(t("delivery.geoNotAvailable"));
			return;
		}
		if (typeof window !== "undefined" && !window.isSecureContext) {
			setGeoHint(t("delivery.geoNeedsHttps"));
			return;
		}
		setGeoHint(t("delivery.searchingLocation"));
		setLocating(true);
		navigator.geolocation.getCurrentPosition(
			(position) => {
				setLocating(false);
				const { latitude, longitude, accuracy } = position.coords;
				/* En un computador el "GPS" suele salir de la IP o del wifi y puede errar
				   por kilómetros: se marca aproximado para pedir que ajuste el punto. */
				const source = gpsLocationSource(accuracy);
				setCoords(latitude, longitude, source);
				setPrecision(source === "gps" ? "exact" : "approx");
				setGeoHint(t("delivery.searchingAddress"));
				fetch(
					`/api/geo/reverse-geocode?lat=${encodeURIComponent(String(latitude))}&lng=${encodeURIComponent(String(longitude))}`,
				)
					.then((response) => (response.ok ? response.json() : null))
					.then((data: { line1?: string; commune?: string } | null) => {
						const nextLine1 = data?.line1?.trim() ?? "";
						const nextArea = data?.commune?.trim() ?? "";
						if (nextLine1) setLine1(nextLine1);
						if (nextArea) setArea(nextArea);
						setSkipKey(joinAddressLine(nextLine1, nextArea));
						setGeoHint(t("delivery.locationSavedReview"));
					})
					.catch(() => {
						setGeoHint(t("delivery.locationSavedCompleteManually"));
					});
			},
			(error) => {
				setLocating(false);
				if (error.code === error.PERMISSION_DENIED) {
					setGeoHint(t("delivery.permissionDenied"));
				} else if (error.code === error.POSITION_UNAVAILABLE) {
					setGeoHint(t("delivery.noSignal"));
				} else if (error.code === error.TIMEOUT) {
					setGeoHint(t("delivery.timeout"));
				} else {
					setGeoHint(t("delivery.cannotReadLocation"));
				}
			},
			{ enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
		);
	}, [setArea, setCoords, setLine1, t]);

	const pinCoords = useCallback(
		(lat: number, lng: number) => {
			setCoords(lat, lng, "pin");
			setPrecision("exact");
			// La dirección escrita no cambió: que no se vuelva a geocodificar y pise el punto.
			setSkipKey(geocodeKey || joinAddressLine(line1.trim(), area.trim()));
		},
		[area, geocodeKey, line1, setCoords],
	);

	return {
		street: fields.street,
		number: fields.number,
		precision,
		geoHint,
		geocoding,
		onStreetChange,
		onNumberChange,
		onAreaChange,
		requestGeolocation,
		locating,
		pinCoords,
	};
}
