/** Copia al portapapeles sin romper nada donde la API no existe o el permiso se niega. */
export function copyToClipboard(text: string): void {
	if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
		navigator.clipboard.writeText(text).catch(() => {});
	}
}
