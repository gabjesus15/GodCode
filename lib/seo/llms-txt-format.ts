/** Cabecera HTTP recomendada por la especificación llms.txt. */
export const LLMS_TXT_CONTENT_TYPE = "text/markdown; charset=utf-8";

/** Línea de enlace en formato llms.txt: `- [título](url): nota opcional` */
export function formatLlmsTxtLink(label: string, url: string, note?: string): string {
	const line = `- [${label}](${url})`;
	return note ? `${line}: ${note}` : line;
}
