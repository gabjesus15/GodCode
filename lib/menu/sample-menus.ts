import { BUSINESS_SECTORS, resolveBusinessSector, type BusinessSector } from "@/lib/onboarding/business-sectors";

import type { MenuDraft } from "./menu-draft";

/**
 * Menús de ejemplo para que la tienda no nazca vacía. Los tipos de negocio son los del
 * alta (`lib/onboarding/business-sectors.ts`).
 *
 * Los precios van en USD y se pasan a la moneda del negocio con una tasa aproximada:
 * son de muestra y el dueño los cambia. Un producto cuenta como ejemplo mientras su
 * nombre y su descripción sigan iguales a los de aquí; si el dueño lo edita, deja de
 * serlo y «Borrar ejemplos» ya no lo toca.
 */

type SampleProduct = { name: string; description: string; usd: number };
type SampleCategory = { name: string; products: SampleProduct[] };

export const SAMPLE_MENU_SECTORS = BUSINESS_SECTORS;

export type SampleMenuSector = BusinessSector;

const DRINKS: SampleCategory = {
	name: "Bebidas",
	products: [
		{ name: "Bebida en lata", description: "Ejemplo: 350 ml, sabores a elección.", usd: 1.5 },
		{ name: "Agua mineral", description: "Ejemplo: 500 ml, con o sin gas.", usd: 1.2 },
		{ name: "Jugo natural", description: "Ejemplo: fruta de temporada, 400 ml.", usd: 3 },
	],
};

const SAMPLES: Record<SampleMenuSector, SampleCategory[]> = {
	Pizzería: [
		{
			name: "Pizzas",
			products: [
				{ name: "Pizza Margarita", description: "Ejemplo: salsa de tomate, mozzarella y albahaca fresca.", usd: 9 },
				{ name: "Pizza Pepperoni", description: "Ejemplo: mozzarella y doble pepperoni.", usd: 10.5 },
				{ name: "Pizza Napolitana", description: "Ejemplo: tomate en rodajas, ajo, orégano y aceitunas.", usd: 10 },
				{ name: "Pizza Vegetariana", description: "Ejemplo: pimentón, champiñones, cebolla morada y choclo.", usd: 10 },
			],
		},
		{
			name: "Para acompañar",
			products: [
				{ name: "Pan de ajo", description: "Ejemplo: 6 trozos con mantequilla de ajo y perejil.", usd: 3.5 },
				{ name: "Papas fritas", description: "Ejemplo: porción mediana con salsa a elección.", usd: 3 },
			],
		},
		DRINKS,
	],
	Sushi: [
		{
			name: "Rolls",
			products: [
				{ name: "California roll", description: "Ejemplo: kanikama, palta y pepino, 10 piezas.", usd: 7 },
				{ name: "Philadelphia roll", description: "Ejemplo: salmón, queso crema y cebollín, 10 piezas.", usd: 8.5 },
				{ name: "Tempura roll", description: "Ejemplo: camarón tempura y queso crema, 10 piezas.", usd: 9 },
			],
		},
		{
			name: "Promociones",
			products: [
				{ name: "Promo 30 piezas", description: "Ejemplo: 3 rolls a elección, con soya y jengibre.", usd: 22 },
				{ name: "Gyozas", description: "Ejemplo: 5 unidades de cerdo o verduras.", usd: 5 },
			],
		},
		DRINKS,
	],
	Hamburguesas: [
		{
			name: "Hamburguesas",
			products: [
				{ name: "Hamburguesa clásica", description: "Ejemplo: carne 150 g, queso, lechuga, tomate y salsa de la casa.", usd: 8 },
				{ name: "Hamburguesa doble", description: "Ejemplo: doble carne, doble queso, pepinillos y cebolla.", usd: 11 },
				{ name: "Hamburguesa de pollo", description: "Ejemplo: pollo apanado, lechuga y mayonesa de ajo.", usd: 8 },
			],
		},
		{
			name: "Acompañamientos",
			products: [
				{ name: "Papas fritas", description: "Ejemplo: porción mediana con salsa a elección.", usd: 3 },
				{ name: "Aros de cebolla", description: "Ejemplo: 8 unidades con salsa barbecue.", usd: 3.5 },
			],
		},
		DRINKS,
	],
	"Comida rápida": [
		{
			name: "Sándwiches",
			products: [
				{ name: "Completo italiano", description: "Ejemplo: vienesa, tomate, palta y mayonesa.", usd: 3.5 },
				{ name: "Churrasco", description: "Ejemplo: carne a la plancha, tomate y mayonesa en pan frica.", usd: 7 },
				{ name: "Arepa reina pepiada", description: "Ejemplo: pollo desmechado con palta y mayonesa.", usd: 5 },
			],
		},
		{
			name: "Combos",
			products: [
				{ name: "Combo sándwich", description: "Ejemplo: sándwich a elección, papas y bebida.", usd: 9.5 },
				{ name: "Salchipapas", description: "Ejemplo: papas fritas con salchicha y salsas.", usd: 5 },
			],
		},
		DRINKS,
	],
	Restaurante: [
		{
			name: "Entradas",
			products: [
				{ name: "Empanadas de queso", description: "Ejemplo: 3 unidades fritas.", usd: 4.5 },
				{ name: "Ensalada de la casa", description: "Ejemplo: lechugas, tomate, palta y aliño a elección.", usd: 5 },
			],
		},
		{
			name: "Platos de fondo",
			products: [
				{ name: "Lomo saltado", description: "Ejemplo: carne salteada con cebolla, tomate, papas fritas y arroz.", usd: 12 },
				{ name: "Pollo a la plancha", description: "Ejemplo: con arroz o puré y ensalada.", usd: 9.5 },
				{ name: "Pasta a la boloñesa", description: "Ejemplo: tallarines con salsa de carne y queso rallado.", usd: 9 },
			],
		},
		{
			name: "Postres",
			products: [{ name: "Flan casero", description: "Ejemplo: con caramelo y crema.", usd: 3.5 }],
		},
		DRINKS,
	],
	Cafetería: [
		{
			name: "Cafés",
			products: [
				{ name: "Espresso", description: "Ejemplo: café de grano, taza chica.", usd: 2 },
				{ name: "Cappuccino", description: "Ejemplo: espresso con leche vaporizada y espuma.", usd: 3 },
				{ name: "Latte", description: "Ejemplo: espresso con leche, 12 oz.", usd: 3.2 },
			],
		},
		{
			name: "Para comer",
			products: [
				{ name: "Croissant", description: "Ejemplo: de mantequilla, solo o con jamón y queso.", usd: 2.5 },
				{ name: "Torta del día", description: "Ejemplo: trozo de la torta que tengamos hoy.", usd: 4 },
				{ name: "Sándwich de pollo", description: "Ejemplo: pollo, palta y tomate en pan de molde.", usd: 5 },
			],
		},
		DRINKS,
	],
	"Panadería y pastelería": [
		{
			name: "Panes",
			products: [
				{ name: "Marraqueta (1 kg)", description: "Ejemplo: horneada en el día.", usd: 2.5 },
				{ name: "Pan integral", description: "Ejemplo: molde de 600 g con semillas.", usd: 3 },
			],
		},
		{
			name: "Tortas y dulces",
			products: [
				{ name: "Torta de chocolate", description: "Ejemplo: 12 porciones, con ganache.", usd: 25 },
				{ name: "Kuchen de manzana", description: "Ejemplo: trozo individual.", usd: 3 },
				{ name: "Alfajores", description: "Ejemplo: caja de 6 con manjar.", usd: 5 },
			],
		},
		DRINKS,
	],
	Otro: [
		{
			name: "Destacados",
			products: [
				{ name: "Producto estrella", description: "Ejemplo: cambia el nombre, la foto y el precio por tu producto más vendido.", usd: 10 },
				{ name: "Producto clásico", description: "Ejemplo: un producto que siempre tienes disponible.", usd: 8 },
				{ name: "Producto de temporada", description: "Ejemplo: algo que solo ofreces por un tiempo.", usd: 9 },
			],
		},
		DRINKS,
	],
};

