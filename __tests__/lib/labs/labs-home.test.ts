import { describe, expect, it } from "vitest";

import { LABS_FAQ, LABS_HOME, LABS_PROJECTS, LABS_SERVICES, LABS_TEAM } from "@/lib/labs/content";
import { LABS_DESCRIPTION, LABS_TITLE, buildLabsJsonLd, buildLabsMetadata } from "@/lib/labs/metadata";
import { MAIN_DOMAIN_RESERVED_PATH_SEGMENTS } from "@/lib/tenant/reserved-path-segments";

const BASE = "https://www.godcode.me";

describe("home de Gcode Labs: metadatos", () => {
	it("título y descripción dentro de los largos que Google muestra", () => {
		expect(LABS_TITLE.length).toBeLessThanOrEqual(65);
		expect(LABS_DESCRIPTION.length).toBeLessThanOrEqual(170);
		expect(LABS_TITLE).toContain("Gcode Labs");
		expect(LABS_TITLE.toLowerCase()).toContain("chile");
	});

	it("canónica absoluta e índice según la opción", () => {
		const indexed = buildLabsMetadata(BASE, "/", { index: true });
		expect(indexed.alternates?.canonical).toBe(`${BASE}/`);
		expect(indexed.robots).toMatchObject({ index: true, follow: true });

		const preview = buildLabsMetadata(BASE, "/labs", { index: false });
		expect(preview.alternates?.canonical).toBe(`${BASE}/labs`);
		expect(preview.robots).toMatchObject({ index: false, follow: true });
	});
});

describe("home de Gcode Labs: JSON-LD", () => {
	const graph = buildLabsJsonLd(BASE, "/");
	const organization = graph[0] as Record<string, unknown>;
	const faq = graph.find((node) => node["@type"] === "FAQPage") as { mainEntity: Array<{ name: string }> };

	it("la organización comparte @id con el resto del sitio y declara los servicios", () => {
		expect(organization["@id"]).toBe(`${BASE}/#organization`);
		expect(organization["@type"]).toEqual(["Organization", "ProfessionalService"]);
		const catalog = organization.hasOfferCatalog as { itemListElement: unknown[] };
		expect(catalog.itemListElement).toHaveLength(LABS_SERVICES.length);
		expect(organization.owns).toMatchObject({ "@type": "SoftwareApplication", url: `${BASE}/pos` });
	});

	it("las preguntas del JSON-LD son las visibles", () => {
		expect(faq.mainEntity.map((q) => q.name)).toEqual(LABS_FAQ.map((q) => q.question));
	});
});

describe("home de Gcode Labs: contenido", () => {
	it("solo datos reales: un producto propio, proyectos con alcance y equipo con enlace", () => {
		expect(LABS_PROJECTS.filter((p) => p.ownProduct)).toHaveLength(1);
		for (const project of LABS_PROJECTS) expect(project.scope.length).toBeGreaterThanOrEqual(3);
		for (const member of LABS_TEAM) expect(member.linkedinUrl).toMatch(/^https:\/\/www\.linkedin\.com\//);
	});

	it("responde a los tres miedos bajo el botón del hero", () => {
		expect(LABS_HOME.assurances).toHaveLength(3);
		expect(LABS_HOME.assurances.join(" ")).toMatch(/por escrito/);
		expect(LABS_HOME.assurances.join(" ")).toMatch(/a tu nombre/);
	});

	it("no promete cifras que no existen", () => {
		const text = JSON.stringify([LABS_SERVICES, LABS_FAQ, LABS_PROJECTS, LABS_HOME]).toLowerCase();
		expect(text).not.toMatch(/\d+\+? (clientes|proyectos entregados|años de experiencia)/);
		expect(text).not.toContain("premio");
	});

	it("la vista previa /labs no se confunde con un tenant", () => {
		expect(MAIN_DOMAIN_RESERVED_PATH_SEGMENTS).toContain("labs");
	});
});
