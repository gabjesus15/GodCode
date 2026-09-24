/**
 * Limpieza de texto de usuario en el servidor. Se guarda texto plano: React escapa al
 * pintarlo y los correos escapan sus parámetros (lib/onboarding/emails).
 */

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

/**
 * Como `cleanPlainText`, pero conserva los saltos de línea: para mensajes y descripciones
 * (tickets) que se pintan con `whitespace-pre-wrap`. Antes se guardaban con entidades HTML
 * y el panel mostraba "&lt;" o "O&#039;Higgins" tal cual.
 */
export function cleanMultilineText(text: string | null | undefined, maxLength = 5000): string {
  if (text == null) return "";
  return String(text)
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => cleanPlainText(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
}
