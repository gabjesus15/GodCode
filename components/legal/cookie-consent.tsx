"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

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
export function openCookieSettings() {
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

/** Enlace «Cookies» para los pies de página: abre el aviso en vez de navegar. */
export function CookieSettingsLink({ className }: { className?: string }) {
	return (
		<button type="button" onClick={openCookieSettings} className={className}>
			Cookies
		</button>
	);
}

/**
 * Aviso de cookies de las páginas de Gcode (sitio, registro y portal del negocio).
 * No se monta en los menús de los negocios: ahí Google Analytics funciona siempre
 * sin cookies, así que no hay nada que preguntar al comensal.
 */
export function CookieConsentBanner() {
	const stored = useSyncExternalStore(subscribeToChoice, readStoredChoice, () => SERVER_SNAPSHOT);
	const [reopened, setReopened] = useState(false);

	useEffect(() => {
		const reopen = () => setReopened(true);
		window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopen);
		return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopen);
	}, []);

	if (!reopened && stored !== null) return null;

	const choose = (choice: ConsentChoice) => {
		saveChoice(choice);
		setReopened(false);
	};

	return (
		<div
			role="region"
			aria-label="Aviso de cookies"
			className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-lg sm:inset-x-4 sm:bottom-4 sm:p-5"
		>
			<p>
				Usamos cookies esenciales para que puedas iniciar sesión. Con tu permiso, también usamos Google Analytics
				para entender cómo se usa Gcode. Más detalles en la{" "}
				<Link href="/onboarding/cookies" className="font-medium text-indigo-600 hover:underline">
					política de cookies
				</Link>
				.
			</p>
			<div className="mt-3 flex flex-wrap justify-end gap-2">
				<button
					type="button"
					onClick={() => choose("denied")}
					className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
				>
					Solo esenciales
				</button>
				<button
					type="button"
					onClick={() => choose("granted")}
					className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800"
				>
					Aceptar medición
				</button>
			</div>
		</div>
	);
}
