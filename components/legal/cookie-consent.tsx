"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { parseStoredConsent, serializeConsent, type AnalyticsConsentChoice } from "@/lib/legal/analytics-consent";
import { ANALYTICS_CONSENT_STORAGE_KEY, OPEN_COOKIE_SETTINGS_EVENT } from "@/lib/legal/legal-documents";

type ConsentChoice = AnalyticsConsentChoice;

/** Respaldo en memoria si el almacenamiento está bloqueado: la elección vale para esta visita. */
let sessionChoice: ConsentChoice | null = null;

/** Lee la elección guardada; si no hay o venció, devuelve null y el aviso se vuelve a mostrar. */
function readStoredChoice(): ConsentChoice | null {
	try {
		return parseStoredConsent(window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY), Date.now()) ?? sessionChoice;
	} catch {
		return sessionChoice;
	}
}

const CONSENT_CHANGED_EVENT = "gcode:consent-changed";

function subscribeToChoice(onChange: () => void) {
	window.addEventListener("storage", onChange);
	window.addEventListener(CONSENT_CHANGED_EVENT, onChange);
	return () => {
		window.removeEventListener("storage", onChange);
		window.removeEventListener(CONSENT_CHANGED_EVENT, onChange);
	};
}

/** En el servidor no hay elección que leer: el aviso no se pinta hasta hidratar. */
const SERVER_SNAPSHOT = "server";

function saveChoice(choice: ConsentChoice) {
	sessionChoice = choice;
	try {
		window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, serializeConsent(choice, Date.now()));
	} catch {
		// Navegación privada o almacenamiento bloqueado: queda `sessionChoice`.
	}
	window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT));
	// El layout deja Google Analytics en modo de consentimiento con la analítica denegada;
	// aquí solo se actualiza. Sin `gtag` (bloqueadores) no hay nada que avisar.
	if (typeof window.gtag === "function") {
		window.gtag("consent", "update", { analytics_storage: choice });
	}
}

/** Reabre el aviso desde cualquier enlace «Cookies» del sitio. */
function openCookieSettings() {
	window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT));
}

export function CookieSettingsButton() {
	return (
		<button
			type="button"
			onClick={openCookieSettings}
			className="mt-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
		>
			Cambiar mi elección de cookies
		</button>
	);
}

/**
 * Enlace «Cookies» para los pies de página: abre el aviso en vez de navegar. `label` sirve
 * cuando el mismo pie ya tiene un enlace «Cookies» a la política (p. ej. «Preferencias de cookies»).
 */
export function CookieSettingsLink({ className, label = "Cookies" }: { className?: string; label?: string }) {
	return (
		<button type="button" onClick={openCookieSettings} className={className}>
			{label}
		</button>
	);
}

/** Los dos botones del aviso van iguales: mismo relleno, mismo tamaño y foco visible. Rechazar cuesta lo mismo que aceptar. */
const CHOICE_BUTTON =
	"inline-flex min-h-[2.75rem] items-center justify-center rounded-full border border-white/15 bg-white/[0.06] px-5 py-2.5 font-semibold text-[#f4f4f5] transition-colors hover:bg-white/[0.12] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4f5bff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111113] sm:min-w-[10rem]";

/**
 * Aviso de cookies de las páginas de Gcode (sitio, registro y portal del negocio).
 * No se monta en los menús de los negocios: ahí Google Analytics funciona siempre
 * sin cookies, así que no hay nada que preguntar al comensal.
 *
 * Teclado: la primera vez no roba el foco (está al principio del documento, así que
 * es lo primero que se alcanza con Tab). Cuando alguien lo reabre desde un enlace
 * «Cookies», el foco entra en el aviso y, al elegir, vuelve a ese enlace.
 */
export function CookieConsentBanner() {
	const stored = useSyncExternalStore(subscribeToChoice, readStoredChoice, () => SERVER_SNAPSHOT);
	const [reopened, setReopened] = useState(false);
	const cardRef = useRef<HTMLDivElement>(null);
	const returnFocusRef = useRef<HTMLElement | null>(null);

	useEffect(() => {
		const reopen = () => {
			returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
			setReopened(true);
		};
		window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopen);
		return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopen);
	}, []);

	useEffect(() => {
		if (reopened) cardRef.current?.focus();
	}, [reopened]);

	if (!reopened && stored !== null) return null;

	const choose = (choice: ConsentChoice) => {
		saveChoice(choice);
		setReopened(false);
		const opener = returnFocusRef.current;
		returnFocusRef.current = null;
		if (opener?.isConnected) opener.focus();
	};

	return (
		// Tarjeta oscura con los tonos del landing (fondo #111113, borde blanco al 12 %, texto #d4d4d8):
		// no choca con el azul oscuro de la home y sobre las páginas claras del alta se lee como un aviso.
		<div
			ref={cardRef}
			tabIndex={-1}
			role="region"
			aria-labelledby="gcode-cookie-consent-title"
			aria-describedby="gcode-cookie-consent-text"
			className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-xl rounded-2xl border border-white/[0.12] bg-[#111113] p-4 text-sm text-[#d4d4d8] shadow-[0_24px_60px_-24px_rgba(0,0,0,0.6)] outline-none focus-visible:ring-2 focus-visible:ring-[#4f5bff]/70 sm:inset-x-4 sm:bottom-4 sm:p-5"
		>
			<p id="gcode-cookie-consent-title" className="font-semibold text-[#f4f4f5]">
				Cookies en Gcode
			</p>
			<p id="gcode-cookie-consent-text" className="mt-1.5 leading-relaxed">
				Usamos cookies esenciales para que puedas iniciar sesión. Con tu permiso, también usamos Google Analytics
				para entender cómo se usa Gcode. Más detalles en la{" "}
				<Link
					href="/onboarding/cookies"
					className="rounded-sm font-medium text-[#8b93ff] underline decoration-[#8b93ff]/40 underline-offset-2 transition-colors hover:text-white hover:decoration-white/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4f5bff]"
				>
					política de cookies
				</Link>
				.
			</p>
			<div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
				<button type="button" onClick={() => choose("denied")} className={CHOICE_BUTTON}>
					Solo esenciales
				</button>
				<button type="button" onClick={() => choose("granted")} className={CHOICE_BUTTON}>
					Aceptar medición
				</button>
			</div>
		</div>
	);
}
