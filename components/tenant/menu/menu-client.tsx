"use client";

import "@/app/[subdomain]/styles/BottomNavbar.css";
import { CartProvider } from "../cart";
import { MenuClientView } from "./menu-client-view";
import { MenuLcpPreload } from "./menu-lcp-preload";
import type { MenuClientProps } from "./menu-types";
import { useMenuClientController } from "./use-menu-client-controller";

export function MenuClient(props: MenuClientProps) {
	const vm = useMenuClientController(props);

	return (
		<CartProvider
			tenantSlug={vm.tenantSlug}
			selectedBranchId={vm.selectedBranch?.id ?? null}
			branchDeliverySettings={vm.selectedBranch?.delivery_settings ?? null}
			branchOriginLat={vm.selectedBranch?.origin_lat != null && Number.isFinite(Number(vm.selectedBranch.origin_lat)) ? Number(vm.selectedBranch.origin_lat) : null}
			branchOriginLng={vm.selectedBranch?.origin_lng != null && Number.isFinite(Number(vm.selectedBranch.origin_lng)) ? Number(vm.selectedBranch.origin_lng) : null}
			currency={vm.effectiveCurrency}
			country={vm.effectiveCountry}
		>
			<MenuLcpPreload banners={props.banners ?? []} />
			<MenuClientView
				mounted={vm.mounted}
				pageClassName={vm.pageClassName}
				navbarType={vm.navbarType}
				navigationMode={vm.navigationMode}
				displayName={vm.displayName}
				effectiveLogoUrl={vm.effectiveLogoUrl}
				logoError={vm.logoError}
				onLogoError={() => vm.setLogoError(true)}
				selectedBranch={vm.selectedBranch}
				isEmbeddedPreview={vm.isEmbeddedPreview}
				onOpenBranchModal={() => vm.setIsLocationModalOpen(true)}
				categoriesList={vm.categoriesList}
				activeCategory={vm.activeCategory}
				onCategoryClick={vm.handleCategoryClick}
				navbar={vm.navbar}
				cartUi={vm.cartUi}
				banners={vm.banners}
				query={vm.query}
				searchQuery={vm.searchQuery}
				specialProducts={vm.specialProducts}
				visibleCategories={vm.visibleCategories}
				productsByCategory={vm.productsByCategory}
				filteredBySearch={vm.filteredBySearch}
				cardStyle={vm.cardStyle}
				detailsMode={vm.detailsMode}
				effectiveCountry={vm.effectiveCountry}
				effectiveCurrency={vm.effectiveCurrency}
				exchangeRate={vm.exchangeRate}
				expandedInlineProductId={vm.expandedInlineProductId}
				onProductClick={vm.handleProductClick}
				onCloseInline={vm.closeInlinePanel}
				inlinePanelRef={vm.inlinePanelRef}
				selectedProductDetails={vm.selectedProductDetails}
				onCloseModal={vm.closeModal}
				onlineOrderingEnabled={vm.onlineOrderingEnabled}
				isLocationModalOpen={vm.isLocationModalOpen}
				onCloseLocationModal={() => { if (vm.selectedBranchId) vm.setIsLocationModalOpen(false); }}
				modalBranches={vm.modalBranches}
				allBranches={vm.branches}
				onSelectBranch={vm.handleBranchSelect}
				selectedBranchId={vm.selectedBranchId}
				businessName={vm.businessName}
				businessSchedule={vm.businessSchedule}
				isMegaMenuOpen={vm.isMegaMenuOpen}
				onCloseMegaMenu={() => vm.setIsMegaMenuOpen(false)}
				showMegaMenuFab={vm.showMegaMenuFab}
				onOpenMegaMenuFab={() => vm.setIsMegaMenuOpen(true)}
				availableContactChannels={vm.availableContactChannels}
				isContactChannelSheetOpen={vm.isContactChannelSheetOpen}
				isContactBranchModalOpen={vm.isContactBranchModalOpen}
				pendingContactChannel={vm.pendingContactChannel}
				closeContactUi={vm.closeContactUi}
				onContactChannelSelect={vm.handleContactChannelSelect}
				onContactBranchSelect={vm.handleContactBranchSelect}
				catalogScrollRef={vm.catalogScrollRef}
				observerBlockRef={vm.observerBlockRef}
				onActiveSectionChange={vm.handleScrollSpyCategoryChange}
			/>
		</CartProvider>
	);
}
