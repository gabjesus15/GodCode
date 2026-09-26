declare global {
	interface Window {
		dataLayer: unknown[];
		gtag: (...args: unknown[]) => void;
	}
}

export function getGaMeasurementId(): string {
	return process.env.NEXT_PUBLIC_GA_ID?.trim() || "G-ZLTXLHNVNE";
}

export function gtag(...args: unknown[]) {
	if (typeof window === "undefined") return;
	window.dataLayer = window.dataLayer || [];
	if (typeof window.gtag === "function") {
		window.gtag(...args);
	}
}

export function trackGaPageView(params: {
	path: string;
	title?: string | null;
	pageType?: string;
	tenantSlug?: string | null;
}) {
	if (typeof window === "undefined") return;

	const measurementId = getGaMeasurementId();
	if (!measurementId) return;

	gtag("event", "page_view", {
		send_to: measurementId,
		page_path: params.path,
		page_title: params.title ?? document.title,
		// La ruta ya viene saneada; la URL completa del navegador podría llevar tokens.
		page_location: `${window.location.origin}${params.path}`,
		...(params.pageType ? { page_type: params.pageType } : {}),
		...(params.tenantSlug ? { tenant_slug: params.tenantSlug } : {}),
	});
}
