"use client";

import { useEffect } from "react";

/** Bloquea zoom por pinch/gestos, Ctrl/Cmd+rueda y atajos +/- del navegador. */
export function useAntiZoom() {
	useEffect(() => {
		const handleGestureStart = (event: Event) => event.preventDefault();
		const handleWheel = (event: WheelEvent) => {
			if (event.ctrlKey || event.metaKey) event.preventDefault();
		};
		const handleKeydown = (event: KeyboardEvent) => {
			if ((event.ctrlKey || event.metaKey) && ["+", "-", "=", "0"].includes(event.key)) {
				event.preventDefault();
			}
		};

		document.addEventListener("gesturestart", handleGestureStart);
		document.addEventListener("wheel", handleWheel, { passive: false });
		document.addEventListener("keydown", handleKeydown);

		return () => {
			document.removeEventListener("gesturestart", handleGestureStart);
			document.removeEventListener("wheel", handleWheel as EventListener);
			document.removeEventListener("keydown", handleKeydown);
		};
	}, []);
}
