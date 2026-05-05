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
