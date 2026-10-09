import { describe, expect, it } from "vitest";

import { xlsxToText } from "@/lib/menu/spreadsheet-to-text";

const crcTable = Array.from({ length: 256 }, (_, n) => {
	let c = n;
	for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
	return c >>> 0;
});
function crc32(data: Uint8Array): number {
	let crc = 0xffffffff;
	for (const byte of data) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
	return (crc ^ 0xffffffff) >>> 0;
}

async function deflateRaw(data: Uint8Array): Promise<Uint8Array> {
	const stream = new Blob([new Uint8Array(data)]).stream().pipeThrough(new CompressionStream("deflate-raw"));
	return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Zip mínimo como el que guarda Excel: una entrada comprimida y otra sin comprimir. */
async function buildZip(files: Array<{ name: string; content: string; deflate: boolean }>): Promise<Uint8Array> {
	const encoder = new TextEncoder();
	const locals: Uint8Array[] = [];
	const centrals: Uint8Array[] = [];
	let offset = 0;
	for (const file of files) {
		const name = encoder.encode(file.name);
		const raw = encoder.encode(file.content);
		const body = file.deflate ? await deflateRaw(raw) : raw;
		const local = new Uint8Array(30 + name.length + body.length);
		const lv = new DataView(local.buffer);
		lv.setUint32(0, 0x04034b50, true);
		lv.setUint16(8, file.deflate ? 8 : 0, true);
		lv.setUint32(14, crc32(raw), true);
		lv.setUint32(18, body.length, true);
		lv.setUint32(22, raw.length, true);
		lv.setUint16(26, name.length, true);
		local.set(name, 30);
		local.set(body, 30 + name.length);
		const central = new Uint8Array(46 + name.length);
		const cv = new DataView(central.buffer);
		cv.setUint32(0, 0x02014b50, true);
		cv.setUint16(10, file.deflate ? 8 : 0, true);
		cv.setUint32(16, crc32(raw), true);
		cv.setUint32(20, body.length, true);
		cv.setUint32(24, raw.length, true);
		cv.setUint16(28, name.length, true);
		cv.setUint32(42, offset, true);
		central.set(name, 46);
		locals.push(local);
		centrals.push(central);
		offset += local.length;
	}
	const centralSize = centrals.reduce((s, c) => s + c.length, 0);
	const end = new Uint8Array(22);
	const ev = new DataView(end.buffer);
	ev.setUint32(0, 0x06054b50, true);
	ev.setUint16(8, files.length, true);
	ev.setUint16(10, files.length, true);
	ev.setUint32(12, centralSize, true);
	ev.setUint32(16, offset, true);
	return new Uint8Array(Buffer.concat([...locals, ...centrals, end]));
}

describe("xlsxToText", () => {
	it("lee la primera hoja con cadenas compartidas, números y celdas vacías", async () => {
		const zip = await buildZip([
			{
				name: "xl/sharedStrings.xml",
				deflate: true,
				content:
					'<sst><si><t>Producto</t></si><si><t>Precio</t></si><si><r><t>Pizza </t></r><r><t>Margarita</t></r></si><si><t>Tomate &amp; queso</t></si></sst>',
			},
			{
				name: "xl/worksheets/sheet1.xml",
				deflate: false,
				content:
					'<worksheet><sheetData>' +
					'<row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="s"><v>1</v></c></row>' +
					'<row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2" t="s"><v>3</v></c><c r="C2"><v>8990</v></c></row>' +
					'<row r="3"><c r="A3" t="inlineStr"><is><t>Agua</t></is></c><c r="C3"><f>1+1</f><v>1500</v></c></row>' +
					'<row r="4"></row>' +
					"</sheetData></worksheet>",
			},
		]);
		expect(await xlsxToText(zip)).toBe("Producto\t\tPrecio\nPizza Margarita\tTomate & queso\t8990\nAgua\t\t1500");
	});

	it("falla con un archivo que no es un zip", async () => {
		await expect(xlsxToText(new TextEncoder().encode("hola"))).rejects.toThrow();
	});
});
