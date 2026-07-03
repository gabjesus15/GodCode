import { TENANT_UI_CONFIG } from "@/lib/tenant/config/tenant-ui-config";

export type NavigationMode = "scroll" | "pagination";

/**
 * En gama baja con catálogos largos, paginación por categoría reduce DOM y scroll jank
 * sin cambiar la configuración guardada del tenant.
 */
export function resolveEffectiveNavigationMode(
	configuredMode: string,
	catalogProductCount: number,
	isLowEnd: boolean,
	threshold = TENANT_UI_CONFIG.virtualizeProductThreshold,
): NavigationMode {
	if (configuredMode === "pagination") return "pagination";
	if (isLowEnd && catalogProductCount >= threshold) return "pagination";
	return "scroll";
}
