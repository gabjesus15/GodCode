import "server-only";

import { supabaseAdmin } from "../infra/supabase-admin";
import type { LandingMediaBundle, LandingSlide } from "./landing-media-types";

const DIR = "imagenes para landing";

function publicFile(name: string): string {
  return encodeURI(`/${DIR}/${name}`);
}

export type LandingMediaAssetRow = {
  key: string;
  src: string;
  alt: string | null;
  label: string | null;
  sub: string | null;
  sort_order: number | null;
  is_active: boolean | null;
};

const defaultSlides: LandingSlide[] = [
  {
    id: "home-hero",
    src: publicFile("home_menu_mobil.jpg"),
    label: "Inicio de tienda",
    sub: "Portada mobile con accesos rápidos y branding del negocio",
  },
  {
    id: "menu-mobile",
    src: publicFile("menu_mobil.jpg"),
    label: "Menú digital",
    sub: "Categorías, productos y banners desde el celular",
  },
  {
    id: "cart",
    src: publicFile("card_mobil.jpg"),
    label: "Carrito y checkout",
    sub: "Resumen de pedido, extras y pago integrado",
  },
  {
    id: "orders",
    src: publicFile("reporte_mobil.jpg"),
    label: "Panel y reportes",
    sub: "Ventas, estados y seguimiento desde el móvil",
  },
  {
    id: "pos",
    src: publicFile("caja_mobil.jpg"),
    label: "Punto de venta",
    sub: "Cobra en tu local rápido y sin complicaciones",
  },
  {
    id: "inventory",
    src: publicFile("iventario_mobil.jpg"),
    label: "Inventario",
    sub: "Stock por sucursal con alertas automáticas",
  },
];

export const defaultLandingMediaBundle: LandingMediaBundle = {
  hero: {
    laptopSrc: publicFile("menu_carrusel_mobil.png"),
    laptopAlt: "Menú con carrusel de productos en GodCode",
    phoneSrc: publicFile("home_menu_mobil.jpg"),
    phoneAlt: "Menú digital en el celular del cliente",
  },
  features: {
    menu: {
      src: publicFile("menu.png"),
      alt: "Menú digital con categorías y productos",
    },
    pos: {
      src: publicFile("caja.png"),
      alt: "Punto de venta y caja registradora",
    },
    inventory: {
      src: publicFile("iventario.png"),
      alt: "Inventario y stock por sucursal",
    },
  },
  phoneCarouselSlides: defaultSlides,
};

export function defaultLandingAssetsRows(): LandingMediaAssetRow[] {
  const rows: LandingMediaAssetRow[] = [
    { key: "hero.laptop", src: defaultLandingMediaBundle.hero.laptopSrc, alt: defaultLandingMediaBundle.hero.laptopAlt, label: null, sub: null, sort_order: 10, is_active: true },
    { key: "hero.phone", src: defaultLandingMediaBundle.hero.phoneSrc, alt: defaultLandingMediaBundle.hero.phoneAlt, label: null, sub: null, sort_order: 11, is_active: true },
    { key: "feature.menu", src: defaultLandingMediaBundle.features.menu.src, alt: defaultLandingMediaBundle.features.menu.alt, label: null, sub: null, sort_order: 20, is_active: true },
    { key: "feature.pos", src: defaultLandingMediaBundle.features.pos.src, alt: defaultLandingMediaBundle.features.pos.alt, label: null, sub: null, sort_order: 21, is_active: true },
    { key: "feature.inventory", src: defaultLandingMediaBundle.features.inventory.src, alt: defaultLandingMediaBundle.features.inventory.alt, label: null, sub: null, sort_order: 22, is_active: true },
  ];

  defaultSlides.forEach((slide, index) => {
    rows.push({
      key: `slide.${slide.id}`,
      src: slide.src,
      alt: slide.label,
      label: slide.label,
      sub: slide.sub,
      sort_order: 100 + index,
      is_active: true,
    });
  });

  return rows;
}

function normalizeAssetRows(rows: LandingMediaAssetRow[] | null | undefined): LandingMediaAssetRow[] {
  if (!rows || rows.length === 0) return defaultLandingAssetsRows();
  return rows
    .filter((r) => r && r.key && r.src && r.is_active !== false)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

function resolveFromRows(rows: LandingMediaAssetRow[]): LandingMediaBundle {
  const out: LandingMediaBundle = JSON.parse(JSON.stringify(defaultLandingMediaBundle)) as LandingMediaBundle;
  const slideMap = new Map(out.phoneCarouselSlides.map((s) => [s.id, s]));

  for (const row of rows) {
    const src = String(row.src || "").trim();
    if (!src) continue;

    if (row.key === "hero.laptop") {
      out.hero.laptopSrc = src;
      if (row.alt) out.hero.laptopAlt = row.alt;
      continue;
    }
    if (row.key === "hero.phone") {
      out.hero.phoneSrc = src;
      if (row.alt) out.hero.phoneAlt = row.alt;
      continue;
    }
    if (row.key === "feature.menu") {
      out.features.menu.src = src;
      if (row.alt) out.features.menu.alt = row.alt;
      continue;
    }
    if (row.key === "feature.pos") {
      out.features.pos.src = src;
      if (row.alt) out.features.pos.alt = row.alt;
      continue;
    }
    if (row.key === "feature.inventory") {
      out.features.inventory.src = src;
      if (row.alt) out.features.inventory.alt = row.alt;
      continue;
    }

    if (row.key.startsWith("slide.")) {
      const id = row.key.replace(/^slide\./, "").trim();
      if (!id) continue;
      const existing = slideMap.get(id);
      if (existing) {
        existing.src = src;
        existing.label = (row.label || row.alt || existing.label).trim();
        existing.sub = (row.sub || existing.sub).trim();
      } else {
        slideMap.set(id, {
          id,
          src,
          label: (row.label || row.alt || "Slide").trim(),
          sub: (row.sub || "").trim(),
        });
      }
    }
  }

  const orderedSlides = rows
    .filter((r) => r.key.startsWith("slide."))
    .map((r) => r.key.replace(/^slide\./, ""))
    .filter((id) => slideMap.has(id));

  const orderedUnique = [...new Set(orderedSlides)];
  const trailing = [...slideMap.keys()].filter((id) => !orderedUnique.includes(id));
  out.phoneCarouselSlides = [...orderedUnique, ...trailing]
    .map((id) => slideMap.get(id))
    .filter(Boolean) as LandingSlide[];

  return out;
}

export async function getLandingMediaBundle(): Promise<LandingMediaBundle> {
  const { data, error } = await supabaseAdmin
    .from("landing_media_assets")
    .select("key,src,alt,label,sub,sort_order,is_active")
    .order("sort_order", { ascending: true })
    .order("key", { ascending: true });

  if (error) {
    console.error("[getLandingMediaBundle]", error.message);
    return defaultLandingMediaBundle;
  }

  return resolveFromRows(normalizeAssetRows((data ?? []) as LandingMediaAssetRow[]));
}
