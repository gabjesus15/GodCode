"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";

import { isInstagramVisit } from "@/lib/labs/source";

const DISMISSED_KEY = "labs-pos-banner-dismissed";

/* Un «store» mínimo: la visibilidad se lee del navegador (URL, referencia, sesión)
 * y cambia solo cuando el visitante cierra el aviso. */
const listeners = new Set<() => void>();
let dismissedNow = false;

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

function readDismissed(): boolean {
	if (dismissedNow) return true;
	try {
		return window.sessionStorage.getItem(DISMISSED_KEY) === "1";
	} catch {
		return false; // Sin almacenamiento (modo privado): el aviso vuelve a salir, sin más.
	}
}

function getSnapshot(): boolean {
	if (readDismissed()) return false;
	return isInstagramVisit({ search: window.location.search, referrer: document.referrer });
}

function getServerSnapshot(): boolean {
	return false;
}

function dismiss() {
	dismissedNow = true;
	try {
		window.sessionStorage.setItem(DISMISSED_KEY, "1");
	} catch {
		// Sin almacenamiento: queda cerrado durante esta vista.
	}
	for (const listener of listeners) listener();
}

type LabsSourceBannerProps = {
	/** Ruta del landing de Gcode POS. */
	href: string;
	productName: string;
};

/**
 * Aviso para quien llega desde Instagram buscando el producto: la cuenta habla sobre
 * todo de Gcode POS, y esa persona no quiere leer sobre un estudio de desarrollo.
 * Solo se pinta en el cliente y cuando la visita viene de Instagram, así que el
 * resto de visitantes nunca lo ve y el HTML del servidor no cambia.
 */
export function LabsSourceBanner({ href, productName }: LabsSourceBannerProps) {
	const visible = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
	if (!visible) return null;

	return (
		<div
			role="status"
			className="labs-rise mx-auto mb-8 flex max-w-xl flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-[#e6e6ec] bg-[#f5f5f7] py-2.5 pl-4 pr-2 text-left text-sm text-[#15151a]"
		>
			<p className="min-w-[12rem] flex-1">
				¿Buscas {productName}, el menú digital para restaurantes? Tiene su propia página.
			</p>
			<Link
				href={href}
				className="inline-flex items-center gap-1 rounded-full bg-[#15151a] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#2c2c34]"
			>
				Ir a {productName}
				<ArrowRight className="h-3 w-3" aria-hidden />
			</Link>
			<button
				type="button"
				onClick={dismiss}
				aria-label="Cerrar aviso"
				className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#6b6b76] transition-colors hover:text-[#15151a]"
			>
				<X className="h-4 w-4" aria-hidden />
			</button>
		</div>
	);
}
