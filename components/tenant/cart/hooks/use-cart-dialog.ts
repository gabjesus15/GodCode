"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE =
	'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Mientras el panel está abierto: bloquea el scroll del documento, mueve el foco
 * adentro, lo mantiene con Tab/Shift+Tab y lo devuelve al cerrar.
 */
export function useCartDialog(panelRef: RefObject<HTMLElement | null>, isOpen: boolean): void {
	useEffect(() => {
		if (!isOpen) return;
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		const panel = panelRef.current;
		const previouslyFocused = document.activeElement as HTMLElement | null;
		panel?.focus();

		const trapTab = (event: KeyboardEvent) => {
			if (event.key !== "Tab" || !panel) return;
			// Un <dialog> modal abierto dentro del carrito (p. ej. la hoja de zonas) atrapa su propio foco.
			if ((event.target as Element | null)?.closest?.("dialog[open]")) return;
			const focusable = panel.querySelectorAll<HTMLElement>(FOCUSABLE);
			if (focusable.length === 0) return;
			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		};
		panel?.addEventListener("keydown", trapTab);

		return () => {
			panel?.removeEventListener("keydown", trapTab);
			document.body.style.overflow = previousOverflow;
			previouslyFocused?.focus();
		};
	}, [isOpen, panelRef]);
}
