/** Id aleatorio `prefijo_…` para visitante/sesión de analítica: usa crypto si existe y, si no, reloj + performance. */
export function randomId(prefix: string): string {
	const cryptoObj = typeof window !== "undefined" ? window.crypto : (typeof globalThis !== "undefined" ? globalThis.crypto : undefined);
	if (cryptoObj) {
		if (typeof cryptoObj.randomUUID === "function") {
			return `${prefix}_${cryptoObj.randomUUID()}`;
		}
		if (typeof cryptoObj.getRandomValues === "function") {
			const array = new Uint32Array(2);
			cryptoObj.getRandomValues(array);
			return `${prefix}_${Date.now()}_${array[0].toString(36)}${array[1].toString(36)}`;
		}
	}
	const timePart = Date.now().toString(36);
	const perfPart = typeof performance !== "undefined" ? Math.floor(performance.now() * 1000).toString(36) : "";
	return `${prefix}_${timePart}_${perfPart}`;
}
