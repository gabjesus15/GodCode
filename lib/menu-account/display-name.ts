/**
 * Nombre corto de un cliente con cuenta: nombre de pila + inicial del apellido.
 *
 * Es lo único personal que queda en claro en su ficha de `clients` y en sus
 * pedidos: alcanza para que cocina y caja llamen a la persona ("Jhon B.") sin
 * dejar el nombre completo legible en la base. El completo va cifrado en la cuenta.
 */
export function shortDisplayName(fullName: string | null | undefined): string {
	const parts = String(fullName ?? "")
		.normalize("NFC")
		.trim()
		.split(/\s+/)
		.filter(Boolean);
	if (parts.length === 0) return "Cliente";
	const [first, ...rest] = parts;
	const lastInitial = rest.length > 0 ? Array.from(rest[rest.length - 1])[0] : "";
	return lastInitial ? `${first} ${lastInitial.toLocaleUpperCase("es")}.` : first;
}
