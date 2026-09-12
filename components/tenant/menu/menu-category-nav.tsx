"use client";

import { memo, useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { ChevronDown, Compass, Grid, MapPin, X } from "lucide-react";

import { isPromocionesCategoryName } from "@/lib/tenant/menu/menu-helpers";
import { shouldUnoptimizeImageSrc } from "@/lib/tenant/images/should-unoptimize-image";
import { Navbar } from "../navbar/navbar";
import { PoweredByGcode } from "../branding/powered-by-gcode";
import type { BranchInfo, CategoryListItem } from "./menu-types";

/**
 * La categoría activa se marcaba solo con la clase `.active`, en los cinco tipos
 * de navbar: visualmente evidente, invisible para un lector de pantalla. El
 * estado seleccionado viaja ahora también por `aria-current`.
 */
function currentCategoryProps(isActive: boolean) {
	return isActive ? ({ "aria-current": "true" } as const) : null;
}

export const IconListCategories = memo(function IconListCategories({
	categories,
	activeCategory,
	onCategoryClick,
}: {
	categories: CategoryListItem[];
	activeCategory: string | null;
	onCategoryClick: (id: string) => void;
}) {
	const navRef = useRef<HTMLElement | null>(null);
	const [canScrollLeft, setCanScrollLeft] = useState(false);
	const [canScrollRight, setCanScrollRight] = useState(categories.length > 4);

	useEffect(() => {
		const el = navRef.current;
		if (!el) return;

		const updateScrollState = () => {
			const { scrollLeft, scrollWidth, clientWidth } = el;
			setCanScrollLeft(scrollLeft > 4);
			setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
		};

		updateScrollState();

		el.addEventListener("scroll", updateScrollState, { passive: true });
		window.addEventListener("resize", updateScrollState);

		const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateScrollState) : null;
		ro?.observe(el);

		return () => {
			el.removeEventListener("scroll", updateScrollState);
			window.removeEventListener("resize", updateScrollState);
			ro?.disconnect();
		};
	}, [categories]);

	const fadeClass = !canScrollLeft && !canScrollRight
		? "no-fade"
		: canScrollLeft && canScrollRight
		? "fade-both"
		: canScrollLeft
		? "fade-left"
		: "fade-right";

	return (
		<nav ref={navRef} className={`icon-list-categories ${fadeClass}`} aria-label="Categorías">
			<div className="icon-list-container">
				{categories.map((cat) => (
					<button
						key={cat.id}
						type="button"
						onClick={() => onCategoryClick(cat.id)}
						{...currentCategoryProps(activeCategory === cat.id)}
						className={`icon-list-card ${activeCategory === cat.id ? "active" : ""}`}
					>
						<div className="icon-list-card-image-wrapper">
							{cat.icon ? (
								<Image
									src={cat.icon}
									className="icon-list-card-image"
									alt=""
									width={108}
									height={108}
									quality={85}
									sizes="(max-width: 600px) 88px, 108px"
									unoptimized={shouldUnoptimizeImageSrc(cat.icon)}
								/>
							) : (
								<span className="icon-list-card-initial">{cat.name.charAt(0).toUpperCase()}</span>
							)}
						</div>
						<span className="icon-list-card-name" title={cat.name}>{cat.name}</span>
					</button>
				))}
			</div>
		</nav>
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
	tenantSlug = null,
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
	tenantSlug?: string | null;
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
			<nav className="sidebar-nav" aria-label="Categorías">
				{categories.map((cat) => (
					<button
						key={cat.id}
						type="button"
						onClick={() => onCategoryClick(cat.id)}
						{...currentCategoryProps(activeCategory === cat.id)}
						className={`sidebar-nav-item ${activeCategory === cat.id ? "active" : ""}`}
					>
						{cat.icon ? (
							<Image
								src={cat.icon}
								className="sidebar-item-icon"
								alt=""
								width={36}
								height={36}
								quality={85}
								unoptimized={shouldUnoptimizeImageSrc(cat.icon)}
							/>
						) : (
							<Grid size={14} className="sidebar-item-icon opacity-60" />
						)}
						<span className="sidebar-item-text">{cat.name}</span>
					</button>
				))}
			</nav>
			{!isEmbeddedPreview ? (
				<PoweredByGcode tenantSlug={tenantSlug} surface="sidebar" />
			) : null}
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
	const contentRef = useRef<HTMLDivElement | null>(null);
	const closeButtonRef = useRef<HTMLButtonElement | null>(null);
	const titleId = useId();

	/**
	 * El overlay solo se cerraba pulsando fuera con el ratón: sin Escape, sin
	 * foco dentro y sin devolver el foco al salir, el teclado seguía recorriendo
	 * el catálogo tapado por el modal.
	 */
	useEffect(() => {
		if (!isOpen) return;

		const previouslyFocused = document.activeElement as HTMLElement | null;
		closeButtonRef.current?.focus();

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.stopPropagation();
				onClose();
				return;
			}
			if (event.key !== "Tab" || !contentRef.current) return;

			const focusables = contentRef.current.querySelectorAll<HTMLElement>("button:not([disabled])");
			if (focusables.length === 0) return;
			const first = focusables[0];
			const last = focusables[focusables.length - 1];

			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			/**
			 * El disparador se remonta al cerrar: el nodo guardado queda
			 * desconectado y en el momento de la limpieza el nuevo todavía no
			 * está en el DOM, así que la restauración espera al siguiente frame.
			 */
			requestAnimationFrame(() => {
				const target = previouslyFocused?.isConnected
					? previouslyFocused
					: document.querySelector<HTMLElement>(".mega-menu-fab");
				target?.focus?.();
			});
		};
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	return (
		<div className="mega-menu-overlay" onClick={onClose} role="presentation">
			<div
				ref={contentRef}
				className="mega-menu-content shadow-2xl"
				onClick={(e) => e.stopPropagation()}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
			>
				<div className="mega-menu-header">
					<h3 id={titleId}>Categorías</h3>
					<button
						ref={closeButtonRef}
						type="button"
						className="mega-menu-close"
						onClick={onClose}
						aria-label="Cerrar"
					>
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
							{...currentCategoryProps(activeCategory === cat.id)}
							className={`mega-menu-item ${activeCategory === cat.id ? "active" : ""}`}
						>
							<div className="mega-menu-item-icon-wrapper">
								{cat.icon ? (
									<Image
										src={cat.icon}
										className={`mega-menu-item-icon ${cat.id === "special" || isPromocionesCategoryName(cat.name) ? "icon-contain" : "icon-cover"}`}
										alt=""
										width={88}
										height={88}
										quality={85}
										sizes="88px"
										unoptimized={shouldUnoptimizeImageSrc(cat.icon)}
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
			className="mega-menu-fab shadow-lg transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-105 active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100"
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
										width={36}
										height={36}
										className="tab-item-icon-img"
										quality={85}
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
