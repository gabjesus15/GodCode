export const TENANT_UI_CONFIG = {
	/** Máximo de imágenes next/image con priority en toda la página menú */
	priorityImageMax: 6,
	/** Activar virtualización en scroll mode si productos visibles >= este valor */
	virtualizeProductThreshold: 30,
	/** Debounce refresh menú por realtime */
	menuRealtimeDebounceMs: 2500,
	/** Retraso antes de suscribir realtime del menú (ms) */
	menuRealtimeDeferMs: 4000,
	/** Debounce búsqueda dirección en cart */
	cartAddressDebounceMs: 420,
	cartGeocodeDebounceMs: 520,
} as const;

export const TENANT_OVERLAY_PRIORITIES = {
	/** Hoja de zonas de reparto: vive dentro del carrito, así que va por encima de él. */
	zoneSheet: 61,
	contactSheet: 60,
	contactBranch: 59,
	productDetails: 55,
	branchSelector: 52,
	megaMenu: 51,
	cart: 50,
} as const;
