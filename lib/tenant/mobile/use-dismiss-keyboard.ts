"use client";

import { useEffect, type RefObject } from "react";

const INTERACTIVE_SELECTOR =
	"input, textarea, select, button, a, [contenteditable='true'], label";

function shouldDismissKeyboard(target: EventTarget | null): boolean {
	if (!(target instanceof Element)) return false;
	if (target.closest(INTERACTIVE_SELECTOR)) return false;
	return true;
}

export function blurActiveInput() {
	if (typeof document === "undefined") return;
	const active = document.activeElement;
	if (active instanceof HTMLElement) {
		active.blur();
	}
}

/** Cierra el teclado al tocar fuera de campos editables dentro del contenedor. */
export function useDismissKeyboardOnOutsideTap(containerRef: RefObject<HTMLElement | null>) {
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const onPointerDown = (event: PointerEvent) => {
			if (!shouldDismissKeyboard(event.target)) return;
			blurActiveInput();
		};

		container.addEventListener("pointerdown", onPointerDown);
		return () => container.removeEventListener("pointerdown", onPointerDown);
	}, [containerRef]);
}
