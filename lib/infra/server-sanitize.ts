/**
 * Server-side text sanitization utility
 * Removes or escapes HTML tags from user input to prevent XSS.
 * Safe for use in Edge Runtime and Serverless Functions.
 */

export function sanitizeServerText(text: string | null | undefined): string {
  if (text == null) return "";
  const trimmed = String(text).trim();
  if (!trimmed) return "";
  
  // Basic HTML escaping
  return trimmed
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Limpia texto plano que se guarda en la base y se pinta con React (que ya escapa).
 * No convierte a entidades HTML: "O'Higgins" debe guardarse tal cual, no como
 * "O&#039;Higgins". Quita caracteres de control e invisibles y colapsa espacios.
 */
export function cleanPlainText(text: string | null | undefined): string {
  if (text == null) return "";
  return String(text)
    .normalize("NFC")
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202E\u2060-\u206F\uFEFF]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
