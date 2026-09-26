/**
 * Formato RUT chileno mientras el usuario escribe (puntos y guión).
 */
export function formatRutOnInput(value: string): string {
	if (!value) return "";
	const cleanRut = value.replace(/[^0-9kK]/g, "").toUpperCase();

	if (cleanRut.length === 0) {
		return "";
	}

	const body = cleanRut.slice(0, -1);
	const verifier = cleanRut.slice(-1);

	if (body === "") {
		return verifier;
	}

	const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
	return `${formattedBody}-${verifier}`;
}

/**
 * Valida RUT chileno (módulo 11).
 */
export function validateRutChile(rut: string): boolean {
	if (!rut) return false;
	const clean = rut.replace(/[^0-9kK]/g, "").toUpperCase();
	if (clean.length < 2) return false;

	const body = clean.slice(0, -1);
	const dv = clean.slice(-1);

	if (!/^\d+$/.test(body)) return false;

	let sum = 0;
	let multiplier = 2;

	for (let i = body.length - 1; i >= 0; i--) {
		sum += parseInt(body[i], 10) * multiplier;
		multiplier = multiplier === 7 ? 2 : multiplier + 1;
	}

	const res = 11 - (sum % 11);
	const expectedDv = res === 11 ? "0" : res === 10 ? "K" : res.toString();

	return dv === expectedDv;
}
