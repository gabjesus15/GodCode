"use client";

import { useEffect } from "react";

import { trackEvent } from "@/lib/analytics/track-event";

type ContactMethod = "whatsapp" | "instagram" | "linkedin" | "email";

function contactMethodFor(href: string): ContactMethod | null {
	if (/wa\.me|whatsapp\.com/i.test(href)) return "whatsapp";
	if (/instagram\.com/i.test(href)) return "instagram";
	if (/linkedin\.com/i.test(href)) return "linkedin";
	if (href.startsWith("mailto:")) return "email";
	return null;
}

/** Zona de la página donde ocurrió el clic: sirve para saber qué CTA convierte. */
function zoneFor(el: Element): string {
	const explicit = el.closest<HTMLElement>("[data-track-zone]")?.dataset.trackZone;
	if (explicit) return explicit;
	if (el.closest("[data-landing-hero]")) return "hero";
	if (el.closest("#landing-mobile-menu")) return "menu_movil";
	if (el.closest("header")) return "navbar";
	if (el.closest("aside")) return "dock";
	if (el.closest("footer")) return "footer";
	return el.closest("section[id]")?.id ?? "otro";
}

/**
 * Un solo listener delegado para toda la landing: registra los clics que importan
 * para vender (ir al registro, contactar, elegir plan) sin tocar cada botón.
 */
export function LandingConversionTracker() {
	useEffect(() => {
		const onClick = (event: MouseEvent) => {
			const link = (event.target as Element | null)?.closest?.("a[href]");
			if (!(link instanceof HTMLAnchorElement)) return;

			const href = link.getAttribute("href") ?? "";
			const zone = zoneFor(link);

			const method = contactMethodFor(href);
			if (method) {
				trackEvent("contact_click", { method, zone });
				return;
			}

			// Solo el inicio del registro; /onboarding/negocios, /terminos y /privacidad no son CTA.
			if (/^\/onboarding(?:[?#]|$)/.test(href)) {
				const plan = link.dataset.plan;
				if (plan) trackEvent("plan_select", { plan_name: plan, zone });
				// aria-label primero: la cinta repite su texto en bucle y los planes nombran el plan.
				const label = link.getAttribute("aria-label") ?? link.textContent ?? "";
				trackEvent("cta_click", { zone, cta_text: label.trim().slice(0, 40) || undefined });
			}
		};

		// Captura: se registra aunque otro handler detenga la propagación o navegue enseguida.
		document.addEventListener("click", onClick, { capture: true });
		return () => document.removeEventListener("click", onClick, { capture: true });
	}, []);

	return null;
}
