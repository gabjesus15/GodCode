import "server-only";

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
