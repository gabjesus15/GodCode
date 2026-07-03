"use client";

import { createPortal } from "react-dom";

import type { HeroBanner } from "../home/hero-carousel";
import { HeroCarousel } from "../home/hero-carousel";
import { OrderIntakePausedBanner } from "./order-intake-paused-banner";
import { MegaMenuFab, MegaMenuOverlay, SidebarCategoriesPanel } from "./menu-category-nav";
import { MenuCatalog } from "./menu-catalog";
import { MenuContactChannelSheet } from "./menu-contact-channel-sheet";
import type { BranchInfo, BranchModalItem, CategoryListItem, MenuProduct } from "./menu-types";
import type { BranchContactChannel } from "@/lib/tenant/menu/menu-helpers";
import { branchHasContactChannel } from "@/lib/tenant/menu/menu-helpers";
import {
	LazyBranchSelectorModal,
	LazyContactBranchModal,
	LazyProductDetailsModal,
} from "@/lib/tenant/lazy/tenant-dynamic";
import type { MenuCatalogScrollController } from "@/lib/tenant/menu/menu-catalog-scroll-controller";

export type MenuClientViewProps = {
	mounted: boolean;
	pageClassName: string;
	navbarType: string;
	navigationMode: string;
	displayName: string;
	effectiveLogoUrl: string | null | undefined;
	logoError: boolean;
	onLogoError: () => void;
	selectedBranch: BranchInfo | null;
	isEmbeddedPreview: boolean;
	onOpenBranchModal: () => void;
	categoriesList: CategoryListItem[];
	activeCategory: string | null;
	onCategoryClick: (id: string) => void;
	navbar: React.ReactNode;
	cartUi: React.ReactNode;
	banners: HeroBanner[];
	query: string;
	searchQuery: string;
	specialProducts: MenuProduct[];
	visibleCategories: { id: string; name: string }[];
	productsByCategory: Map<string, MenuProduct[]>;
	filteredBySearch: MenuProduct[];
	cardStyle: string;
	detailsMode: string;
	effectiveCountry: string;
	effectiveCurrency: string;
	exchangeRate: number | null;
	expandedInlineProductId: string | null;
	onProductClick: (productId: string) => void;
	onCloseInline: () => void;
	inlinePanelRef: React.RefObject<HTMLDivElement | null>;
	selectedProductDetails: MenuProduct | null;
	onCloseModal: () => void;
	onlineOrderingEnabled?: boolean;
	isLocationModalOpen: boolean;
	onCloseLocationModal: () => void;
	modalBranches: BranchModalItem[];
	allBranches: BranchInfo[];
	onSelectBranch: (branch: BranchModalItem) => void;
	selectedBranchId?: string | null;
	businessName: string;
	businessSchedule?: string | null;
	isMegaMenuOpen: boolean;
	onCloseMegaMenu: () => void;
	showMegaMenuFab: boolean;
	onOpenMegaMenuFab: () => void;
	availableContactChannels: BranchContactChannel[];
	isContactChannelSheetOpen: boolean;
	isContactBranchModalOpen: boolean;
	pendingContactChannel: BranchContactChannel | null;
	closeContactUi: () => void;
	onContactChannelSelect: (channel: BranchContactChannel) => void;
	onContactBranchSelect: (branch: Pick<BranchInfo, "id" | "whatsapp_url" | "instagram_url" | "map_url">) => void;
	catalogScrollRef: React.RefObject<MenuCatalogScrollController | null>;
	observerBlockRef: React.RefObject<boolean>;
	onActiveSectionChange: (sectionId: string) => void;
};

