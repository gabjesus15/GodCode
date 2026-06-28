declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
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
  params?: Record<string, string | number | boolean | null | undefined>
) {
  gtag("event", action, params);
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
