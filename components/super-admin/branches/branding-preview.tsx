"use client";

import { useState } from "react";
import Image from "next/image";

import { getTenantHost } from "@/utils/tenant-url";

interface BrandingPreviewProps {
  displayName: string;
  name: string;
  publicSlug: string;
  primaryColor: string;
  secondaryColor: string;
  priceColor: string;
  discountColor: string;
  hoverColor: string;
  backgroundColor: string;
  backgroundImageUrl: string;
  logoUrl: string;
}

const getInitials = (value: string) => {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase());
  return initials.join("") || "GC";
};

const PREVIEW_TABS = [
  "PROMOCIONES",
  "ENTRADAS CALIENTES",
  "SASHIMI",
  "HOT ROLLS",
  "ROLLS CALIFORNIA",
  "ROLLS TRADICIONALES",
  "Ramen",
];

const PREVIEW_PRODUCTS = [
  { name: "20 Piezas", price: "$9.500" },
  { name: "2 Hand Roll", price: "$7.500" },
  { name: "Hand roll vegetariano", price: "$4.000" },
  { name: "3 Hand Roll", price: "$10.500" },
];

export function BrandingPreview({
  displayName,
  name,
  publicSlug,
  primaryColor,
  secondaryColor,
  priceColor,
  discountColor,
  hoverColor,
  backgroundColor,
  backgroundImageUrl,
  logoUrl,
}: BrandingPreviewProps) {
  const [logoError, setLogoError] = useState(false);
  const safeName = displayName || name || "Nombre";

  return (
    <details className="rounded-2xl border border-dashed border-zinc-200 bg-white p-4">
      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Vista previa del tenant
      </summary>

      <div className="mt-4 grid gap-4">
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Cabecera</p>

          <div className="mt-3 flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3">
            <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-zinc-900">
              {logoUrl && !logoError ? (
                <Image
                  src={logoUrl}
                  alt="Logo"
                  fill
                  sizes="40px"
                  className="object-contain"
                  onError={() => setLogoError(true)}
                  unoptimized
                />
              ) : (
                <span className="text-xs font-semibold text-white">{getInitials(safeName)}</span>
              )}
            </div>

            <div className="flex flex-col">
              <span className="text-sm font-semibold text-zinc-900">{safeName}</span>
              <span className="text-xs text-zinc-500">
                {publicSlug ? getTenantHost(publicSlug) : "subdominio"}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 overflow-hidden rounded-[28px] border border-zinc-200 bg-zinc-950 shadow-sm">
            <div className="border-b border-white/10 px-4 py-2 text-[11px] text-zinc-300">
              <span className="font-semibold text-zinc-100">Paleta:</span> Primario {primaryColor} ·
              Secundario {secondaryColor} · Precio {priceColor} · Descuento {discountColor} · Hover {hoverColor}
            </div>

            <div className="border-b border-white/10 px-4 py-2 text-[11px] text-zinc-300">
              <span className="font-semibold text-zinc-100">Fondo:</span> Color {backgroundColor}
              {backgroundImageUrl ? " · Imagen configurada" : " · Sin imagen"}
            </div>

            <div className="relative bg-[url('/tenant/menu-pattern.webp')] bg-cover bg-center">
              <div className="bg-black/75 p-4">
                <header className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-950/90 px-3 py-2 backdrop-blur">
                  <button
                    type="button"
                    className="grid h-8 w-8 place-items-center rounded-lg border border-white/15 bg-zinc-900 text-sm font-bold text-white"
                  >
                    {"<"}
                  </button>

                  <div className="flex min-w-0 flex-col items-center gap-1">
                    <div className="flex items-center gap-2">
                      <div className="relative h-7 w-7 overflow-hidden rounded-md border border-white/15 bg-zinc-900">
                        {logoUrl && !logoError ? (
                          <Image
                            src={logoUrl}
                            alt="Logo"
                            fill
                            sizes="28px"
                            className="object-contain"
                            onError={() => setLogoError(true)}
                            unoptimized
                          />
                        ) : (
                          <span className="grid h-full w-full place-items-center text-[10px] font-bold text-white">
                            {getInitials(safeName)}
                          </span>
                        )}
                      </div>
                      <span className="max-w-[180px] truncate text-sm font-semibold text-white">{safeName}</span>
                    </div>

                    <div className="rounded-full border border-white/15 bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold text-zinc-200">
                      Ciudad de los Valles
                    </div>
                  </div>

                  <button
                    type="button"
                    className="grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-zinc-900 text-xs font-bold text-white"
                  >
                    Q
                  </button>
                </header>

                <div className="mb-4 overflow-x-auto">
                  <div className="flex min-w-max gap-2 pb-1">
                    {PREVIEW_TABS.map((tab, index) => (
                      <span
                        key={tab}
                        className={`rounded-full border px-3 py-2 text-[11px] font-bold whitespace-nowrap ${
                          index === 0
                            ? "border-orange-500/60 bg-orange-600 text-white"
                            : "border-white/15 bg-zinc-900/80 text-zinc-300"
                        }`}
                      >
                        {tab}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mb-3 text-2xl font-extrabold tracking-wide text-white/95">PROMOCIONES</div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {PREVIEW_PRODUCTS.map((product, index) => (
                    <article
                      key={product.name}
                      className="flex min-h-[300px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/95 shadow-2xl"
                    >
                      <div className="relative h-32 w-full bg-zinc-900">
                        <Image
                          src="/tenant/menu-pattern.webp"
                          alt="Producto de ejemplo"
                          fill
                          sizes="(max-width: 1280px) 50vw, 25vw"
                          className="object-cover opacity-55"
                        />

                        {index === 0 ? (
                          <span className="absolute right-2 top-2 rounded-full border border-white/20 bg-zinc-900/85 px-2 py-1 text-[10px] font-extrabold text-zinc-100">
                            OFERTA
                          </span>
                        ) : null}
                      </div>

                      <div className="flex flex-1 flex-col space-y-2 p-3 text-white">
                        <h4 className="text-[18px] font-extrabold leading-tight">{product.name}</h4>
                        <p className="text-sm text-zinc-300">10 piezas de pollo en sésamo o ciboulette.</p>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-orange-400">
                          Ver detalles
                        </p>

                        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                          <span className="text-[28px] font-black leading-none text-zinc-100">
                            {product.price}
                          </span>
                          <button
                            type="button"
                            className="shrink-0 rounded-full bg-orange-600 px-3 py-1.5 text-[11px] font-extrabold text-white"
                          >
                            + Agregar
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="pointer-events-none absolute bottom-5 right-5">
                  <div className="relative grid h-14 w-14 place-items-center rounded-2xl border border-orange-400/40 bg-orange-600 text-sm font-extrabold text-white shadow-lg shadow-orange-900/30">
                    Cart
                    <span className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full border-2 border-white bg-zinc-900 text-[10px] font-bold text-white">
                      2
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
    </details>
  );
}
