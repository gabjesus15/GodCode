"use client";

import { useCallback, useEffect, useRef } from "react";

import {
	applyEmbeddedPreviewThemeStyles,
	applyThemeCssVarsToRoot,
	sanitizeThemeImageUrl,
} from "@/lib/store-theme/apply-theme-css-vars";
import {
	isPreviewThemeMessage,
	readEmbeddedPreviewFromLocation,
	readPreviewThemeParamFromLocation,
} from "@/lib/store-theme/preview-theme-messaging";
import { decodePreviewThemeParam } from "@/lib/store-theme/preview-theme-codec";
import { applyTenantSurfaceCssVars } from "@/lib/store-theme/surface-theme";
import {
	normalizeNavbarType,
	normalizeNavigationMode,
	normalizeProductCardStyle,
	normalizeMenuLayout,
	normalizeProductDetailsMode,
	type MenuLayoutConfig,
} from "@/lib/store-theme/theme-config";
import type { PreviewThemePayload } from "./menu-types";

type UseMenuPreviewThemeArgs = {
	previewThemeParam: string | null;
	isEmbeddedPreview: boolean;
	initialNavbarType: string;
	initialNavigationMode: string;
	initialProductCardStyle: string;
	initialProductDetailsMode: string;
	initialMenuLayout: MenuLayoutConfig;
	setMenuLayout: (v: MenuLayoutConfig) => void;
	setNavbarType: (v: string) => void;
	setNavigationMode: (v: string) => void;
	setCardStyle: (v: string) => void;
	setDetailsMode: (v: string) => void;
	setPreviewDisplayName: (v: string | null) => void;
	setPreviewLogoUrl: (v: string | null) => void;
};

export function useMenuPreviewTheme({
	previewThemeParam,
	isEmbeddedPreview,
	initialNavbarType,
	initialNavigationMode,
	initialProductCardStyle,
	initialProductDetailsMode,
	initialMenuLayout,
	setMenuLayout,
	setNavbarType,
	setNavigationMode,
	setCardStyle,
	setDetailsMode,
	setPreviewDisplayName,
	setPreviewLogoUrl,
}: UseMenuPreviewThemeArgs) {
	const initialRef = useRef({
		navbarType: initialNavbarType,
		navigationMode: initialNavigationMode,
		productCardStyle: initialProductCardStyle,
		productDetailsMode: initialProductDetailsMode,
		menuLayout: initialMenuLayout,
	});

	useEffect(() => {
		initialRef.current = {
			navbarType: initialNavbarType,
			navigationMode: initialNavigationMode,
			productCardStyle: initialProductCardStyle,
			productDetailsMode: initialProductDetailsMode,
			menuLayout: initialMenuLayout,
		};
	}, [initialNavbarType, initialNavigationMode, initialProductCardStyle, initialProductDetailsMode, initialMenuLayout]);

	const embeddedLivePreviewRef = useRef(false);
	const revertCssRef = useRef<(() => void) | null>(null);
	const revertSurfaceRef = useRef<(() => void) | null>(null);

	const isReallyEmbedded =
		isEmbeddedPreview
		|| (typeof window !== "undefined" && readEmbeddedPreviewFromLocation());
	const isReallyEmbeddedRef = useRef(isReallyEmbedded);

	useEffect(() => {
		isReallyEmbeddedRef.current = isReallyEmbedded;
	}, [isReallyEmbedded]);

	const applyPreviewTheme = useCallback((previewTheme: PreviewThemePayload, _source: string) => {
		const initial = initialRef.current;
		const nextNavbar = normalizeNavbarType(previewTheme.navbarType || initial.navbarType);
		const nextCard = normalizeProductCardStyle(previewTheme.productCardStyle || initial.productCardStyle);

		setNavbarType(nextNavbar);
		setNavigationMode(normalizeNavigationMode(previewTheme.navigationMode || initial.navigationMode));
		setCardStyle(nextCard);
		setDetailsMode(normalizeProductDetailsMode(previewTheme.productDetailsMode || initial.productDetailsMode));
		setMenuLayout(
			normalizeMenuLayout({
				...initial.menuLayout,
				...previewTheme,
				coverImageUrl: sanitizeThemeImageUrl(previewTheme.backgroundImageUrl) || initial.menuLayout.coverImageUrl,
			}),
		);
		setPreviewDisplayName(previewTheme.displayName?.trim() || null);
		setPreviewLogoUrl(sanitizeThemeImageUrl(previewTheme.logoUrl) || null);

		revertCssRef.current?.();
		revertCssRef.current = isReallyEmbeddedRef.current
			? applyEmbeddedPreviewThemeStyles(previewTheme)
			: applyThemeCssVarsToRoot(previewTheme);
		revertSurfaceRef.current?.();
		revertSurfaceRef.current = applyTenantSurfaceCssVars(previewTheme);
	}, [
		setNavbarType,
		setNavigationMode,
		setCardStyle,
		setDetailsMode,
		setMenuLayout,
		setPreviewDisplayName,
		setPreviewLogoUrl,
	]);

	const syncPublishedThemeFromServer = useCallback(() => {
		if (isReallyEmbeddedRef.current || readEmbeddedPreviewFromLocation()) {
			return;
		}

		const initial = initialRef.current;
		setNavbarType(initial.navbarType);
		setNavigationMode(initial.navigationMode);
		setCardStyle(initial.productCardStyle);
		setDetailsMode(initial.productDetailsMode);
		setMenuLayout(initial.menuLayout);
		setPreviewDisplayName(null);
		setPreviewLogoUrl(null);
		revertCssRef.current?.();
		revertCssRef.current = null;
		revertSurfaceRef.current?.();
		revertSurfaceRef.current = null;
	}, [
		setNavbarType,
		setNavigationMode,
		setCardStyle,
		setDetailsMode,
		setMenuLayout,
		setPreviewDisplayName,
		setPreviewLogoUrl,
	]);

	useEffect(() => {
		if (!isReallyEmbedded || typeof window === "undefined") return;

		const onMessage = (event: MessageEvent) => {
			if (event.origin !== window.location.origin) return;
			if (!isPreviewThemeMessage(event.data)) return;
			embeddedLivePreviewRef.current = true;
			applyPreviewTheme(event.data.theme, "postMessage");
		};

		window.addEventListener("message", onMessage);
		return () => window.removeEventListener("message", onMessage);
	}, [applyPreviewTheme, isReallyEmbedded]);

	useEffect(() => {
		if (!isReallyEmbedded || embeddedLivePreviewRef.current) return;

		const encoded = previewThemeParam ?? readPreviewThemeParamFromLocation();
		const previewTheme = decodePreviewThemeParam<PreviewThemePayload>(encoded);
		if (!previewTheme) return;

		applyPreviewTheme(previewTheme, "embedded-url");
	}, [applyPreviewTheme, isReallyEmbedded, previewThemeParam]);

	useEffect(() => {
		if (isReallyEmbedded) return;

		const previewTheme = decodePreviewThemeParam<PreviewThemePayload>(previewThemeParam);
		if (previewTheme) {
			applyPreviewTheme(previewTheme, "non-embedded-url");
			return;
		}

		syncPublishedThemeFromServer();
	}, [
		applyPreviewTheme,
		isReallyEmbedded,
		previewThemeParam,
		initialNavbarType,
		initialNavigationMode,
		initialProductCardStyle,
		initialProductDetailsMode,
		initialMenuLayout,
		syncPublishedThemeFromServer,
	]);

	useEffect(() => () => {
		revertCssRef.current?.();
		revertSurfaceRef.current?.();
	}, []);
}