/** Tasas aproximadas para que los precios de muestra tengan sentido en cada moneda. */
const USD_RATES: Record<string, number> = {
	USD: 1,
	CLP: 950,
	COP: 4000,
	ARS: 1000,
	MXN: 18,
	PEN: 3.7,
	BRL: 5.5,
	EUR: 0.92,
	CAD: 1.37,
};

export function sampleLocalPrice(usd: number, currency: string): number {
	const rate = USD_RATES[currency.toUpperCase()] ?? 1;
	const value = usd * rate;
	// Monedas sin centavos en la práctica: precio redondo terminado en 90 (8.990).
	if (rate >= 100) return Math.max(100, Math.round(value / 100) * 100 - 10);
	return Math.round(value * 2) / 2;
}

export const resolveSampleSector = resolveBusinessSector;

export function buildSampleMenu(sector: SampleMenuSector, currency: string): MenuDraft {
	return {
		categories: SAMPLES[sector].map((category) => ({
			name: category.name,
			products: category.products.map((p) => ({ name: p.name, description: p.description, price: sampleLocalPrice(p.usd, currency) })),
		})),
	};
}

const SAMPLE_KEYS = new Set(
	Object.values(SAMPLES).flatMap((categories) =>
		categories.flatMap((c) => c.products.map((p) => sampleKey(p.name, p.description))),
	),
);

export const SAMPLE_CATEGORY_NAMES = new Set(
	Object.values(SAMPLES).flatMap((categories) => categories.map((c) => c.name.toLocaleLowerCase("es"))),
);

function sampleKey(name: string, description: string | null | undefined): string {
	return `${name.trim().toLocaleLowerCase("es")}\u0000${String(description ?? "").trim().toLocaleLowerCase("es")}`;
}

/** Un producto sigue siendo de ejemplo mientras nadie le cambió el nombre ni la descripción. */
export function isSampleProduct(name: string | null | undefined, description: string | null | undefined): boolean {
	return Boolean(name) && SAMPLE_KEYS.has(sampleKey(String(name), description));
}
