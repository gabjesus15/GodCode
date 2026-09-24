import { getEmailBrand, type EmailBrand } from "./brand";

/**
 * Arma el HTML y el texto plano de un correo a partir de bloques. Todos los correos pasan
 * por aquí: misma cabecera, misma tarjeta, mismo pie. El HTML usa tablas y estilos en
 * línea (lo único que respetan Gmail y Outlook) y trae ajustes para móvil y modo oscuro.
 *
 * Todo texto que llega en el contenido se escapa. Dentro de `text`, `intro` y los bloques
 * se admite `**negrita**` y saltos de línea.
 */

export type EmailTone = "brand" | "success" | "warning" | "danger" | "neutral";

export type EmailBlock =
	| { type: "text"; text: string }
	| { type: "summary"; title?: string; rows: Array<{ label: string; value: string; emphasis?: boolean }> }
	| { type: "callout"; tone: EmailTone; title?: string; text: string }
	| { type: "steps"; title?: string; items: Array<{ title: string; text?: string }> }
	| { type: "code"; label: string; value: string }
	| { type: "note"; text: string };

/** Quién lo lee: cambia el pie (un aviso interno no lleva «responde a este correo»). */
export type EmailAudience = "customer" | "prospect" | "team";

export type EmailContent = {
	subject: string;
	/** Lo que la bandeja muestra junto al asunto. */
	preheader: string;
	/** Color de los avisos del correo; el botón siempre es el de la marca. */
	tone: EmailTone;
	title: string;
	greeting?: string;
	intro?: string;
	blocks?: EmailBlock[];
	cta?: { label: string; url: string; showUrl?: boolean };
	/** El botón va antes de los bloques: correos cuya razón de ser es esa acción. */
	ctaFirst?: boolean;
	secondary?: { label: string; url: string };
	audience: EmailAudience;
	/** Por qué le llega este correo (va en el pie). */
	reason?: string;
};

export type RenderedEmail = { subject: string; html: string; text: string };

const TONES: Record<EmailTone, { accent: string; soft: string; line: string; ink: string }> = {
	brand: { accent: "#4F5BFF", soft: "#F1F2FF", line: "#D5D9FF", ink: "#3640C9" },
	success: { accent: "#16A34A", soft: "#EFFAF3", line: "#C6EBD3", ink: "#15803D" },
	warning: { accent: "#D97706", soft: "#FFF8EB", line: "#F4DDB0", ink: "#935406" },
	danger: { accent: "#DC2626", soft: "#FEF3F2", line: "#F7CFCB", ink: "#B42318" },
	neutral: { accent: "#475569", soft: "#F8FAFC", line: "#E2E8F0", ink: "#334155" },
};

const INK = "#0F172A";
const BODY = "#334155";
const MUTED = "#64748B";
const FAINT = "#94A3B8";
const LINE = "#E5E7EB";
const PAGE = "#F3F4F6";
const PANEL = "#F8FAFC";
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace";

export function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

/** El asunto es texto plano de una línea: sin saltos ni caracteres de control. */
export function sanitizeSubject(subject: string): string {
	return subject
		.split("")
		.map((char) => (char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127 ? " " : char))
		.join("")
		.replace(/\s+/g, " ")
		.trim();
}

/** Texto con `**negrita**` y saltos de línea, ya escapado. */
function rich(text: string): string {
	return escapeHtml(text)
		.replace(/\*\*(.+?)\*\*/g, `<strong style="color:${INK};font-weight:600;" class="ink">$1</strong>`)
		.replace(/\n/g, "<br>");
}

function plain(text: string): string {
	return text.replace(/\*\*(.+?)\*\*/g, "$1");
}

/** Solo http(s) y mailto: una URL rara no debe terminar en un href. */
function safeUrl(url: string): string {
	const trimmed = url.trim();
	return /^(https?:|mailto:)/i.test(trimmed) ? trimmed : "#";
}

function paragraph(html: string, style = ""): string {
	return `<p class="body" style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:24px;color:${BODY};${style}">${html}</p>`;
}

