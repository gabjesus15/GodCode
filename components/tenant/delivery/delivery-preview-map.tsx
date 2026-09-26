"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ArrowUpRight, Check, Minus, Move, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { isValidLatLng } from "@/lib/geo/geo";

type DeliveryPreviewMapProps = {
	lat: number | null | undefined;
	lng: number | null | undefined;
	/**
	 * Permite ajustar el punto: el cliente mueve el mapa hasta su puerta y
	 * confirma. Sin esto el mapa es solo de lectura.
	 */
	onAdjust?: (lat: number, lng: number) => void;
};

const ZOOM = 16;

/**
 * Vista del punto de entrega. El pin no es un marcador de Leaflet sino una pieza
 * fija en el centro: al ajustar se mueve el mapa, no el pin (como en las apps de
 * delivery), y el punto elegido es siempre el centro.
 */
export function DeliveryPreviewMap({ lat, lng, onAdjust }: DeliveryPreviewMapProps) {
	const t = useTranslations("tenant.cart.modal.previewMap");
	const locale = useLocale();
	const containerRef = useRef<HTMLDivElement>(null);
	const mapRef = useRef<L.Map | null>(null);
	const originRef = useRef<L.LatLng | null>(null);
	const [adjusting, setAdjusting] = useState(false);
	const [moving, setMoving] = useState(false);

	// `isValidLatLng` usa `Number(...)` y `Number(null) === 0`: null pasaría el filtro.
	const valid = lat != null && lng != null && isValidLatLng(lat, lng);

	// Solo al desmontar: recrear el mapa en cada punto nuevo perdía el zoom y parpadeaba.
	useEffect(
		() => () => {
			mapRef.current?.remove();
			mapRef.current = null;
		},
		[],
	);

	// Crea el mapa la primera vez (o si el contenedor cambió) y si no, lo recentra.
	useEffect(() => {
		const container = containerRef.current;
		if (!valid || !container || adjusting) return;
		const point: L.LatLngTuple = [lat as number, lng as number];

		if (mapRef.current && mapRef.current.getContainer() !== container) {
			mapRef.current.remove();
			mapRef.current = null;
		}
		if (!mapRef.current) {
			const map = L.map(container, {
				zoomControl: false,
				attributionControl: true,
				dragging: false,
				touchZoom: false,
				doubleClickZoom: false,
				scrollWheelZoom: false,
				boxZoom: false,
				keyboard: false,
				zoomSnap: 0.5,
			}).setView(point, ZOOM);
			map.attributionControl.setPrefix(false);
			L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
				attribution:
					'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
				maxZoom: 19,
			}).addTo(map);
			map.on("movestart", () => setMoving(true));
			map.on("moveend", () => setMoving(false));
			mapRef.current = map;
			// Leaflet mide el contenedor al crearse; dentro de una hoja animada hay que remedir.
			window.setTimeout(() => mapRef.current?.invalidateSize(), 60);
			return;
		}
		const center = mapRef.current.getCenter();
		if (Math.abs(center.lat - point[0]) > 1e-7 || Math.abs(center.lng - point[1]) > 1e-7) {
			mapRef.current.setView(point, Math.max(mapRef.current.getZoom(), ZOOM - 1), { animate: false });
		}
	}, [adjusting, lat, lng, valid]);

	// Modo ajuste: el mapa pasa a ser interactivo y más alto.
	useEffect(() => {
		const map = mapRef.current;
		if (!map) return;
		const handlers = [map.dragging, map.touchZoom, map.doubleClickZoom, map.scrollWheelZoom];
		for (const handler of handlers) {
			if (adjusting) handler.enable();
			else handler.disable();
		}
		// El alto cambia de golpe (sin animar el layout): basta con remedir en el siguiente cuadro.
		const frame = window.requestAnimationFrame(() => map.invalidateSize({ pan: false }));
		return () => window.cancelAnimationFrame(frame);
	}, [adjusting]);

	if (!valid) return null;

	const la = lat as number;
	const lo = lng as number;
	const localeCode = locale.toLowerCase().split("-")[0] || "es";
	const openHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${la},${lo}`)}&hl=${encodeURIComponent(localeCode)}`;

	const startAdjust = () => {
		originRef.current = mapRef.current?.getCenter() ?? null;
		setAdjusting(true);
	};
	const cancelAdjust = () => {
		if (originRef.current) mapRef.current?.setView(originRef.current, mapRef.current.getZoom(), { animate: false });
		setAdjusting(false);
	};
	const confirmAdjust = () => {
		const center = mapRef.current?.getCenter();
		setAdjusting(false);
		if (center && onAdjust) onAdjust(center.lat, center.lng);
	};

	return (
		<div className="cart-map" data-adjusting={adjusting ? "" : undefined} data-moving={moving ? "" : undefined}>
			<div ref={containerRef} className="cart-map__canvas" role="img" aria-label={t("locationLabel")} />

			<span className="cart-map__pin" aria-hidden>
				<svg viewBox="0 0 32 42" width="32" height="42">
					<path
						className="cart-map__pin-body"
						d="M16 41c-.6 0-1.1-.3-1.4-.8C10.2 33.6 2 25.6 2 16.2 2 8.3 8.3 2 16 2s14 6.3 14 14.2c0 9.4-8.2 17.4-12.6 24-.3.5-.8.8-1.4.8Z"
					/>
					<circle cx="16" cy="16" r="5.5" fill="#fff" />
				</svg>
			</span>
			<span className="cart-map__pin-shadow" aria-hidden />

			{adjusting ? (
				<>
					<p className="cart-map__hint" role="status">
						{t("adjustHint")}
					</p>
					<div className="cart-map__zoom">
						<button type="button" className="cart-map__round" onClick={() => mapRef.current?.zoomIn()} aria-label={t("zoomIn")}>
							<Plus size={16} aria-hidden />
						</button>
						<button type="button" className="cart-map__round" onClick={() => mapRef.current?.zoomOut()} aria-label={t("zoomOut")}>
							<Minus size={16} aria-hidden />
						</button>
					</div>
					<div className="cart-map__actions">
						<button type="button" className="cart-map__btn" onClick={cancelAdjust}>
							{t("cancel")}
						</button>
						<button type="button" className="cart-map__btn cart-map__btn--primary" onClick={confirmAdjust}>
							<Check size={15} aria-hidden />
							{t("confirm")}
						</button>
					</div>
				</>
			) : (
				<div className="cart-map__chips">
					{onAdjust ? (
						<button type="button" className="cart-map__chip" onClick={startAdjust}>
							<Move size={14} aria-hidden />
							{t("adjust")}
						</button>
					) : (
						<span />
					)}
					<a className="cart-map__chip" href={openHref} target="_blank" rel="noopener noreferrer">
						{t("openInGoogleMaps")}
						<ArrowUpRight size={14} aria-hidden />
					</a>
				</div>
			)}
		</div>
	);
}
