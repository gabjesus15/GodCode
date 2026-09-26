import { gtag, getGaMeasurementId } from "@/lib/analytics/gtag";
import { randomId } from "@/lib/analytics/random-id";
import { sanitizeAnalyticsPath } from "@/lib/analytics/sanitize-path";

const VISITOR_KEY = "gc_visitor_id";
const SESSION_KEY = "gc_session_id";

export function getOrCreateVisitorId(): string {
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

export function getOrCreateSessionId(): string {
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

/** Envía a `/api/analytics/events` sin bloquear la navegación (beacon, o fetch keepalive). */
export function sendInternalAnalyticsEvent(payload: Record<string, unknown>) {
	const body = JSON.stringify(payload);
	try {
		if (navigator.sendBeacon) {
			navigator.sendBeacon("/api/analytics/events", new Blob([body], { type: "application/json" }));
			return;
		}
	} catch {
		// Fallback a fetch.
	}
	void fetch("/api/analytics/events", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body,
		keepalive: true,
		cache: "no-store",
	}).catch(() => {});
}

export type AnalyticsEventParams = Record<string, string | number | boolean | null | undefined>;

/**
 * Evento de conversión: va a Google Analytics y a la tabla propia `analytics_events`
 * (la misma que alimenta los paneles). Los parámetros nunca llevan datos personales.
 */
export function trackEvent(name: string, params: AnalyticsEventParams = {}) {
	if (typeof window === "undefined") return;

	const clean = Object.fromEntries(Object.entries(params).filter(([, value]) => value != null && value !== ""));
	const path = sanitizeAnalyticsPath(window.location.pathname, "");

	// En desarrollo no se ensucian los datos reales: el evento queda disponible para depurar
	// con `window.addEventListener("gc:analytics", …)`.
	if (process.env.NODE_ENV !== "production") {
		window.dispatchEvent(new CustomEvent("gc:analytics", { detail: { name, params: clean } }));
		return;
	}

	const measurementId = getGaMeasurementId();
	if (measurementId) gtag("event", name, { send_to: measurementId, ...clean });

	sendInternalAnalyticsEvent({
		event: name,
		path,
		referrer: document.referrer || null,
		title: document.title || null,
		visitorId: getOrCreateVisitorId(),
		sessionId: getOrCreateSessionId(),
		metadata: clean,
	});
}
