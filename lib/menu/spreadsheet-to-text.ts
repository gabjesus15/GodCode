/**
 * Convierte un Excel (.xlsx) en texto tabulado para mandarlo a leer como carta. Sin
 * dependencias: un .xlsx es un zip con XML adentro, así que se leen las cadenas
 * compartidas y la primera hoja. Las fórmulas se toman por su último valor calculado.
 */

const MAX_ROWS = 1500;
const MAX_ENTRY_BYTES = 20 * 1024 * 1024;

type ZipEntry = { name: string; method: number; compressedSize: number; localOffset: number };

function readZipEntries(buf: Uint8Array): ZipEntry[] {
	const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
	// Fin del directorio central: firma 0x06054b50, buscando desde el final (puede haber comentario).
	let eocd = -1;
	for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65535); i--) {
		if (view.getUint32(i, true) === 0x06054b50) {
			eocd = i;
			break;
		}
	}
	if (eocd < 0) throw new Error("not_a_zip");
	const count = view.getUint16(eocd + 10, true);
	let offset = view.getUint32(eocd + 16, true);
	const entries: ZipEntry[] = [];
	const decoder = new TextDecoder();
	for (let i = 0; i < count; i++) {
		if (view.getUint32(offset, true) !== 0x02014b50) throw new Error("bad_zip");
		const method = view.getUint16(offset + 10, true);
		const compressedSize = view.getUint32(offset + 20, true);
		const nameLength = view.getUint16(offset + 28, true);
		const extraLength = view.getUint16(offset + 30, true);
		const commentLength = view.getUint16(offset + 32, true);
		const localOffset = view.getUint32(offset + 42, true);
		const name = decoder.decode(buf.subarray(offset + 46, offset + 46 + nameLength));
		entries.push({ name, method, compressedSize, localOffset });
		offset += 46 + nameLength + extraLength + commentLength;
	}
	return entries;
}

async function readZipEntry(buf: Uint8Array, entry: ZipEntry): Promise<string> {
	const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
	if (view.getUint32(entry.localOffset, true) !== 0x04034b50) throw new Error("bad_zip");
	const nameLength = view.getUint16(entry.localOffset + 26, true);
	const extraLength = view.getUint16(entry.localOffset + 28, true);
	const start = entry.localOffset + 30 + nameLength + extraLength;
	const data = buf.subarray(start, start + entry.compressedSize);
	if (entry.method === 0) return new TextDecoder().decode(data);
	if (entry.method !== 8) throw new Error("unsupported_zip_method");
	const stream = new Blob([new Uint8Array(data)]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
	const reader = stream.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		total += value.length;
		if (total > MAX_ENTRY_BYTES) throw new Error("xlsx_too_large");
		chunks.push(value);
	}
	return new TextDecoder().decode(Buffer.concat(chunks));
}

function decodeXml(value: string): string {
	return value
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
		.replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
		.replace(/&amp;/g, "&");
}

function textOf(xml: string): string {
	return decodeXml([...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => m[1]).join(""));
}

function columnIndex(ref: string): number {
	const letters = ref.replace(/\d+/g, "");
	let index = 0;
	for (const ch of letters) index = index * 26 + (ch.charCodeAt(0) - 64);
	return index - 1;
}

export async function xlsxToText(input: ArrayBuffer | Uint8Array): Promise<string> {
	const buf = input instanceof Uint8Array ? input : new Uint8Array(input);
	const entries = readZipEntries(buf);
	const byName = new Map(entries.map((e) => [e.name, e]));

	const sharedEntry = byName.get("xl/sharedStrings.xml");
	const shared = sharedEntry
		? [...(await readZipEntry(buf, sharedEntry)).matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textOf(m[1]))
		: [];

	const sheetEntry =
		byName.get("xl/worksheets/sheet1.xml") ??
		entries.filter((e) => /^xl\/worksheets\/sheet\d+\.xml$/.test(e.name)).sort((a, b) => a.name.localeCompare(b.name))[0];
	if (!sheetEntry) throw new Error("xlsx_without_sheets");
	const sheet = await readZipEntry(buf, sheetEntry);

	const lines: string[] = [];
	for (const row of sheet.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
		if (lines.length >= MAX_ROWS) break;
		const cells: string[] = [];
		for (const cell of row[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
			const attrs = cell[1];
			const body = cell[2] ?? "";
			const ref = /\br="([A-Z]+\d+)"/.exec(attrs)?.[1];
			const type = /\bt="([^"]+)"/.exec(attrs)?.[1];
			const raw = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
			let value = "";
			if (type === "s" && raw != null) value = shared[Number(raw)] ?? "";
			else if (type === "inlineStr") value = textOf(body);
			else if (raw != null) value = decodeXml(raw);
			const index = ref ? columnIndex(ref) : cells.length;
			while (cells.length < index) cells.push("");
			cells[index] = value.replace(/[\t\r\n]+/g, " ").trim();
		}
		if (cells.some(Boolean)) lines.push(cells.join("\t"));
	}
	return lines.join("\n");
}
