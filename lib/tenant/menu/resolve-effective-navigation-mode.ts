export type NavigationMode = "scroll" | "pagination";

/**
 * Respeta el modo configurado en el tema del tenant.
 * Ya no se fuerza paginación en dispositivos low-end.
 */
export function resolveEffectiveNavigationMode(
	configuredMode: string,
): NavigationMode {
	if (configuredMode === "pagination") return "pagination";
	return "scroll";
}
