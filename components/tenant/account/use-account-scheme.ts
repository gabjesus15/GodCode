"use client";

import { useCallback, useSyncExternalStore } from "react";

export type AccountScheme = "light" | "dark";

const STORAGE_KEY = "gcode:account-scheme";

/* Respaldo en memoria para cuando el almacenamiento falla (modo privado, bloqueado):
   el cambio se ve igual, solo no se recuerda en la próxima visita. */
let memoryScheme: AccountScheme = "light";
const listeners = new Set<() => void>();

function readScheme(): AccountScheme {
	try {
		const saved = window.localStorage.getItem(STORAGE_KEY);
		return saved === "dark" || saved === "light" ? saved : memoryScheme;
	} catch {
		return memoryScheme;
	}
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	// Otra pestaña cambió el modo: esta lo sigue.
	window.addEventListener("storage", listener);
	return () => {
		listeners.delete(listener);
		window.removeEventListener("storage", listener);
	};
}

/**
 * Claro u oscuro de "Mi cuenta", propio de esta pantalla: abre en claro sea cual sea
 * el fondo del menú, y la elección de la persona se recuerda en este dispositivo.
 * Se aplica con `data-menu-scheme` en `.account-page` (ver tenant-base.css).
 */
export function useAccountScheme() {
	// En el servidor siempre claro: es el modo por defecto.
	const scheme = useSyncExternalStore(subscribe, readScheme, () => "light" as const);

	const toggle = useCallback(() => {
		const next: AccountScheme = readScheme() === "light" ? "dark" : "light";
		memoryScheme = next;
		try {
			window.localStorage.setItem(STORAGE_KEY, next);
		} catch {
			// Se queda en memoria.
		}
		listeners.forEach((listener) => listener());
	}, []);

	return { scheme, toggle };
}