function renderBlock(block: EmailBlock): string {
	switch (block.type) {
		case "text":
			return paragraph(rich(block.text));
		case "note":
			return `<p class="muted" style="margin:0 0 16px;font-family:${FONT};font-size:13px;line-height:20px;color:${MUTED};">${rich(block.text)}</p>`;
		case "summary": {
			const rows = block.rows
				.filter((row) => row.value.trim())
				.map(
					(row, index) => `<tr>
<td class="muted line" style="padding:12px 16px;${index > 0 ? `border-top:1px solid ${LINE};` : ""}font-family:${FONT};font-size:14px;line-height:20px;color:${MUTED};" valign="top">${escapeHtml(row.label)}</td>
<td class="ink line" align="right" style="padding:12px 16px;${index > 0 ? `border-top:1px solid ${LINE};` : ""}font-family:${FONT};font-size:${row.emphasis ? "15px" : "14px"};line-height:20px;color:${INK};font-weight:${row.emphasis ? 700 : 500};" valign="top">${escapeHtml(row.value)}</td>
</tr>`,
				)
				.join("");
			if (!rows) return "";
			const title = block.title
				? `<p class="muted" style="margin:0 0 8px;font-family:${FONT};font-size:12px;line-height:16px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${MUTED};">${escapeHtml(block.title)}</p>`
				: "";
			return `${title}<table role="presentation" class="panel" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;border:1px solid ${LINE};border-radius:12px;border-collapse:separate;background:${PANEL};">${rows}</table>`;
		}
		case "callout": {
			const tone = TONES[block.tone];
			const title = block.title
				? `<p style="margin:0 0 4px;font-family:${FONT};font-size:14px;line-height:20px;font-weight:700;color:${tone.ink};">${escapeHtml(block.title)}</p>`
				: "";
			return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;border-collapse:separate;"><tr><td class="panel" style="background:${tone.soft};border:1px solid ${tone.line};border-radius:12px;padding:14px 16px;">${title}<p class="body" style="margin:0;font-family:${FONT};font-size:14px;line-height:21px;color:${BODY};">${rich(block.text)}</p></td></tr></table>`;
		}
		case "steps": {
			const title = block.title
				? `<p class="muted" style="margin:4px 0 12px;font-family:${FONT};font-size:12px;line-height:16px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${MUTED};">${escapeHtml(block.title)}</p>`
				: "";
			const items = block.items
				.map(
					(item, index) => `<tr>
<td width="36" valign="top" style="padding:0 12px 14px 0;"><div style="width:26px;height:26px;border-radius:13px;background:${TONES.brand.soft};color:${TONES.brand.ink};font-family:${FONT};font-size:13px;line-height:26px;font-weight:700;text-align:center;">${index + 1}</div></td>
<td valign="top" style="padding:3px 0 14px;"><p class="ink" style="margin:0;font-family:${FONT};font-size:14px;line-height:20px;font-weight:600;color:${INK};">${rich(item.title)}</p>${
						item.text
							? `<p class="body" style="margin:2px 0 0;font-family:${FONT};font-size:14px;line-height:20px;color:${BODY};">${rich(item.text)}</p>`
							: ""
					}</td>
</tr>`,
				)
				.join("");
			return `${title}<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 8px;">${items}</table>`;
		}
		case "code":
			return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 16px;border-collapse:separate;"><tr><td class="panel" style="background:${PANEL};border:1px dashed #CBD5E1;border-radius:10px;padding:12px 14px;"><p class="muted" style="margin:0 0 2px;font-family:${FONT};font-size:12px;line-height:16px;color:${MUTED};">${escapeHtml(block.label)}</p><p class="ink" style="margin:0;font-family:${MONO};font-size:14px;line-height:20px;color:${INK};word-break:break-all;">${escapeHtml(block.value)}</p></td></tr></table>`;
	}
}

function renderButton(cta: NonNullable<EmailContent["cta"]>): string {
	const accent = TONES.brand.accent;
	const url = escapeHtml(safeUrl(cta.url));
	const button = `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:8px 0 0;"><tr><td align="center" bgcolor="${accent}" style="border-radius:10px;background:${accent};mso-padding-alt:14px 28px;"><a href="${url}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:15px;line-height:20px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:10px;">${escapeHtml(cta.label)}</a></td></tr></table>`;
	const fallback = cta.showUrl
		? `<p class="muted" style="margin:14px 0 0;font-family:${FONT};font-size:12px;line-height:18px;color:${MUTED};">Si el botón no funciona, copia este enlace en tu navegador:<br><a href="${url}" target="_blank" style="color:${TONES.brand.accent};word-break:break-all;">${escapeHtml(safeUrl(cta.url))}</a></p>`
		: "";
	return button + fallback;
}

function helpLine(content: EmailContent, brand: EmailBrand): string {
	if (content.audience === "team") return `Aviso interno de ${escapeHtml(brand.product)}.`;
	const mail = escapeHtml(brand.supportEmail);
	return `¿Dudas? Responde a este correo o escríbenos a <a href="mailto:${mail}" style="color:${TONES.brand.accent};text-decoration:none;">${mail}</a>.`;
}

