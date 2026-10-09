import { describe, expect, it } from "vitest";

import { LABS_FAQ, LABS_HOME, LABS_PROJECTS, LABS_SERVICES, LABS_TEAM, POS_PATH } from "@/lib/labs/content";
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

	it("al compartir se ve la tarjeta del estudio, no la del producto", () => {
		const images = buildLabsMetadata(BASE, "/labs", { index: false }).openGraph?.images as Array<{ url: string }>;
		expect(images[0]?.url).toBe(`${BASE}/api/system/og?v=labs`);
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
		// El landing del producto vive hoy en la raíz: nada apunta a /pos hasta que exista.
		expect(organization.owns).toMatchObject({ "@type": "SoftwareApplication", url: `${BASE}${POS_PATH}` });
		expect(JSON.stringify(graph)).not.toContain("/pos");
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
		expect(text).not.toContain("24/7");
	});

	it("los hechos se comprueban en la misma página", () => {
		// «3 productos»: los proyectos propios de la sección Proyectos, con su nombre en el detalle.
		const products = LABS_HOME.facts.find((fact) => fact.label === "Software propio en producción");
		const ownWork = LABS_PROJECTS.filter((project) => /^(Producto propio|App propia)/.test(project.kind));
		expect(products?.value).toBe(String(ownWork.length));
		for (const project of ownWork) expect(products?.detail).toContain(project.name);
	});

	it("la frase grande dice qué hacemos, sin adjetivos de venta", () => {
		for (const word of ["sitios", "sistemas", "tiendas", "automatizaciones"]) {
			expect(LABS_HOME.statement).toContain(`{${word}}`);
		}
		expect(LABS_HOME.statement).not.toMatch(/convierten|ahorran horas|sin intermediarios|fácil de explicar|facturan/);
	});

	it("nombra los mismos países en el intro, los hechos, las preguntas y los metadatos", () => {
		const countries = "Chile, Venezuela y Estados Unidos";
		expect(LABS_HOME.intro).toContain(countries);
		expect(LABS_DESCRIPTION).toContain(countries);
		expect(LABS_HOME.facts.find((fact) => fact.label === "Clientes en tres países")?.detail).toContain(countries);
		const remote = LABS_FAQ.find((item) => item.question.includes("fuera de Santiago"));
		expect(remote?.answer).toContain("Chile, de Venezuela y de Estados Unidos");
		// Y el JSON-LD declara esos mismos tres países como zona de servicio.
		const areaServed = (buildLabsJsonLd(BASE, "/")[0] as { areaServed: Array<{ name: string }> }).areaServed;
		expect(areaServed.map((country) => country.name)).toEqual(["Chile", "Venezuela", "Estados Unidos"]);
	});

	it("el producto propio enlaza a su landing actual y no a /pos", () => {
		const own = LABS_PROJECTS.find((project) => project.ownProduct);
		expect(own?.href).toBe(POS_PATH);
		expect(JSON.stringify([LABS_PROJECTS, LABS_HOME])).not.toContain("/pos");
	});

	it("la vista previa /labs no se confunde con un tenant", () => {
		expect(MAIN_DOMAIN_RESERVED_PATH_SEGMENTS).toContain("labs");
	});
});
