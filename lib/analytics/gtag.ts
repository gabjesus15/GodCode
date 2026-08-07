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

export function trackEvent(
	action: string,
	params?: Record<string, string | number | boolean | null | undefined>,
) {
	gtag("event", action, params);
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
		page_location: window.location.href,
		...(params.pageType ? { page_type: params.pageType } : {}),
		...(params.tenantSlug ? { tenant_slug: params.tenantSlug } : {}),
	});
}

export const landingV2Events = {
	clickCreateStore: (location: string) =>
		trackEvent("click_create_store", { event_category: "conversion", location }),
	viewPricing: () => trackEvent("view_pricing", { event_category: "engagement" }),
	playDemo: () => trackEvent("play_demo", { event_category: "engagement" }),
	selectPlan: (planName: string) =>
		trackEvent("select_plan", { event_category: "conversion", plan_name: planName }),
	viewCaseStudy: (business: string) =>
		trackEvent("view_case_study", { event_category: "engagement", business }),
};
