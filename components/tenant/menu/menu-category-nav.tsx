"use client";

import { memo } from "react";
import Image from "next/image";
import { ChevronDown, Compass, Grid, MapPin, X } from "lucide-react";

import { isPromocionesCategoryName } from "@/lib/tenant/menu/menu-helpers";
import { shouldUnoptimizeImageSrc } from "@/lib/tenant/images/should-unoptimize-image";
import { Navbar } from "../navbar/navbar";
import type { BranchInfo, CategoryListItem } from "./menu-types";

export const IconListCategories = memo(function IconListCategories({
	categories,
	activeCategory,
	onCategoryClick,
}: {
	categories: CategoryListItem[];
	activeCategory: string | null;
	onCategoryClick: (id: string) => void;
}) {
	return (
		<div className="icon-list-categories">
			<div className="icon-list-container">
				{categories.map((cat) => (
					<button
						key={cat.id}
						type="button"
						onClick={() => onCategoryClick(cat.id)}
						className={`icon-list-card ${activeCategory === cat.id ? "active" : ""}`}
					>
						<div className="icon-list-card-image-wrapper">
							{cat.icon ? (
								<Image src={cat.icon} className="icon-list-card-image" alt="" width={40} height={40} quality={70} />
							) : (
								<span className="icon-list-card-initial">{cat.name.charAt(0).toUpperCase()}</span>
							)}
						</div>
						<span className="icon-list-card-name">{cat.name}</span>
					</button>
				))}
			</div>
		</div>
	);
});

export const SidebarCategoriesPanel = memo(function SidebarCategoriesPanel({
	displayName,
	logoUrl,
	logoError,
	onLogoError,
	selectedBranch,
	isEmbeddedPreview,
	onOpenBranchModal,
	categories,
	activeCategory,
	onCategoryClick,
}: {
	displayName: string;
	logoUrl: string | null | undefined;
	logoError: boolean;
	onLogoError: () => void;
	selectedBranch: BranchInfo | null;
	isEmbeddedPreview: boolean;
	onOpenBranchModal: () => void;
	categories: CategoryListItem[];
	activeCategory: string | null;
	onCategoryClick: (id: string) => void;
}) {
	return (
		<aside className="sidebar-categories-panel">
			<div className="sidebar-header">
				<div className="sidebar-header-row">
					<Image
						src={logoError ? "/tenant/logo-placeholder.svg" : logoUrl || "/tenant/logo-placeholder.svg"}
						alt="Logo"
						className="sidebar-logo"
						width={44}
						height={44}
						onError={onLogoError}
						// Branding: servir el logo original sin recomprimir.
						unoptimized
					/>
					<div className="sidebar-brand-info">
						<h3 className="sidebar-brand-title">{displayName}</h3>
						<p className="sidebar-brand-subtitle">Menú Digital</p>
					</div>
				</div>
				<div className="sidebar-location-selector">
					<button
						type="button"
						onClick={onOpenBranchModal}
						disabled={isEmbeddedPreview}
						aria-disabled={isEmbeddedPreview}
						className="sidebar-location-button"
					>
						<MapPin size={16} className="sidebar-location-icon" color="var(--accent-primary)" />
						<div className="sidebar-location-content">
							<p className="sidebar-location-label">Sucursal</p>
							<p className="sidebar-location-value">{selectedBranch ? selectedBranch.name : "Seleccionar Local"}</p>
						</div>
						<ChevronDown size={14} className="sidebar-location-chevron" />
					</button>
				</div>
			</div>
			<nav className="sidebar-nav">
				{categories.map((cat) => (
					<button
						key={cat.id}
						type="button"
						onClick={() => onCategoryClick(cat.id)}
						className={`sidebar-nav-item ${activeCategory === cat.id ? "active" : ""}`}
					>
						{cat.icon ? (
							<Image src={cat.icon} className="sidebar-item-icon" alt="" width={16} height={16} quality={70} />
						) : (
							<Grid size={14} className="sidebar-item-icon opacity-60" />
						)}
						<span className="sidebar-item-text">{cat.name}</span>
					</button>
				))}
			</nav>
		</aside>
	);
});

