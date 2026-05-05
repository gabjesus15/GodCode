"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useLocale, useTranslations } from "next-intl";

import { isValidLatLng } from "@/lib/geo/geo";

// Fix para el ícono por defecto de Leaflet con bundlers.
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: (markerIcon2x as unknown as { src?: string })?.src ?? (markerIcon2x as unknown as string),
  iconUrl: (markerIcon as unknown as { src?: string })?.src ?? (markerIcon as unknown as string),
  shadowUrl: (markerShadow as unknown as { src?: string })?.src ?? (markerShadow as unknown as string),
});

type DeliveryPreviewMapProps = {
  lat: number | null | undefined;
  lng: number | null | undefined;
};

const ZOOM = 15;

export function DeliveryPreviewMap({ lat, lng }: DeliveryPreviewMapProps) {
  const t = useTranslations("tenant.cart.modal");
  const locale = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    // `isValidLatLng` usa `Number(...)` y `Number(null) === 0`, lo que hace que
    // `null` pase el filtro. En Leaflet eso rompe (LatLng no esperado).
    if (lat == null || lng == null || !containerRef.current) {
      return;
    }

    if (!isValidLatLng(lat, lng)) {
      return;
    }

    const la = lat as number;
    const lo = lng as number;

    if (mapRef.current) {
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: false,
      dragging: true,
      doubleClickZoom: true,
      boxZoom: false,
      keyboard: false,
    }).setView([la, lo], ZOOM);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const marker = L.marker([la, lo]).addTo(map);

    mapRef.current = map;
    markerRef.current = marker;

    // Leaflet necesita resize/invalidate cuando el contenedor cambia.
    setTimeout(() => map.invalidateSize(), 0);

    return () => {
      marker.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lng]);

  if (lat == null || lng == null || !isValidLatLng(lat, lng)) {
    return null;
  }

  const la = lat as number;
  const lo = lng as number;
  const localeCode = locale.toLowerCase().split("-")[0] || "en";
  const openHref = `https://www.google.com/maps?q=${encodeURIComponent(`${la},${lo}`)}&z=${ZOOM}&hl=${encodeURIComponent(localeCode)}`;

  return (
    <div className="cart-delivery-preview-map">
      <div className="cart-delivery-preview-map-head">
        <span className="cart-delivery-preview-map-label">{t("previewMap.locationLabel")}</span>
        <a
          className="cart-delivery-preview-map-link"
          href={openHref}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("previewMap.openMap")}
        </a>
      </div>
      <div
        ref={containerRef}
        className="cart-delivery-preview-map-canvas"
        role="presentation"
      />
    </div>
  );
}

