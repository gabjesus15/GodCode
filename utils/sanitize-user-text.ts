import DOMPurify from "dompurify";

const purifyPlainText = (s: string) =>
	DOMPurify.sanitize(s, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });

/**
 * Texto de usuario para persistir (nombre, nota, descripciones): trim + sin HTML.
 * Solo usar en cliente (importa dompurify).
 */
export function sanitizeUserText(text: string | null | undefined): string {
	if (text == null) return "";
	const trimmed = String(text).trim();
	if (!trimmed) return "";
	return purifyPlainText(trimmed);
}