export function MenuClientView(props: MenuClientViewProps) {
	const {
		mounted,
		pageClassName,
		navbarType,
		displayName,
		effectiveLogoUrl,
		logoError,
		onLogoError,
		selectedBranch,
		isEmbeddedPreview,
		onOpenBranchModal,
		categoriesList,
		activeCategory,
		onCategoryClick,
		navbar,
		cartUi,
		banners,
		query,
		searchQuery,
		navigationMode,
		specialProducts,
		visibleCategories,
		productsByCategory,
		filteredBySearch,
		cardStyle,
		detailsMode,
		effectiveCountry,
		effectiveCurrency,
		exchangeRate,
		expandedInlineProductId,
		onProductClick,
		onCloseInline,
		inlinePanelRef,
		selectedProductDetails,
		onCloseModal,
		onlineOrderingEnabled,
		isLocationModalOpen,
		onCloseLocationModal,
		modalBranches,
		allBranches,
		onSelectBranch,
		selectedBranchId,
		businessName,
		businessSchedule,
		isMegaMenuOpen,
		onCloseMegaMenu,
		showMegaMenuFab,
		onOpenMegaMenuFab,
		availableContactChannels,
		isContactChannelSheetOpen,
		isContactBranchModalOpen,
		pendingContactChannel,
		closeContactUi,
		onContactChannelSelect,
		onContactBranchSelect,
		catalogScrollRef,
		observerBlockRef,
		onActiveSectionChange,
	} = props;

	const contactBranches = pendingContactChannel
		? allBranches.filter((branch) => branchHasContactChannel(branch, pendingContactChannel))
		: allBranches;

	return (
		<div className={pageClassName}>
			{navbarType === "sidebar-categories" && (
				<SidebarCategoriesPanel
					displayName={displayName}
					logoUrl={effectiveLogoUrl}
					logoError={logoError}
					onLogoError={onLogoError}
					selectedBranch={selectedBranch}
					isEmbeddedPreview={isEmbeddedPreview}
					onOpenBranchModal={onOpenBranchModal}
					categories={categoriesList}
					activeCategory={activeCategory}
					onCategoryClick={onCategoryClick}
				/>
			)}

			<div className="main-content-layout">
				{selectedBranch?.order_intake_paused && (
					<OrderIntakePausedBanner message={selectedBranch.order_intake_pause_message} />
				)}

				{mounted && typeof document !== "undefined" && document.getElementById("navbar-portal-root")
					? createPortal(navbar, document.getElementById("navbar-portal-root") as Element)
					: navbar}

				<div className="menu-spacer" />
				{banners.length > 0 && <HeroCarousel banners={banners} />}

				<main className="container">
					<MenuCatalog
						query={query}
						searchQuery={searchQuery}
						navigationMode={navigationMode}
						activeCategory={navigationMode === "pagination" ? activeCategory : null}
						specialProducts={specialProducts}
						visibleCategories={visibleCategories}
						productsByCategory={productsByCategory}
						filteredBySearch={filteredBySearch}
						cardStyle={cardStyle}
						detailsMode={detailsMode}
						effectiveCountry={effectiveCountry}
						effectiveCurrency={effectiveCurrency}
						exchangeRate={exchangeRate}
						expandedInlineProductId={expandedInlineProductId}
						onProductClick={onProductClick}
						onCloseInline={onCloseInline}
						inlinePanelRef={inlinePanelRef}
						onlineOrderingEnabled={onlineOrderingEnabled}
						catalogScrollRef={catalogScrollRef}
						observerBlockRef={observerBlockRef}
						onActiveSectionChange={onActiveSectionChange}
					/>
				</main>

				{mounted && typeof document !== "undefined" && document.getElementById("cart-portal-root")
					? createPortal(cartUi, document.getElementById("cart-portal-root") as Element)
					: null}

				{mounted && selectedProductDetails ? (
					<LazyProductDetailsModal
						isOpen
						onClose={onCloseModal}
						product={selectedProductDetails}
						country={effectiveCountry}
						currency={effectiveCurrency}
						onlineOrderingEnabled={onlineOrderingEnabled}
						exchangeRate={exchangeRate}
					/>
				) : null}

				{!isEmbeddedPreview && isLocationModalOpen ? (
					<LazyBranchSelectorModal
						isOpen
						onClose={onCloseLocationModal}
						branches={modalBranches}
						allBranches={allBranches}
						isLoadingCaja={false}
						onSelectBranch={onSelectBranch}
						allowClose={Boolean(selectedBranchId)}
						schedule={businessSchedule ?? null}
						businessName={businessName}
					/>
				) : null}

				<MegaMenuOverlay
					isOpen={isMegaMenuOpen}
					categories={categoriesList}
					activeCategory={activeCategory}
					onClose={onCloseMegaMenu}
					onCategoryClick={onCategoryClick}
				/>

				{showMegaMenuFab && <MegaMenuFab onOpen={onOpenMegaMenuFab} />}

				<MenuContactChannelSheet
					isOpen={isContactChannelSheetOpen}
					channels={availableContactChannels}
					onClose={closeContactUi}
					onSelectChannel={onContactChannelSelect}
				/>

				{isContactBranchModalOpen ? (
					<LazyContactBranchModal
						isOpen
						onClose={closeContactUi}
						branches={contactBranches}
						isLoading={false}
						onSelectBranch={onContactBranchSelect}
						action={pendingContactChannel}
					/>
				) : null}
			</div>
		</div>
	);
}
