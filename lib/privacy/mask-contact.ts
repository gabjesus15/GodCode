/**
 * Enmascarado de datos de contacto para listados del panel: el navegador recibe solo esta
 * versión, nunca el dato completo. Los valores ya cifrados (`enc:…`) no se intentan leer.
 */

const SEALED_PREFIX = "enc:";

export function maskEmail(value: string | null | undefined): string | null {
	const raw = String(value ?? "").trim();
	if (!raw) return null;
	if (raw.startsWith(SEALED_PREFIX)) return "Cifrado";
	const at = raw.lastIndexOf("@");
	if (at <= 0) return "•••";
	const local = raw.slice(0, at);
	const domain = raw.slice(at + 1);
	const visible = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2);
	return `${visible}•••@${domain}`;
}

export function maskPhone(value: string | null | undefined): string | null {
	const raw = String(value ?? "").trim();
	if (!raw) return null;
	if (raw.startsWith(SEALED_PREFIX)) return "Cifrado";
	const digits = raw.replace(/\D/g, "");
	if (digits.length < 6) return "•••";
	const prefix = raw.startsWith("+") ? `+${digits.slice(0, digits.length > 10 ? 2 : 1)}` : "";
	return `${prefix ? `${prefix} ` : ""}••• ••• ${digits.slice(-2)}`;
}
