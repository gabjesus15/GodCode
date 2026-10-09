/**
 * WhatsApp escrito a mano → enlace `wa.me`. Sin código de país, se completa con el del
 * país del negocio cuando es inequívoco (Chile: 9 dígitos que empiezan en 9; Venezuela: 11
 * que empiezan en 0, como 0412…).
 *
 * El WhatsApp de ventas del landing (`normalizeWhatsAppUrl` en `lib/landing/contact.ts`) usa
 * esta misma regla, sin país: si cambia aquí, cambia allí.
 */
export function whatsappUrlFromPhone(raw: string | null | undefined, country: string | null | undefined): string | null {
	const value = String(raw ?? "").trim();
	if (!value) return null;
	let digits = value.replace(/[^\d]/g, "");
	if (!value.startsWith("+")) {
		const c = String(country ?? "").trim().toLowerCase();
		if ((c === "chile" || c === "cl") && digits.length === 9 && digits.startsWith("9")) digits = `56${digits}`;
		else if ((c === "venezuela" || c === "ve") && digits.length === 11 && digits.startsWith("0")) digits = `58${digits.slice(1)}`;
	}
	if (digits.length < 8 || digits.length > 15) return null;
	return `https://wa.me/${digits}`;
}

/** El número de un enlace `wa.me` (o `api.whatsapp.com/send?phone=`), con `+`, para mostrarlo editable. */
export function phoneFromWhatsappUrl(url: string | null | undefined): string {
	const value = String(url ?? "").trim();
	if (!value) return "";
	try {
		const parsed = new URL(value);
		const digits = (parsed.hostname.includes("wa.me") ? parsed.pathname : parsed.searchParams.get("phone") ?? "").replace(/[^\d]/g, "");
		return digits ? `+${digits}` : "";
	} catch {
		return "";
	}
}
