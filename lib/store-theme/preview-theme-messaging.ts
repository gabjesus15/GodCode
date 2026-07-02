import { debugIngest } from "@/lib/debug-ingest";
import type { StoreThemeConfig } from "@/components/customer-portal/shared/customer-account-types";

export const PREVIEW_THEME_MESSAGE_TYPE = "godcode:preview-theme" as const;

export type PreviewThemeMessage = {
	type: typeof PREVIEW_THEME_MESSAGE_TYPE;
	theme: StoreThemeConfig;
};

export function isPreviewThemeMessage(data: unknown): data is PreviewThemeMessage {
	if (!data || typeof data !== "object") return false;
	const record = data as Record<string, unknown>;
	return record.type === PREVIEW_THEME_MESSAGE_TYPE && !!record.theme && typeof record.theme === "object";
}

export function postPreviewThemeToIframe(
	iframe: HTMLIFrameElement | null,
	theme: StoreThemeConfig,
	origin: string = typeof window !== "undefined" ? window.location.origin : "",
) {
	const hasWindow = !!iframe?.contentWindow;
	debugIngest({
		location: "preview-theme-messaging.ts:postPreviewThemeToIframe",
		message: "parent postMessage",
		data: { hasWindow, navbarType: theme.navbarType, primaryColor: theme.primaryColor },
		hypothesisId: "H3",
		runId: "post-fix-2",
	});
	if (!iframe?.contentWindow || !origin) return;
	iframe.contentWindow.postMessage({ type: PREVIEW_THEME_MESSAGE_TYPE, theme } satisfies PreviewThemeMessage, origin);
}

export function readPreviewThemeParamFromLocation(): string | null {
	if (typeof window === "undefined") return null;
	return new URLSearchParams(window.location.search).get("preview_theme");
}

export function readEmbeddedPreviewFromLocation(): boolean {
	if (typeof window === "undefined") return false;
	return new URLSearchParams(window.location.search).get("embedded_preview") === "1";
}
