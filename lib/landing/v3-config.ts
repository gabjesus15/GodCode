import "server-only";

import { unstable_cache } from "next/cache";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";

import type { LandingMediaAssetRow } from "./landing-media";

export type LandingV3PhoneSlide = {
	src: string;
	alt: string;
	label: string;
	priority: boolean;
};

export type LandingV3Config = {
	heroPhones: LandingV3PhoneSlide[];
	featureImages: {
		pos: { src: string; alt: string };
		menu: { src: string; alt: string };
		inventory: { src: string; alt: string };
	};
	bentoMenuMobile: { src: string; alt: string };
	contact: {
		instagramUrl: string | null;
		whatsappUrl: string | null;
	};
};

export const LANDING_V3_CONFIG_TAG = "landing-v3-config";

function encodePublicPath(path: string): string {
	return path.includes(" ") ? encodeURI(path) : path;
}

export function defaultLandingV3AssetsRows(): LandingMediaAssetRow[] {
	return [
		{
			key: "v3.hero.phone.0",
			src: "/oishi-sushi-bio.png",
			alt: "Página de enlaces de Oishi Sushi",
			label: "Página de enlaces",
			sub: null,
			sort_order: 10,
			is_active: true,
		},
		{
			key: "v3.hero.phone.1",
			src: "/la-parada-menu.png",
			alt: "Menú digital de La Parada en Gcode",
			label: "Menú digital",
			sub: null,
			sort_order: 11,
			is_active: true,
		},
		{
			key: "v3.feature.pos",
			src: encodePublicPath("/imagenes para landing/caja_mobil.jpg"),
			alt: "Vista previa del POS de Gcode",
			label: null,
			sub: null,
			sort_order: 20,
			is_active: true,
		},
		{
			key: "v3.feature.menu",
			src: "/la-parada-menu.png",
			alt: "Menú digital de La Parada en Gcode",
			label: null,
			sub: null,
			sort_order: 21,
			is_active: true,
		},
		{
			key: "v3.feature.inventory",
			src: encodePublicPath("/imagenes para landing/iventario_mobil.jpg"),
			alt: "Gestión de inventario en Gcode",
			label: null,
			sub: null,
			sort_order: 22,
			is_active: true,
		},
		{
			key: "v3.bento.menu_mobile",
			src: encodePublicPath("/imagenes para landing/menu_mobil.jpg"),
			alt: "Vista previa del menú móvil",
			label: null,
			sub: null,
			sort_order: 30,
			is_active: true,
		},
		{
			key: "v3.contact.instagram",
			src: "https://www.instagram.com/gcode.labs/",
			alt: "Instagram de Gcode",
			label: "Instagram",
			sub: null,
			sort_order: 40,
			is_active: true,
		},
		{
			key: "v3.contact.whatsapp",
			src: "56943848080",
			alt: "WhatsApp de Gcode",
			label: "WhatsApp",
			sub: null,
			sort_order: 41,
			is_active: true,
		},
	];
}

function mergeV3AssetRows(dbRows: LandingMediaAssetRow[]): LandingMediaAssetRow[] {
	const map = new Map(defaultLandingV3AssetsRows().map((row) => [row.key, row]));
	for (const row of dbRows) {
		if (!row.key.startsWith("v3.")) continue;
		const current = map.get(row.key);
		map.set(row.key, {
			...current,
			...row,
			key: row.key,
			src: row.src?.trim() || current?.src || "",
		});
	}
	return [...map.values()].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

function rowMap(rows: LandingMediaAssetRow[]): Map<string, LandingMediaAssetRow> {
	return new Map(rows.map((row) => [row.key, row]));
}

function activeSrc(map: Map<string, LandingMediaAssetRow>, key: string, fallback: string): string {
	const row = map.get(key);
	if (!row || row.is_active === false) return fallback;
	return row.src?.trim() || fallback;
}

function buildConfigFromRows(rows: LandingMediaAssetRow[]): LandingV3Config {
	const map = rowMap(rows);
	const heroPhones = rows
		.filter((row) => row.key.startsWith("v3.hero.phone.") && row.is_active !== false)
		.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
		.map((row, index) => ({
			src: row.src,
			alt: row.alt || row.label || "Vista previa Gcode",
			label: row.label || `Slide ${index + 1}`,
			priority: index === 1,
		}));

	return {
		heroPhones:
			heroPhones.length > 0
				? heroPhones
				: defaultLandingV3AssetsRows()
						.filter((row) => row.key.startsWith("v3.hero.phone."))
						.map((row, index) => ({
							src: row.src,
							alt: row.alt || "",
							label: row.label || "",
							priority: index === 1,
						})),
		featureImages: {
			pos: {
				src: activeSrc(map, "v3.feature.pos", encodePublicPath("/imagenes para landing/caja_mobil.jpg")),
				alt: map.get("v3.feature.pos")?.alt || "Vista previa del POS de Gcode",
			},
			menu: {
				src: activeSrc(map, "v3.feature.menu", "/la-parada-menu.png"),
				alt: map.get("v3.feature.menu")?.alt || "Menú digital de La Parada en Gcode",
			},
			inventory: {
				src: activeSrc(
					map,
					"v3.feature.inventory",
					encodePublicPath("/imagenes para landing/iventario_mobil.jpg"),
				),
				alt: map.get("v3.feature.inventory")?.alt || "Gestión de inventario en Gcode",
			},
		},
		bentoMenuMobile: {
			src: activeSrc(
				map,
				"v3.bento.menu_mobile",
				encodePublicPath("/imagenes para landing/menu_mobil.jpg"),
			),
			alt: map.get("v3.bento.menu_mobile")?.alt || "Vista previa del menú móvil",
		},
		contact: {
			instagramUrl: activeSrc(map, "v3.contact.instagram", "https://www.instagram.com/gcode.labs/"),
			whatsappUrl: activeSrc(map, "v3.contact.whatsapp", "56943848080"),
		},
	};
}

async function loadLandingV3ConfigUncached(): Promise<LandingV3Config> {
	const { data, error } = await supabaseAdmin
		.from("landing_media_assets")
		.select("key,src,alt,label,sub,sort_order,is_active")
		.like("key", "v3.%")
		.order("sort_order", { ascending: true });

	if (error) {
		console.error("[loadLandingV3Config]", error.message);
		return buildConfigFromRows(defaultLandingV3AssetsRows());
	}

	return buildConfigFromRows(mergeV3AssetRows((data ?? []) as LandingMediaAssetRow[]));
}

const loadLandingV3ConfigCached = unstable_cache(
	loadLandingV3ConfigUncached,
	["landing-v3-config-v1"],
	{ revalidate: 120, tags: [LANDING_V3_CONFIG_TAG] },
);

export async function loadLandingV3Config(): Promise<LandingV3Config> {
	return loadLandingV3ConfigCached();
}

export function mergeLandingV3AssetRows(dbRows: LandingMediaAssetRow[]): LandingMediaAssetRow[] {
	return mergeV3AssetRows(dbRows);
}
