"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { isInternalAnalyticsPath, resolveAnalyticsPageContext } from "@/lib/analytics/page-context";
import { trackGaPageView } from "@/lib/analytics/gtag";
import {
	getOrCreateSessionId,
	getOrCreateVisitorId,
	sendInternalAnalyticsEvent,
} from "@/lib/analytics/track-event";
import { sanitizeAnalyticsPath } from "@/lib/analytics/sanitize-path";

const LAST_EVENT_KEY = "gc_last_page_view";

function wasAlreadySent(key: string): boolean {
	try {
		const prev = sessionStorage.getItem(LAST_EVENT_KEY);
		if (prev === key) return true;
		sessionStorage.setItem(LAST_EVENT_KEY, key);
		return false;
	} catch {
		return false;
	}
}

export function PageAnalyticsTracker() {
	const pathname = usePathname();
	const searchParams = useSearchParams();

	useEffect(() => {
		if (!pathname || isInternalAnalyticsPath(pathname)) return;

		const runTracking = () => {
			// Sin tokens ni referencias: la ruta va a Google Analytics y a analytics_events.
			const path = sanitizeAnalyticsPath(pathname, searchParams?.toString() || "");
			const dedupeKey = `page_view:${path}`;
			if (wasAlreadySent(dedupeKey)) return;

			const host = typeof window !== "undefined" ? window.location.host : null;
			const { pageType, tenantSlug } = resolveAnalyticsPageContext({ pathname: path, host });
			const title = typeof document !== "undefined" ? document.title || null : null;

			trackGaPageView({
				path,
				title,
				pageType,
				tenantSlug,
			});

			const payload = {
				event: "page_view",
				path,
				referrer: typeof document !== "undefined" ? document.referrer || null : null,
				title,
				visitorId: getOrCreateVisitorId(),
				sessionId: getOrCreateSessionId(),
				metadata: {
					page_type: pageType,
					tenant_slug: tenantSlug,
				},
			};

			sendInternalAnalyticsEvent(payload);
		};

		let idleId: ReturnType<typeof setTimeout> | number = 0;
		if (typeof window !== "undefined" && "requestIdleCallback" in window) {
			idleId = window.requestIdleCallback(() => runTracking(), { timeout: 2500 });
		} else {
			idleId = setTimeout(runTracking, 1200);
		}

		return () => {
			if (typeof window !== "undefined" && "cancelIdleCallback" in window && typeof idleId === "number") {
				window.cancelIdleCallback(idleId);
			} else {
				clearTimeout(idleId as ReturnType<typeof setTimeout>);
			}
		};
	}, [pathname, searchParams]);

	return null;
}