export function renderEmail(content: EmailContent, brand: EmailBrand = getEmailBrand()): RenderedEmail {
	const subject = sanitizeSubject(content.subject);
	const blocks = (content.blocks ?? []).map(renderBlock).join("");

	const body = [
		`<h1 class="ink h1" style="margin:0 0 18px;font-family:${FONT};font-size:24px;line-height:32px;font-weight:700;letter-spacing:-0.01em;color:${INK};">${escapeHtml(content.title)}</h1>`,
		content.greeting ? paragraph(rich(content.greeting)) : "",
		content.intro ? paragraph(rich(content.intro)) : "",
		content.cta && content.ctaFirst ? `${renderButton(content.cta)}<div style="height:28px;line-height:28px;font-size:0;">&nbsp;</div>` : "",
		blocks,
		content.cta && !content.ctaFirst ? renderButton(content.cta) : "",
		content.secondary
			? `<p style="margin:20px 0 0;font-family:${FONT};font-size:14px;line-height:20px;"><a href="${escapeHtml(safeUrl(content.secondary.url))}" target="_blank" style="color:${TONES.brand.accent};font-weight:600;text-decoration:none;">${escapeHtml(content.secondary.label)} &rarr;</a></p>`
			: "",
	].join("");

	const filler = "&#847;&zwnj;&nbsp;".repeat(60);
	const reason = content.reason ? `${escapeHtml(content.reason)}<br>` : "";

	const html = `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(subject)}</title>
<style>
body{margin:0;padding:0;width:100%!important;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-collapse:collapse;}
img{border:0;outline:none;text-decoration:none;}
@media only screen and (max-width:620px){
.container{width:100%!important;}
.card-pad{padding:28px 22px!important;}
.h1{font-size:21px!important;line-height:28px!important;}
.gutter{padding-left:12px!important;padding-right:12px!important;}
}
@media (prefers-color-scheme:dark){
.page{background:#0B0E14!important;}
.card{background:#141821!important;border-color:#262B38!important;}
.panel{background:#1A1F2B!important;border-color:#2A3042!important;}
.line{border-color:#2A3042!important;}
.ink{color:#F1F5F9!important;}
.body{color:#CBD5E1!important;}
.muted{color:#94A3B8!important;}
}
</style>
</head>
<body class="page" style="margin:0;padding:0;background:${PAGE};">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${PAGE};opacity:0;">${escapeHtml(content.preheader)}${filler}</div>
<table role="presentation" class="page" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${PAGE};">
<tr><td align="center" class="gutter" style="padding:32px 24px 40px;">
<table role="presentation" class="container" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px;max-width:600px;">
<tr><td style="padding:0 4px 20px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
<td valign="middle" style="padding-right:10px;"><a href="${escapeHtml(brand.appUrl)}" target="_blank"><img src="${escapeHtml(brand.logoUrl)}" width="32" height="32" alt="${escapeHtml(brand.product)}" style="display:block;width:32px;height:32px;border:0;border-radius:8px;"></a></td>
<td valign="middle" class="ink" style="font-family:${FONT};font-size:16px;line-height:20px;font-weight:700;color:${INK};">${escapeHtml(brand.product)}</td>
</tr></table>
</td></tr>
<tr><td class="card" style="background:#FFFFFF;border:1px solid ${LINE};border-radius:16px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td class="card-pad" style="padding:40px 40px 40px;">
${body}
</td></tr></table>
</td></tr>
<tr><td class="muted" style="padding:22px 8px 0;font-family:${FONT};font-size:13px;line-height:20px;color:${MUTED};">${helpLine(content, brand)}</td></tr>
<tr><td class="muted" style="padding:12px 8px 0;font-family:${FONT};font-size:12px;line-height:18px;color:${FAINT};">${reason}${escapeHtml(brand.company)} &middot; ${escapeHtml(brand.location)}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

	return { subject, html, text: renderText(content, brand) };
}

function renderText(content: EmailContent, brand: EmailBrand): string {
	const out: string[] = [];
	out.push(content.title, "");
	if (content.greeting) out.push(plain(content.greeting), "");
	if (content.intro) out.push(plain(content.intro), "");
	if (content.cta && content.ctaFirst) out.push(`${content.cta.label}: ${safeUrl(content.cta.url)}`, "");
	for (const block of content.blocks ?? []) {
		switch (block.type) {
			case "text":
			case "note":
				out.push(plain(block.text), "");
				break;
			case "summary":
				if (block.title) out.push(block.title.toUpperCase());
				for (const row of block.rows) if (row.value.trim()) out.push(`${row.label}: ${row.value}`);
				out.push("");
				break;
			case "callout":
				out.push(block.title ? `${block.title}: ${plain(block.text)}` : plain(block.text), "");
				break;
			case "steps":
				if (block.title) out.push(block.title.toUpperCase());
				block.items.forEach((item, index) => out.push(`${index + 1}. ${plain(item.title)}${item.text ? ` - ${plain(item.text)}` : ""}`));
				out.push("");
				break;
			case "code":
				out.push(`${block.label}: ${block.value}`, "");
				break;
		}
	}
	if (content.cta && !content.ctaFirst) out.push(`${content.cta.label}: ${safeUrl(content.cta.url)}`, "");
	if (content.secondary) out.push(`${content.secondary.label}: ${safeUrl(content.secondary.url)}`, "");
	out.push("--");
	out.push(content.audience === "team" ? `Aviso interno de ${brand.product}.` : `¿Dudas? Responde a este correo o escríbenos a ${brand.supportEmail}.`);
	if (content.reason) out.push(content.reason);
	out.push(`${brand.company} · ${brand.location}`);
	return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
