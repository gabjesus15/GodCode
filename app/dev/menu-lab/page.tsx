import type { Metadata } from "next";
import { notFound } from "next/navigation";

import "../../[subdomain]/styles/TenantUiPrimitives.css";
import "../../[subdomain]/styles/index.css";
import "../../[subdomain]/tenant-base.css";
import "../../[subdomain]/styles/App.css";
import "../../[subdomain]/styles/Menu.css";
import "../../[subdomain]/styles/ProductCard.css";
import "../../[subdomain]/styles/GlassCard.css";
import "../../[subdomain]/styles/Navbar.css";
import "../../[subdomain]/styles/HeroCarousel.css";
import "../../[subdomain]/styles/FoodCardLayouts.css";
import "../../[subdomain]/styles/StoreCover.css";
import "../../[subdomain]/styles/BranchSelectorModal.css";
import "../../[subdomain]/styles/BottomNavbar.css";

import { MenuClient } from "@/components/tenant/menu/menu-client";
import { QueryProvider } from "@/components/ui/query-provider";
import { buildTenantThemeCssString } from "@/lib/store-theme/apply-theme-css-vars";
import { normalizeStoreThemeConfig } from "@/lib/store-theme/theme-config";
import {
	buildTenantSurfaceCssString,
	resolveTenantSurfaceSchemeAttr,
	resolveTenantSurfaceSchemeMode,
} from "@/lib/store-theme/surface-theme";

import { getMenuTemplate, menuTemplatePatch, recommendMenuTemplate } from "@/lib/store-theme/menu-templates";

import { LAB_MENUS, labBranch } from "./fixtures";

export const metadata: Metadata = {
	title: "Menú · laboratorio de plantillas",
	robots: { index: false, follow: false },
};

type SearchParams = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined): string | undefined {
	return Array.isArray(value) ? value[0] : value;
}

/**
 * Laboratorio del menú público: solo en desarrollo. Pinta el menú real con una
 * carta de ejemplo por tipo de negocio y el tema que digan los parámetros
 * (`sector`, `card`, `nav`, `font`, `scheme`, `bg`, `primary`, `cut`, …), sin base de
 * datos. Sirve para comparar plantillas y sacar capturas.
 */
export default async function MenuLabPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
	if (process.env.NODE_ENV === "production") notFound();
	const params = await searchParams;
	const sector = one(params.sector) ?? "Pizzería";
	const baseMenu = LAB_MENUS[sector] ?? LAB_MENUS["Otro"];
	// `cut=1`: fotos recortadas en PNG (como las de Rica Pizza) en vez de JPG.
	const menu =
		one(params.cut) === "1"
			? {
					...baseMenu,
					products: baseMenu.products.map((product) => ({
						...product,
						image_url: product.image_url?.replace(/\/(margherita|pepperoni|cuatro-quesos|pizza-champinon|pizza-quesos-miel)\.jpg$/, "/$1-cut.png") ?? null,
					})),
				}
			: baseMenu;

	// `template=auto` usa la recomendada para el tipo de negocio; los demás parámetros la retocan.
	const templateParam = one(params.template);
	const templateId = templateParam === "auto" ? recommendMenuTemplate(sector) : templateParam;
	const raw: Record<string, unknown> = {
		displayName: menu.name,
		backgroundMode: "solid",
		...(templateId ? menuTemplatePatch(getMenuTemplate(templateId).id) : {}),
	};
	const keys: Record<string, string> = {
		card: "productCardStyle",
		nav: "navbarType",
		details: "productDetailsMode",
		font: "fontFamily",
		scheme: "surfaceScheme",
		bg: "backgroundColor",
		primary: "primaryColor",
		secondary: "secondaryColor",
		price: "priceColor",
		hover: "hoverColor",
		discount: "discountColor",
		brand: "brandNameColor",
		bgmode: "backgroundMode",
		header: "headerStyle",
		featured: "featuredStyle",
		cart: "cartStyle",
	};
	for (const [param, key] of Object.entries(keys)) {
		const value = one(params[param]);
		if (value) raw[key] = value.startsWith("x") ? `#${value.slice(1)}` : value;
	}
	const theme = normalizeStoreThemeConfig(raw, menu.name);
	const branch = labBranch(menu);

	return (
		<QueryProvider>
			<style>{buildTenantThemeCssString(theme)}</style>
			<style>{buildTenantSurfaceCssString(theme)}</style>
			<div
				className="tenant-theme-vars"
				data-scheme={resolveTenantSurfaceSchemeAttr(theme)}
				data-scheme-mode={resolveTenantSurfaceSchemeMode(theme)}
			>
				<MenuClient
					name={menu.name}
					logoUrl={one(params.logo) ?? null}
					businessInfo={{ name: menu.name, address: branch.address, phone: branch.phone }}
					branches={[branch]}
					openBranchIds={[branch.id]}
					categories={menu.categories}
					products={menu.products}
					selectedBranchId={branch.id}
					banners={one(params.banners) === "0" ? [] : menu.banners}
					country={menu.country}
					currency={menu.currency}
					navbarType={theme.navbarType}
					navigationMode={theme.navigationMode}
					productCardStyle={theme.productCardStyle}
					productDetailsMode={theme.productDetailsMode}
					menuLayout={{
						headerStyle: theme.headerStyle,
						featuredStyle: theme.featuredStyle,
						cartStyle: theme.cartStyle,
						coverImageUrl: one(params.cover) ?? "",
					}}
					onlineOrderingEnabled
					tenantSlug="lab"
				/>
				{/* En el menú real los pone TenantShell. Sin el del carrito no se ve el carrito; sin
				    `modal-root` la hoja de producto se abría en <body>, fuera del tema: sin fondo, sin
				    el botón del color del local y con otra tipografía. */}
				<div id="cart-portal-root" className="tenant-portal-cart" />
				<div id="modal-root" className="tenant-portal-modal" />
			</div>
		</QueryProvider>
	);
}
