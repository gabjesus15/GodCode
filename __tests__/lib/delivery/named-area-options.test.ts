import { describe, expect, it } from "vitest";

import { buildNamedAreaOptions, filterNamedAreaOptions } from "@/lib/delivery/named-area-options";

const REGION = "Región Metropolitana de Santiago";

describe("buildNamedAreaOptions", () => {
	const areas = [
		{ id: "a", name: `Lomas de Lo Aguirre · ${REGION}`, feeFlat: 4000 },
		{ id: "b", name: "los carmonales", feeFlat: 3000 },
		{ id: "c", name: `El Rodeo · ${REGION}`, feeFlat: 3000 },
		{ id: "d", name: "Portico · Pudahuel", feeFlat: 2500, aliases: ["El Pórtico"] },
	];

	it("omite la región que comparten casi todas y deja el contexto útil", () => {
		const options = buildNamedAreaOptions(areas);
		expect(options.map((o) => [o.title, o.subtitle])).toEqual([
			["El Rodeo", null],
			["Lomas de Lo Aguirre", null],
			["Los Carmonales", null],
			["Portico", "Pudahuel"],
		]);
		expect(options.find((o) => o.id === "b")?.fee).toBe(3000);
	});

	it("ordena los nombres escritos todo en mayúsculas o minúsculas y respeta los mixtos", () => {
		const options = buildNamedAreaOptions([
			{ id: "u", name: "AV DEL CANAL COLEGIO MAQUECURA", feeFlat: 1 },
			{ id: "l", name: "av del canal del portico hasta rodeo", feeFlat: 1 },
			{ id: "m", name: "Villa O'Higgins de Pudahuel", feeFlat: 1 },
			{ id: "n", name: "Parcela 12", feeFlat: 1 },
		]);
		expect(Object.fromEntries(options.map((o) => [o.id, o.title]))).toEqual({
			u: "Av del Canal Colegio Maquecura",
			l: "Av del Canal del Portico hasta Rodeo",
			m: "Villa O'Higgins de Pudahuel",
			n: "Parcela 12",
		});
	});

	it("omite el único contexto que aparece aunque lo traigan pocas zonas", () => {
		const options = buildNamedAreaOptions([
			{ id: "a", name: `El Rodeo · ${REGION}`, feeFlat: 1 },
			{ id: "b", name: `Los Albatros · ${REGION}`, feeFlat: 1 },
			{ id: "c", name: "Apacible 1", feeFlat: 1 },
			{ id: "d", name: "Apacible 2", feeFlat: 1 },
			{ id: "e", name: "camino al agua", feeFlat: 1 },
			{ id: "f", name: "Av del Canal desde Las Flores", feeFlat: 1 },
		]);
		expect(options.every((o) => o.subtitle === null)).toBe(true);
		expect(options.find((o) => o.id === "e")?.title).toBe("Camino al Agua");
	});

	it("con un solo contexto repetido una vez no lo quita", () => {
		const options = buildNamedAreaOptions([
			{ id: "x", name: "Centro · Ñuñoa", feeFlat: 1 },
			{ id: "y", name: "Norte · Maipú", feeFlat: 1 },
		]);
		expect(options.map((o) => o.subtitle)).toEqual(["Ñuñoa", "Maipú"]);
	});
});

describe("filterNamedAreaOptions", () => {
	const options = buildNamedAreaOptions([
		{ id: "a", name: `Lomas de Lo Aguirre · ${REGION}`, feeFlat: 4000 },
		{ id: "d", name: "Portico · Pudahuel", feeFlat: 2500, aliases: ["El Pórtico"] },
		{ id: "e", name: "Ñuble Sur", feeFlat: 1000 },
	]);

	it("busca sin tildes ni mayúsculas, en nombre y alias", () => {
		expect(filterNamedAreaOptions(options, "lo aguirre").map((o) => o.id)).toEqual(["a"]);
		expect(filterNamedAreaOptions(options, "PÓRTICO").map((o) => o.id)).toEqual(["d"]);
		expect(filterNamedAreaOptions(options, "nuble").map((o) => o.id)).toEqual(["e"]);
		expect(filterNamedAreaOptions(options, "aguirre lomas").map((o) => o.id)).toEqual(["a"]);
		expect(filterNamedAreaOptions(options, "  ").length).toBe(3);
		expect(filterNamedAreaOptions(options, "zzz")).toEqual([]);
	});

	it("busca por inicio de palabra, no por cualquier trozo", () => {
		const withFlores = buildNamedAreaOptions([
			{ id: "f", name: "Av las Flores", feeFlat: 1 },
			{ id: "l", name: "Loicas 1,2", feeFlat: 1 },
		]);
		expect(filterNamedAreaOptions(withFlores, "lo").map((o) => o.id)).toEqual(["l"]);
		expect(filterNamedAreaOptions(withFlores, "flor").map((o) => o.id)).toEqual(["f"]);
		expect(filterNamedAreaOptions(withFlores, "2").map((o) => o.id)).toEqual(["l"]);
	});
});