export const MegaMenuOverlay = memo(function MegaMenuOverlay({
	isOpen,
	categories,
	activeCategory,
	onClose,
	onCategoryClick,
}: {
	isOpen: boolean;
	categories: CategoryListItem[];
	activeCategory: string | null;
	onClose: () => void;
	onCategoryClick: (id: string) => void;
}) {
	if (!isOpen) return null;

	return (
		<div className="mega-menu-overlay" onClick={onClose}>
			<div className="mega-menu-content shadow-2xl" onClick={(e) => e.stopPropagation()}>
				<div className="mega-menu-header">
					<h3>Categorías</h3>
					<button type="button" className="mega-menu-close" onClick={onClose} aria-label="Cerrar">
						<X size={20} />
					</button>
				</div>
				<div className="mega-menu-grid">
					{categories.map((cat) => (
						<button
							key={cat.id}
							type="button"
							onClick={() => {
								onCategoryClick(cat.id);
								onClose();
							}}
							className={`mega-menu-item ${activeCategory === cat.id ? "active" : ""}`}
						>
							<div className="mega-menu-item-icon-wrapper">
								{cat.icon ? (
									<Image
										src={cat.icon}
										className={`mega-menu-item-icon ${cat.id === "special" || isPromocionesCategoryName(cat.name) ? "icon-contain" : "icon-cover"}`}
										alt=""
										width={44}
										height={44}
										quality={70}
									/>
								) : (
									<span className="mega-menu-item-initial">{cat.name.charAt(0).toUpperCase()}</span>
								)}
							</div>
							<span className="mega-menu-item-name">{cat.name}</span>
						</button>
					))}
				</div>
			</div>
		</div>
	);
});

export const MegaMenuFab = memo(function MegaMenuFab({ onOpen }: { onOpen: () => void }) {
	return (
		<button
			type="button"
			onClick={onOpen}
			className="mega-menu-fab shadow-lg hover:scale-105 active:scale-95 transition-all duration-300"
			aria-label="Ver Categorías"
		>
			<Compass size={20} />
			<span>Categorías</span>
		</button>
	);
});

export const CategoryTabsNav = memo(function CategoryTabsNav({
	specialProductsCount,
	fireIcon,
	visibleCategories,
	activeCategory,
	onCategoryClick,
}: {
	specialProductsCount: number;
	fireIcon: string;
	visibleCategories: Array<{ id: string; name: string }>;
	activeCategory: string | null;
	onCategoryClick: (id: string) => void;
}) {
	return (
		<Navbar
			categories={[
				...(specialProductsCount > 0
					? [{
						id: "special",
						name: (
							<span className="flex items-center gap-1.5">
								<Image
									src={fireIcon}
									className="fire-inline-icon"
									alt="🔥"
									width={16}
									height={16}
									unoptimized={shouldUnoptimizeImageSrc(fireIcon)}
								/>
								<span>Solo por hoy</span>
							</span>
						),
					}]
					: []),
				...visibleCategories.map((cat) => {
					const catIcon = isPromocionesCategoryName(cat.name) ? fireIcon : null;
					return {
						id: cat.id,
						name: (
							<span className="flex items-center gap-1.5">
								{catIcon && (
									<Image
										src={catIcon}
										alt=""
										width={16}
										height={16}
										className="tab-item-icon-img"
										quality={70}
										unoptimized={shouldUnoptimizeImageSrc(catIcon)}
									/>
								)}
								<span>{cat.name}</span>
							</span>
						),
					};
				}),
			]}
			activeCategory={activeCategory}
			onCategoryClick={onCategoryClick}
		/>
	);
});
