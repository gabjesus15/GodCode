"use client";



import { useCallback, useEffect, useRef } from "react";



import { debugIngest } from "@/lib/debug-ingest";

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

import {

	normalizeNavbarType,

	normalizeNavigationMode,

	normalizeProductCardStyle,

	normalizeProductDetailsMode,

} from "@/lib/store-theme/theme-config";

import type { PreviewThemePayload } from "./menu-types";



type UseMenuPreviewThemeArgs = {

	previewThemeParam: string | null;

	isEmbeddedPreview: boolean;

	initialNavbarType: string;

	initialNavigationMode: string;

	initialProductCardStyle: string;

	initialProductDetailsMode: string;

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

	});

	initialRef.current = {

		navbarType: initialNavbarType,

		navigationMode: initialNavigationMode,

		productCardStyle: initialProductCardStyle,

		productDetailsMode: initialProductDetailsMode,

	};



	const embeddedLivePreviewRef = useRef(false);

	const revertCssRef = useRef<(() => void) | null>(null);



	const isReallyEmbedded =

		isEmbeddedPreview

		|| (typeof window !== "undefined" && readEmbeddedPreviewFromLocation());

	const isReallyEmbeddedRef = useRef(isReallyEmbedded);

	isReallyEmbeddedRef.current = isReallyEmbedded;



	const applyPreviewTheme = useCallback((previewTheme: PreviewThemePayload, source: string) => {

		const initial = initialRef.current;

		const nextNavbar = normalizeNavbarType(previewTheme.navbarType || initial.navbarType);

		const nextCard = normalizeProductCardStyle(previewTheme.productCardStyle || initial.productCardStyle);

		// #region agent log

		debugIngest({

			location: "use-menu-preview-theme.ts:applyPreviewTheme",

			message: "applyPreviewTheme",

			data: { source, isReallyEmbedded: isReallyEmbeddedRef.current, nextNavbar, nextCard, primaryColor: previewTheme.primaryColor },

			hypothesisId: "H4",

			runId: "post-fix-2",

		});

		// #endregion

		setNavbarType(nextNavbar);

		setNavigationMode(normalizeNavigationMode(previewTheme.navigationMode || initial.navigationMode));

		setCardStyle(nextCard);

		setDetailsMode(normalizeProductDetailsMode(previewTheme.productDetailsMode || initial.productDetailsMode));

		setPreviewDisplayName(previewTheme.displayName?.trim() || null);

		setPreviewLogoUrl(sanitizeThemeImageUrl(previewTheme.logoUrl) || null);



		revertCssRef.current?.();

		revertCssRef.current = isReallyEmbeddedRef.current

			? applyEmbeddedPreviewThemeStyles(previewTheme)

			: applyThemeCssVarsToRoot(previewTheme);

	}, [

		setNavbarType,

		setNavigationMode,

		setCardStyle,

		setDetailsMode,

		setPreviewDisplayName,

		setPreviewLogoUrl,

	]);



	const resetToPublishedTheme = useCallback((source: string) => {

		if (isReallyEmbeddedRef.current || readEmbeddedPreviewFromLocation()) {

			// #region agent log

			debugIngest({

				location: "use-menu-preview-theme.ts:resetToPublishedTheme",

				message: "reset blocked (embedded)",

				data: { source },

				hypothesisId: "H1",

				runId: "post-fix-2",

			});

			// #endregion

			return;

		}

		const initial = initialRef.current;

		// #region agent log

		debugIngest({

			location: "use-menu-preview-theme.ts:resetToPublishedTheme",

			message: "resetToPublishedTheme",

			data: { source, resetNavbar: initial.navbarType },

			hypothesisId: "H1",

			runId: "post-fix-2",

		});

		// #endregion

		setNavbarType(initial.navbarType);

		setNavigationMode(initial.navigationMode);

		setCardStyle(initial.productCardStyle);

		setDetailsMode(initial.productDetailsMode);

		setPreviewDisplayName(null);

		setPreviewLogoUrl(null);

		revertCssRef.current?.();

		revertCssRef.current = null;

	}, [

		setNavbarType,

		setNavigationMode,

		setCardStyle,

		setDetailsMode,

		setPreviewDisplayName,

		setPreviewLogoUrl,

	]);



	useEffect(() => {

		if (!isReallyEmbedded || typeof window === "undefined") return;



		const onMessage = (event: MessageEvent) => {

			if (event.origin !== window.location.origin) {

				debugIngest({

					location: "use-menu-preview-theme.ts:onMessage",

					message: "origin mismatch",

					data: { eventOrigin: event.origin, windowOrigin: window.location.origin },

					hypothesisId: "H3",

					runId: "post-fix-2",

				});

				return;

			}

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

		debugIngest({

			location: "use-menu-preview-theme.ts:nonEmbeddedEffect",

			message: "non-embedded effect",

			data: { isEmbeddedPreview, isReallyEmbedded, hasPreviewParam: !!previewThemeParam },

			hypothesisId: "H1",

			runId: "post-fix-2",

		});

		if (isReallyEmbedded) return;



		const previewTheme = decodePreviewThemeParam<PreviewThemePayload>(previewThemeParam);

		if (!previewTheme) {

			resetToPublishedTheme("non-embedded-no-param");

			return;

		}



		return applyPreviewTheme(previewTheme, "non-embedded-url");

	}, [applyPreviewTheme, isReallyEmbedded, previewThemeParam, resetToPublishedTheme]);



	useEffect(() => () => {

		revertCssRef.current?.();

	}, []);

}

