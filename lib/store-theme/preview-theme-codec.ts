/** Codifica/decodifica tema para query `preview_theme` (soporta Unicode). */
export function encodePreviewThemeParam(theme: unknown): string {
	try {
		const json = JSON.stringify(theme);
		const bytes = new TextEncoder().encode(json);
		let binary = "";
		for (const byte of bytes) {
			binary += String.fromCharCode(byte);
		}
		return globalThis.btoa(binary);
	} catch {
		return "";
	}
}

export function decodePreviewThemeParam<T>(encodedValue: string | null): T | null {
	if (!encodedValue) return null;
	try {
		const binary = globalThis.atob(encodedValue);
		const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
		const decoded = new TextDecoder().decode(bytes);
		const parsed = JSON.parse(decoded) as T;
		if (!parsed || typeof parsed !== "object") return null;
		return parsed;
	} catch {
		return null;
	}
}
