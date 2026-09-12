"use client";

import { memo } from "react";
import Image from "next/image";
import { ChevronDown, ChevronLeft, Compass, MapPin, Search, X } from "lucide-react";

import { CategoryTabsNav, IconListCategories } from "./menu-category-nav";
import { useMenuHeaderHeight } from "./use-menu-header-height";
import type { BranchInfo, CategoryListItem } from "./menu-types";

type MenuNavbarProps = {
	navbarType: string;
	displayName: string;
	logoUrl: string | null | undefined;
	logoError: boolean;
	onLogoError: () => void;
	selectedBranch: BranchInfo | null;
	isEmbeddedPreview: boolean;
	onOpenBranchModal: () => void;
	/** Con la barra inferior a la vista el selector de sucursal vive alli, no aqui. */
	showBranchSelector: boolean;
	onBackHome: () => void;
	searchQuery: string;
	searchExpanded: boolean;
	searchInputRef: React.RefObject<HTMLInputElement | null>;
	onSearchChange: (value: string) => void;
	onSearchExpand: () => void;
	onSearchCollapse: () => void;
	onOpenMegaMenu: () => void;
	categories: CategoryListItem[];
	visibleCategories: Array<{ id: string; name: string }>;
	specialProductsCount: number;
	fireIcon: string;
	activeCategory: string | null;
	onCategoryClick: (id: string) => void;
};

export const MenuNavbar = memo(function MenuNavbar({
	navbarType,
	displayName,
	logoUrl,
	logoError,
	onLogoError,
	selectedBranch,
	isEmbeddedPreview,
	onOpenBranchModal,
	showBranchSelector,
	onBackHome,
	searchQuery,
	searchExpanded,
	searchInputRef,
	onSearchChange,
	onSearchExpand,
	onSearchCollapse,
	onOpenMegaMenu,
	categories,
	visibleCategories,
	specialProductsCount,
	fireIcon,
	activeCategory,
	onCategoryClick,
}: MenuNavbarProps) {
	const headerRef = useMenuHeaderHeight<HTMLElement>();

	return (
		<header ref={headerRef} className={`navbar-sticky navbar-type-${navbarType}`}>
			<div className="container nav-container-top">
				<button type="button" onClick={onBackHome} className="nav-back-button" aria-label="Volver al inicio">
					<ChevronLeft size={28} />
				</button>
				<div className={`nav-brand-wrapper ${searchExpanded ? "mobile-search-active" : ""} ${navbarType === "sidebar-categories" ? "nav-brand-sidebar-hidden" : ""}`}>
					<Image
						src={logoError ? "/tenant/logo-placeholder.svg" : logoUrl || "/tenant/logo-placeholder.svg"}
						alt="Logo del local"
						className="nav-logo"
						width={52}
						height={52}
						onError={onLogoError}
						// Branding: servir el logo original sin recomprimir.
						unoptimized
					/>
					<div className={`nav-brand-info ${showBranchSelector ? "" : "nav-brand-info--solo-titulo"}`}>
						{/* El nombre de la tienda es el encabezado de nivel uno de la pagina:
						    coincide con el <title> y es el tema del documento. Al ser <h2>,
						    el menu no tenia ningun h1 y el esquema arrancaba un nivel por
						    debajo. Ahora: h1 tienda -> h2 categorias -> h3 productos. */}
						<h1 className="nav-brand-title">{displayName}</h1>
						{showBranchSelector ? (
							<button
								type="button"
								onClick={onOpenBranchModal}
								className="nav-location-button"
								disabled={isEmbeddedPreview}
								aria-disabled={isEmbeddedPreview}
							>
								<MapPin size={12} className="text-[var(--accent-primary)]" />
								<span className="nav-location-text nav-location-text--truncate">
									{selectedBranch ? selectedBranch.name : "Seleccionar Local"}
								</span>
								<ChevronDown size={12} className="opacity-60" />
							</button>
						) : null}
					</div>
				</div>
				<div className="nav-search-section">
					<div className="nav-actions-wrapper">
						{navbarType === "mega-menu" && (
							<button type="button" onClick={onOpenMegaMenu} className="mega-menu-header-trigger" aria-label="Ver Categorías">
								<Compass size={20} />
							</button>
						)}
					</div>
					<div
						className={`search-pill-wrapper ${searchExpanded ? "expanded" : ""}`}
						onClick={() => {
							if (!searchExpanded) onSearchExpand();
						}}
					>
						<Search size={20} className="search-icon-pill" />
						<input
							ref={searchInputRef}
							type="text"
							className="search-input-pill"
							/* El placeholder era el unico nombre del campo (WCAG 3.3.2): al
							   escribir desaparece, y un lector de pantalla no tiene que
							   anunciarlo como etiqueta. */
							aria-label="Buscar plato"
							placeholder="Buscar plato..."
							value={searchQuery}
							onChange={(event) => onSearchChange(event.target.value)}
							onBlur={() => {
								if (!searchQuery.trim()) onSearchCollapse();
							}}
							onClick={(event) => event.stopPropagation()}
						/>
						{searchExpanded ? (
							<button
								type="button"
								className="btn-close-pill"
								onClick={(event) => {
									event.stopPropagation();
									onSearchCollapse();
									onSearchChange("");
								}}
								aria-label="Cerrar búsqueda"
							>
								<X size={14} />
							</button>
						) : null}
					</div>
				</div>
			</div>
			{(navbarType === "category-tabs" || navbarType === "sidebar-categories") && (
				<CategoryTabsNav
					specialProductsCount={specialProductsCount}
					fireIcon={fireIcon}
					visibleCategories={visibleCategories}
					activeCategory={activeCategory}
					onCategoryClick={onCategoryClick}
				/>
			)}
			{(navbarType === "icon-list" || navbarType === "floating-bottom") && (
				<div className="container icon-list-categories-shell">
					<IconListCategories categories={categories} activeCategory={activeCategory} onCategoryClick={onCategoryClick} />
				</div>
			)}
		</header>
	);
});
