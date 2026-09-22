"use client";

import { useEffect, type RefObject } from "react";

/** Debajo de esto el gesto es un toque; por encima el panel empieza a seguir el dedo. */
const DRAG_START_PX = 8;
/** Arrastre a partir del cual soltar cierra, aunque el dedo vaya lento. */
const DISMISS_PX = 110;
/** Un "flick" corto pero rápido también cierra. */
const DISMISS_VELOCITY = 0.55;
const MOBILE_QUERY = "(max-width: 480px)";

export type UseSheetDismissOptions = {
	enabled: boolean;
	onDismiss: () => void;
};

/**
 * Arrastrar la cabecera hacia abajo cierra el panel, como una sheet nativa.
 * El panel sigue al dedo (con resistencia) y, si no llega, vuelve solo. Solo
 * en teléfono: en escritorio el panel entra de costado y no hay dedo.
 */
export function useSheetDismiss(
	panelRef: RefObject<HTMLElement | null>,
	handleRef: RefObject<HTMLElement | null>,
	{ enabled, onDismiss }: UseSheetDismissOptions,
): void {
	useEffect(() => {
		const panel = panelRef.current;
		const handle = handleRef.current;
		if (!enabled || !panel || !handle) return;
		if (!window.matchMedia(MOBILE_QUERY).matches) return;

		let pointerId: number | null = null;
		let startY = 0;
		let startTime = 0;
		let dragging = false;
		let lastDy = 0;

		const settle = () => {
			panel.style.transition = "transform 240ms cubic-bezier(0.16, 1, 0.3, 1)";
			panel.style.transform = "";
			const clear = () => {
				panel.style.transition = "";
				panel.removeEventListener("transitionend", clear);
			};
			panel.addEventListener("transitionend", clear);
		};

		const onDown = (event: PointerEvent) => {
			if (event.pointerType !== "touch" || pointerId !== null) return;
			pointerId = event.pointerId;
			startY = event.clientY;
			startTime = event.timeStamp;
			dragging = false;
			lastDy = 0;
		};

		const onMove = (event: PointerEvent) => {
			if (event.pointerId !== pointerId) return;
			const dy = event.clientY - startY;
			if (!dragging) {
				if (dy < DRAG_START_PX) return;
				dragging = true;
				handle.setPointerCapture(pointerId);
				panel.style.transition = "none";
			}
			// Resistencia suave: el panel se mueve algo menos que el dedo.
			lastDy = Math.max(0, dy) * 0.85;
			panel.style.transform = `translateY(${lastDy}px)`;
			event.preventDefault();
		};

		const finish = (event: PointerEvent) => {
			if (event.pointerId !== pointerId) return;
			const wasDragging = dragging;
			const elapsed = Math.max(1, event.timeStamp - startTime);
			const velocity = lastDy / elapsed;
			pointerId = null;
			dragging = false;
			if (!wasDragging) return;
			if (lastDy > DISMISS_PX || velocity > DISMISS_VELOCITY) {
				// La animación de salida arranca desde donde quedó el dedo.
				panel.style.transition = "";
				onDismiss();
				return;
			}
			settle();
		};

		handle.addEventListener("pointerdown", onDown);
		handle.addEventListener("pointermove", onMove);
		handle.addEventListener("pointerup", finish);
		handle.addEventListener("pointercancel", finish);
		return () => {
			handle.removeEventListener("pointerdown", onDown);
			handle.removeEventListener("pointermove", onMove);
			handle.removeEventListener("pointerup", finish);
			handle.removeEventListener("pointercancel", finish);
			panel.style.transform = "";
			panel.style.transition = "";
		};
	}, [enabled, handleRef, onDismiss, panelRef]);
}
