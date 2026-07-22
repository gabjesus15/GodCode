"use client";

import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useCartStore } from "../cart/cart-store";
import { getTenantScopedPath, getTenantPrefixFromPathname } from "../utils/tenant-route";
import { normalizeDeliverySettings } from "@/lib/delivery/delivery-settings";
import { mergeMenuPathQuery } from "@/utils/tenant-url";
import { readEmbeddedPreviewFromLocation } from "@/lib/store-theme/preview-theme-messaging";
import { FIRE_ICON, getAvailableContactChannels, getBranchesWithContactChannel, openBranchContactUrl, resolveContactFlowStep, resolveMenuCartUiMode, shouldShowBottomNav, shouldShowContactTab, type BranchContactChannel } from "@/lib/tenant/menu/menu-helpers";
import { buildModalBranchItems } from "./menu-branch-items";
import { MenuCartLayer } from "./menu-cart-layer";
import { MenuNavbar } from "./menu-navbar";
import type { BranchInfo, BranchModalItem, MenuClientProps } from "./menu-types";
import { useMenuCatalogData } from "./use-menu-catalog-data";
import { useMenuCategoryScroll } from "./use-menu-category-scroll";
import type { MenuCatalogScrollController } from "@/lib/tenant/menu/menu-catalog-scroll-controller";
import { countVisibleCatalogProducts, shouldVirtualizeMenuCatalog } from "@/lib/tenant/menu/menu-catalog-virtualization";
import { useMenuPreviewTheme } from "./use-menu-preview-theme";
import { useMenuRealtime } from "./use-menu-realtime";
import { useMenuOverlayHistory } from "@/lib/tenant/mobile/use-menu-overlay-history";
import { useOverlayHistoryDepthSync } from "@/lib/tenant/mobile/overlay-history";
import { TENANT_OVERLAY_PRIORITIES } from "@/lib/tenant/config/tenant-ui-config";
import { useTenantMounted } from "@/lib/tenant/hooks/use-tenant-mounted";
import { useLowEndDevice } from "@/lib/tenant/hooks/use-low-end-device";
import { resolveEffectiveNavigationMode } from "@/lib/tenant/menu/resolve-effective-navigation-mode";

