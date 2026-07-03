"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { resolveAnalyticsPageContext } from "@/lib/analytics/page-context";
import { trackGaPageView } from "@/lib/analytics/gtag";

const VISITOR_KEY = "gc_visitor_id";
const SESSION_KEY = "gc_session_id";
const LAST_EVENT_KEY = "gc_last_page_view";

function randomId(prefix: string): string {
	const cryptoObj = typeof window !== "undefined" ? window.crypto : (typeof globalThis !== "undefined" ? globalThis.crypto : undefined);
	if (cryptoObj) {
		if (typeof cryptoObj.randomUUID === "function") {
			return `${prefix}_${cryptoObj.randomUUID()}`;
		}
		if (typeof cryptoObj.getRandomValues === "function") {
			const array = new Uint32Array(2);
			cryptoObj.getRandomValues(array);
			return `${prefix}_${Date.now()}_${array[0].toString(36)}${array[1].toString(36)}`;
		}
	}
	const timePart = Date.now().toString(36);
	const perfPart = typeof performance !== "undefined" ? Math.floor(performance.now() * 1000).toString(36) : "";
	return `${prefix}_${timePart}_${perfPart}`;
}

function getOrCreateVisitorId(): string {
	try {
		const existing = localStorage.getItem(VISITOR_KEY);
		if (existing && existing.trim()) return existing;
		const created = randomId("v");
		localStorage.setItem(VISITOR_KEY, created);
		return created;
	} catch {
		return randomId("v");
	}
}

function getOrCreateSessionId(): string {
	try {
		const existing = sessionStorage.getItem(SESSION_KEY);
		if (existing && existing.trim()) return existing;
		const created = randomId("s");
		sessionStorage.setItem(SESSION_KEY, created);
		return created;
	} catch {
		return randomId("s");
	}
}

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
		if (!pathname) return;

		const runTracking = () => {
			const qs = searchParams?.toString() || "";
			const path = qs ? `${pathname}?${qs}` : pathname;
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

			const body = JSON.stringify(payload);

			try {
				if (navigator.sendBeacon) {
					const blob = new Blob([body], { type: "application/json" });
					navigator.sendBeacon("/api/analytics/events", blob);
					return;
				}
			} catch {
				// Fallback to fetch below.
			}

			void fetch("/api/analytics/events", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body,
				keepalive: true,
				cache: "no-store",
			}).catch(() => {});
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