export function useMenuClientController(props: MenuClientProps) {
	const {
		name,
		logoUrl,
		businessInfo,
		branches,
		openBranchIds,
		categories,
		products,
		selectedBranchId,
		country = "CL",
		currency = "CLP",
		navbarType: initialNavbarType = "category-tabs",
		navigationMode: initialNavigationMode = "scroll",
		productCardStyle: initialProductCardStyle = "glass",
		productDetailsMode: initialProductDetailsMode = "modal-premium",
		onlineOrderingEnabled,
		orderChannel = "both",
	} = props;

	const mounted = useTenantMounted();
	const isLowEnd = useLowEndDevice();
	const [navbarType, setNavbarType] = useState(initialNavbarType);
	const [navigationMode, setNavigationMode] = useState(initialNavigationMode);
	const [cardStyle, setCardStyle] = useState(initialProductCardStyle);
	const [detailsMode, setDetailsMode] = useState(initialProductDetailsMode);
	const [previewDisplayName, setPreviewDisplayName] = useState<string | null>(null);
	const [previewLogoUrl, setPreviewLogoUrl] = useState<string | null>(null);
	const [activeBottomTab, setActiveBottomTab] = useState<"home" | "cart" | "contact">("home");
	const [isContactChannelSheetOpen, setIsContactChannelSheetOpen] = useState(false);
	const [isContactBranchModalOpen, setIsContactBranchModalOpen] = useState(false);
	const [pendingContactChannel, setPendingContactChannel] = useState<BranchContactChannel | null>(null);
	const [activeCategory, setActiveCategory] = useState<string | null>(categories[0]?.id ?? null);
	const [searchQuery, setSearchQuery] = useState("");
	const [searchExpanded, setSearchExpanded] = useState(false);
	const [logoError, setLogoError] = useState(false);
	const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
	const [selectedProductDetails, setSelectedProductDetails] = useState<(typeof products)[number] | null>(null);
	const [expandedInlineProductId, setExpandedInlineProductId] = useState<string | null>(null);

	const searchInputRef = useRef<HTMLInputElement | null>(null);
	const inlinePanelRef = useRef<HTMLDivElement | null>(null);
	const productsByIdRef = useRef(new Map(products.map((p) => [p.id, p])));

	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const isEmbeddedPreview =
		searchParams?.get("embedded_preview") === "1"
		|| readEmbeddedPreviewFromLocation();
	const previewThemeParam = searchParams?.get("preview_theme") ?? null;
	const previewDevice = searchParams?.get("preview_device") ?? null;

	const tenantSlug = useMemo(() => {
		const prefix = getTenantPrefixFromPathname(pathname ?? "/");
		return prefix ? prefix.slice(1).toLowerCase() : null;
	}, [pathname]);

	const homePath = useMemo(() => getTenantScopedPath(pathname ?? "/", "/"), [pathname]);
	const menuPath = useMemo(() => getTenantScopedPath(pathname ?? "/", "/menu"), [pathname]);
	const menuScopePath = useMemo(() => getTenantScopedPath(pathname ?? "/", "/menu/"), [pathname]);
	const menuServiceWorkerPath = useMemo(() => getTenantScopedPath(pathname ?? "/", "/menu/sw.js"), [pathname]);

	const hasOpenBranches = (openBranchIds ?? []).length > 0;
	const [isLocationModalOpen, setIsLocationModalOpen] = useState(!isEmbeddedPreview && !selectedBranchId);

	useEffect(() => {
		productsByIdRef.current = new Map(products.map((product) => [product.id, product]));
	}, [products]);

	useMenuPreviewTheme({
		previewThemeParam,
		isEmbeddedPreview,
		initialNavbarType,
		initialNavigationMode,
		initialProductCardStyle,
		initialProductDetailsMode,
		setNavbarType,
		setNavigationMode,
		setCardStyle,
		setDetailsMode,
		setPreviewDisplayName,
		setPreviewLogoUrl,
	});

	useEffect(() => {
		if (isEmbeddedPreview || typeof window === "undefined" || !("serviceWorker" in navigator)) return;
		void navigator.serviceWorker.register(menuServiceWorkerPath, { scope: menuScopePath }).catch(() => {});
	}, [isEmbeddedPreview, menuScopePath, menuServiceWorkerPath]);

	useEffect(() => {
		if (isEmbeddedPreview) {
			document.body.style.overflow = "";
			return;
		}
		document.body.style.overflow = isLocationModalOpen ? "hidden" : "";
		return () => { document.body.style.overflow = ""; };
	}, [isEmbeddedPreview, isLocationModalOpen]);

	useEffect(() => {
		if (isEmbeddedPreview) return;
		if (!selectedBranchId) queueMicrotask(() => setIsLocationModalOpen(true));
	}, [isEmbeddedPreview, selectedBranchId]);

	const selectedBranch = useMemo(
		() => branches.find((branch) => branch.id === selectedBranchId) ?? null,
		[branches, selectedBranchId],
	);
	const effectiveCountry = selectedBranch?.country || country;
	const effectiveCurrency = selectedBranch?.currency || currency;
	const companyId = useMemo(
		() => selectedBranch?.company_id ?? branches[0]?.company_id ?? null,
		[selectedBranch?.company_id, branches],
	);
	const exchangeRate = useMemo(
		() => (selectedBranch ? normalizeDeliverySettings(selectedBranch.delivery_settings)?.exchangeRate ?? null : null),
		[selectedBranch],
	);

	useMenuRealtime(isEmbeddedPreview ? null : companyId, isEmbeddedPreview ? null : selectedBranchId, router, {
		deferMs: isLowEnd ? 8000 : undefined,
	});

	const displayName = previewDisplayName || name;
	const effectiveLogoUrl = previewLogoUrl || logoUrl;
	const showBottomNav = shouldShowBottomNav(cardStyle, navbarType);
	const cartUiMode = resolveMenuCartUiMode({
		hasBranch: Boolean(selectedBranch),
		onlineOrderingEnabled,
		showBottomNav,
	});
	const visibleCategories = useMemo(() => [...categories], [categories]);
	const showContactTab = shouldShowContactTab(branches, selectedBranchId);
	const availableContactChannels = useMemo(
		() => getAvailableContactChannels(branches, selectedBranchId),
		[branches, selectedBranchId],
	);

	const closeInlinePanel = useCallback(() => setExpandedInlineProductId(null), []);
	const closeModal = useCallback(() => setSelectedProductDetails(null), []);
	const resetInlineOnNavigation = useCallback(() => setExpandedInlineProductId(null), []);

	const handleProductClick = useCallback((productId: string) => {
		const product = productsByIdRef.current.get(productId);
		if (!product) return;
		if (detailsMode === "modal-premium") {
			setSelectedProductDetails(product);
			return;
		}
		if (detailsMode === "inline") {
			setExpandedInlineProductId((prev) => (prev === product.id ? null : product.id));
		}
	}, [detailsMode]);

	const {
		specialProducts,
		filteredBySearch,
		query,
		productsByCategory,
		categoriesList,
	} = useMenuCatalogData(products, categories, searchQuery, visibleCategories, setActiveCategory);

	const catalogProductCount = useMemo(
		() => countVisibleCatalogProducts(specialProducts.length, visibleCategories, productsByCategory),
		[productsByCategory, specialProducts.length, visibleCategories],
	);
	const effectiveNavigationMode = useMemo(
		() => resolveEffectiveNavigationMode(navigationMode, catalogProductCount, isLowEnd),
		[catalogProductCount, isLowEnd, navigationMode],
	);
	const useVirtualizedCatalog = shouldVirtualizeMenuCatalog(query, effectiveNavigationMode, catalogProductCount);

	const handleScrollSpyCategoryChange = useCallback((id: string) => {
		startTransition(() => {
			setActiveCategory(id);
		});
	}, []);

	const catalogScrollRef = useRef<MenuCatalogScrollController | null>(null);

	const { scrollToCategory, scrollToHome, observerBlockRef } = useMenuCategoryScroll({
		navigationMode: effectiveNavigationMode,
		navbarType,
		query,
		visibleCategoryIds: visibleCategories.map((c) => c.id),
		specialProductsCount: specialProducts.length,
		activeCategory,
		setActiveCategory,
		onNavigate: resetInlineOnNavigation,
		setActiveBottomTab,
		catalogScrollRef,
		useVirtualizedCatalog,
	});

	const handleCategoryClick = useCallback((id: string) => {
		resetInlineOnNavigation();
		scrollToCategory(id, { syncNavbar: true });
	}, [resetInlineOnNavigation, scrollToCategory]);

	const totalItems = useCartStore((state) =>
		state.cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
	);
	const isCartOpen = useCartStore((state) => state.isCartOpen);
	const openCart = useCartStore((state) => state.openCart);
	const closeCart = useCartStore((state) => state.closeCart);

	const handleCartToggle = useCallback(() => {
		if (isCartOpen) closeCart?.();
		else openCart?.();
	}, [closeCart, isCartOpen, openCart]);

	const menuOverlayDepth =
		(isContactChannelSheetOpen ? 1 : 0)
		+ (isContactBranchModalOpen ? 1 : 0)
		+ (selectedProductDetails ? 1 : 0)
		+ (isLocationModalOpen ? 1 : 0)
		+ (isMegaMenuOpen ? 1 : 0);

	useOverlayHistoryDepthSync(menuOverlayDepth, "menu-overlays");

	useMenuOverlayHistory([
		{
			id: "contact-sheet",
			priority: TENANT_OVERLAY_PRIORITIES.contactSheet,
			isOpen: isContactChannelSheetOpen,
			onClose: () => {
				setIsContactChannelSheetOpen(false);
				setActiveBottomTab((tab) => (tab === "contact" ? "home" : tab));
			},
		},
		{
			id: "contact-branch",
			priority: TENANT_OVERLAY_PRIORITIES.contactBranch,
			isOpen: isContactBranchModalOpen,
			onClose: () => {
				setIsContactBranchModalOpen(false);
				setPendingContactChannel(null);
			},
		},
		{
			id: "product-details",
			priority: TENANT_OVERLAY_PRIORITIES.productDetails,
			isOpen: Boolean(selectedProductDetails),
			onClose: () => setSelectedProductDetails(null),
		},
		{
			id: "branch-selector",
			priority: TENANT_OVERLAY_PRIORITIES.branchSelector,
			isOpen: isLocationModalOpen,
			onClose: () => setIsLocationModalOpen(false),
		},
		{
			id: "mega-menu",
			priority: TENANT_OVERLAY_PRIORITIES.megaMenu,
			isOpen: isMegaMenuOpen,
			onClose: () => setIsMegaMenuOpen(false),
		},
	]);

	useEffect(() => {
		const onMenu = (pathname ?? "").split("?")[0].endsWith("/menu");
		if (!onMenu && isCartOpen) closeCart?.();
	}, [closeCart, isCartOpen, pathname]);

	useEffect(() => {
		queueMicrotask(() => setActiveBottomTab((tab) => {
			if (isCartOpen) return "cart";
			if (tab === "cart") return "home";
			return tab;
		}));
	}, [isCartOpen]);

	const closeContactUi = useCallback(() => {
		setIsContactChannelSheetOpen(false);
		setIsContactBranchModalOpen(false);
		setPendingContactChannel(null);
		setActiveBottomTab((tab) => (tab === "contact" ? "home" : tab));
	}, []);

	const handleContactBranchSelect = useCallback((branch: Pick<BranchInfo, "id" | "whatsapp_url" | "instagram_url" | "map_url">) => {
		if (pendingContactChannel) {
			openBranchContactUrl(branch, pendingContactChannel);
		}
		closeContactUi();
	}, [closeContactUi, pendingContactChannel]);

	const handleContactClick = useCallback(() => {
		const step = resolveContactFlowStep(branches, selectedBranchId);
		if (!step) return;

		if (step.type === "direct") {
			openBranchContactUrl(step.branch, step.channel);
			return;
		}

		setActiveBottomTab("contact");

		if (step.type === "pick-channel") {
			setIsContactChannelSheetOpen(true);
			return;
		}

		setPendingContactChannel(step.channel);
		setIsContactBranchModalOpen(true);
	}, [branches, selectedBranchId]);

	const handleContactChannelSelect = useCallback((channel: BranchContactChannel) => {
		setIsContactChannelSheetOpen(false);
		const eligible = getBranchesWithContactChannel(branches, channel, selectedBranchId);
		if (eligible.length === 1) {
			openBranchContactUrl(eligible[0], channel);
			closeContactUi();
			return;
		}
		setPendingContactChannel(channel);
		setIsContactBranchModalOpen(true);
	}, [branches, closeContactUi, selectedBranchId]);

	const modalBranches = useMemo(
		() => buildModalBranchItems(branches, openBranchIds, hasOpenBranches),
		[branches, openBranchIds, hasOpenBranches],
	);

	const handleBranchSelect = useCallback((branch: BranchModalItem) => {
		setIsLocationModalOpen(false);
		const embedded = isEmbeddedPreview || readEmbeddedPreviewFromLocation();
		const nextPath = mergeMenuPathQuery(menuPath, {
			branch: String(branch.id),
			...(embedded
				? {
					embedded_preview: "1",
					preview_device: previewDevice ?? "mobile",
				}
				: {}),
		});
		router.replace(nextPath);
	}, [isEmbeddedPreview, menuPath, previewDevice, router]);

	const previewDeviceClass = isEmbeddedPreview
		? previewDevice === "tablet"
			? "preview-device-tablet"
			: previewDevice === "desktop"
				? "preview-device-desktop"
				: "preview-device-mobile"
		: "";

	const pageClassName = `page-wrapper navbar-type-${navbarType} nav-mode-${effectiveNavigationMode} card-style-${cardStyle} cart-ui-${cartUiMode}${onlineOrderingEnabled === false ? " online-ordering-disabled" : ""}${isLowEnd ? " low-end-device" : ""}${previewDeviceClass ? ` ${previewDeviceClass}` : ""}${isEmbeddedPreview ? " embedded-preview" : ""}`;

	const navbar = (
		<MenuNavbar
			navbarType={navbarType}
			displayName={displayName}
			logoUrl={effectiveLogoUrl}
			logoError={logoError}
			onLogoError={() => setLogoError(true)}
			selectedBranch={selectedBranch}
			isEmbeddedPreview={isEmbeddedPreview}
			onOpenBranchModal={() => setIsLocationModalOpen(true)}
			onBackHome={() => {
				if (isEmbeddedPreview || readEmbeddedPreviewFromLocation()) return;
				router.push(homePath);
			}}
			searchQuery={searchQuery}
			searchExpanded={searchExpanded}
			searchInputRef={searchInputRef}
			onSearchChange={setSearchQuery}
			onSearchExpand={() => {
				setSearchExpanded(true);
				setTimeout(() => searchInputRef.current?.focus(), 150);
			}}
			onSearchCollapse={() => setSearchExpanded(false)}
			onOpenMegaMenu={() => setIsMegaMenuOpen(true)}
			categories={categoriesList}
			visibleCategories={visibleCategories}
			specialProductsCount={specialProducts.length}
			fireIcon={FIRE_ICON}
			activeCategory={activeCategory}
			onCategoryClick={handleCategoryClick}
		/>
	);

	const cartUi = (
		<MenuCartLayer
			selectedBranch={selectedBranch}
			showBottomNav={showBottomNav}
			onlineOrderingEnabled={onlineOrderingEnabled}
			orderChannel={orderChannel}
			effectiveCurrency={effectiveCurrency}
			businessName={name}
			businessInfo={businessInfo}
			totalItems={totalItems}
			activeBottomTab={activeBottomTab}
			showContactTab={showContactTab}
			onHome={scrollToHome}
			onCart={handleCartToggle}
			onContact={handleContactClick}
		/>
	);

	return {
		tenantSlug,
		selectedBranch,
		effectiveCountry,
		effectiveCurrency,
		mounted,
		pageClassName,
		navbarType,
		navigationMode: effectiveNavigationMode,
		isLowEnd,
		displayName,
		effectiveLogoUrl,
		logoError,
		setLogoError,
		isEmbeddedPreview,
		categoriesList,
		activeCategory,
		handleCategoryClick,
		handleScrollSpyCategoryChange,
		catalogScrollRef,
		observerBlockRef,
		setActiveCategory,
		navbar,
		cartUi,
		query,
		searchQuery,
		activeBottomTab,
		specialProducts,
		visibleCategories,
		productsByCategory,
		filteredBySearch,
		cardStyle,
		detailsMode,
		exchangeRate,
		expandedInlineProductId,
		handleProductClick,
		closeInlinePanel,
		inlinePanelRef,
		selectedProductDetails,
		closeModal,
		onlineOrderingEnabled,
		isLocationModalOpen,
		setIsLocationModalOpen,
		modalBranches,
		branches,
		handleBranchSelect,
		selectedBranchId,
		businessName: name,
		businessSchedule: businessInfo?.schedule,
		isMegaMenuOpen,
		setIsMegaMenuOpen,
		showMegaMenuFab: navbarType === "mega-menu" && !showBottomNav,
		banners: props.banners ?? [],
		showContactTab,
		availableContactChannels,
		isContactChannelSheetOpen,
		isContactBranchModalOpen,
		pendingContactChannel,
		closeContactUi,
		handleContactChannelSelect,
		handleContactBranchSelect,
	};
}
