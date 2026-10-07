import type { BranchInfo, MenuCategory, MenuProduct } from "@/components/tenant/menu/menu-types";

/**
 * Cartas de ejemplo por tipo de negocio para el laboratorio de plantillas.
 * Las fotos viven en `public/dev-lab/` (no se versionan); sin ellas las
 * tarjetas muestran su estado "sin foto", que también hay que ver bien.
 */
const IMG = "/dev-lab";

type Item = Omit<MenuProduct, "id" | "category_id" | "has_discount" | "discount_price" | "is_special"> &
	Partial<Pick<MenuProduct, "has_discount" | "discount_price" | "is_special">>;

export type LabMenu = {
	name: string;
	currency: string;
	country: string;
	categories: MenuCategory[];
	products: MenuProduct[];
	banners: { id: string; image_url: string }[];
};

function build(name: string, currency: string, country: string, sections: Array<[string, Item[]]>, banners: string[] = []): LabMenu {
	const categories: MenuCategory[] = [];
	const products: MenuProduct[] = [];
	sections.forEach(([catName, items], ci) => {
		const catId = `00000000-0000-4000-8000-${String(ci + 1).padStart(12, "0")}`;
		categories.push({ id: catId, name: catName, order: ci });
		items.forEach((item, pi) => {
			products.push({
				has_discount: false,
				discount_price: null,
				is_special: false,
				...item,
				id: `00000000-0000-4000-9000-${String(ci + 1).padStart(6, "0")}${String(pi + 1).padStart(6, "0")}`,
				category_id: catId,
			});
		});
	});
	return {
		name,
		currency,
		country,
		categories,
		products,
		banners: banners.map((url, i) => ({ id: `banner-${i}`, image_url: url })),
	};
}

const PIZZERIA = build("Rica Pizza", "USD", "VE", [
	[
		"Pizzas clásicas",
		[
			{ name: "Margarita", description: "Salsa napolitana, mozzarella fior di latte, albahaca fresca y aceite de oliva.", image_url: `${IMG}/margherita.jpg`, price: 8, sizes: [
				{ id: "a1000000-0000-4000-8000-000000000001", name: "Personal", price: 8 },
				{ id: "a1000000-0000-4000-8000-000000000002", name: "Familiar", price: 14 },
			] },
			{ name: "Pepperoni", description: "Doble pepperoni, mozzarella y orégano.", image_url: `${IMG}/pepperoni.jpg`, price: 10, has_discount: true, discount_price: 8.5, is_special: true },
			{ name: "Cuatro quesos y miel", description: "Mozzarella, provolone ahumado, azul y parmesano con un hilo de miel picante.", image_url: `${IMG}/cuatro-quesos.jpg`, price: 12 },
			{ name: "Champiñón y trufa", description: "Crema de ajo rostizado, mozzarella, mezcla de champiñones y aceite de trufa.", image_url: `${IMG}/pizza-champinon.jpg`, price: 14 },
		],
	],
	[
		"Especialidades",
		[
			{ name: "Quesos y miel gourmet", description: "Base blanca, cuatro quesos y miel de la casa.", image_url: `${IMG}/pizza-quesos-miel.jpg`, price: 13 },
			{ name: "Calzone de jamón", description: "Cerrada, rellena de jamón, ricotta y mozzarella.", image_url: null, price: 11 },
		],
	],
	[
		"Bebidas",
		[
			{ name: "Refresco 1,5 L", description: null, image_url: null, price: 3 },
			{ name: "Agua mineral", description: "Con o sin gas.", image_url: null, price: 1.5 },
		],
	],
]);

const SUSHI = build("Oishi Sushi", "CLP", "CL", [
	[
		"Rolls California",
		[
			{ name: "Alaska Roll", description: "Salmón, queso crema y palta, envuelto en sésamo.", image_url: `${IMG}/sushi-alaska.jpg`, price: 5000 },
			{ name: "California Roll", description: "Kanikama, pepino y palta envuelto en masago.", image_url: `${IMG}/sushi-california.jpg`, price: 4500 },
			{ name: "Chicken California", description: "Pollo apanado, queso crema y kanikama apanado en sésamo.", image_url: `${IMG}/sushi-chicken.jpg`, price: 4500, has_discount: true, discount_price: 3900 },
			{ name: "Ebi California", description: "Camarón apanado, queso crema y cebollín en sésamo.", image_url: `${IMG}/sushi-ebi.jpg`, price: 4700 },
		],
	],
	[
		"Tablas",
		[
			{ name: "Tabla Oishi", description: "Selección del chef con salmón, atún y kanikama. Con soya, wasabi y jengibre.", image_url: `${IMG}/sushi-tabla.jpg`, price: 14990, is_special: true, sizes: [
				{ id: "b1000000-0000-4000-8000-000000000001", name: "20 piezas", price: 14990 },
				{ id: "b1000000-0000-4000-8000-000000000002", name: "40 piezas", price: 26990 },
			] },
			{ name: "Tabla vegetariana", description: "Palta, pepino, espárrago y queso crema.", image_url: null, price: 11990 },
		],
	],
	[
		"Bebidas",
		[
			{ name: "Té verde frío", description: null, image_url: null, price: 1990 },
			{ name: "Ramune", description: "Soda japonesa, varios sabores.", image_url: null, price: 2490 },
		],
	],
], [`${IMG}/hero-sushi.jpg`]);

const BURGER = build("La Parada", "CLP", "CL", [
	[
		"Hamburguesas",
		[
			{ name: "Doble bacon", description: "Dos carnes smash, cheddar, tocino crujiente y salsa de la casa en pan brioche.", image_url: `${IMG}/burger.jpg`, price: 8990, is_special: true },
			{ name: "Clásica", description: "Carne, lechuga, tomate, cebolla morada y mayo.", image_url: null, price: 6490 },
			{ name: "Pollo crispy", description: "Pechuga apanada, lechuga y mayo picante.", image_url: null, price: 6990, has_discount: true, discount_price: 5990 },
		],
	],
	[
		"Para compartir",
		[
			{ name: "Pizza pepperoni", description: "Masa delgada, pepperoni y mozzarella.", image_url: `${IMG}/pepperoni.jpg`, price: 9990 },
			{ name: "Papas fritas", description: "Corte rústico con sal de mar.", image_url: null, price: 2990 },
		],
	],
	[
		"Bebidas",
		[
			{ name: "Bebida lata", description: null, image_url: null, price: 1500 },
			{ name: "Jugo natural", description: "Frutilla, mango o piña.", image_url: null, price: 2500 },
		],
	],
]);

const CAFE = build("Café Aroma", "CLP", "CL", [
	[
		"Cafés",
		[
			{ name: "Cappuccino", description: "Espresso doble con leche texturizada.", image_url: `${IMG}/cafe.jpg`, price: 2900, sizes: [
				{ id: "c1000000-0000-4000-8000-000000000001", name: "Chico", price: 2900 },
				{ id: "c1000000-0000-4000-8000-000000000002", name: "Grande", price: 3500 },
			] },
			{ name: "Americano", description: "Espresso con agua caliente.", image_url: null, price: 2200 },
			{ name: "Latte vainilla", description: "Con jarabe de vainilla de la casa.", image_url: null, price: 3300 },
		],
	],
	[
		"Para picar",
		[
			{ name: "Croissant de mantequilla", description: "Horneado cada mañana.", image_url: null, price: 1900 },
			{ name: "Torta de chocolate", description: "Bizcocho húmedo con ganache.", image_url: null, price: 3500, is_special: true },
			{ name: "Tostado jamón queso", description: "Pan de molde artesanal.", image_url: null, price: 3900 },
		],
	],
]);

const RESTAURANTE = build("Casa Lucía", "USD", "VE", [
	[
		"Entradas",
		[
			{ name: "Tequeños", description: "Seis unidades con salsa de ajo.", image_url: null, price: 6 },
			{ name: "Ensalada César", description: "Lechuga romana, crutones, parmesano y aderezo César.", image_url: null, price: 7 },
		],
	],
	[
		"Fondos",
		[
			{ name: "Pabellón criollo", description: "Carne mechada, caraotas, arroz y tajadas.", image_url: null, price: 12, is_special: true },
			{ name: "Pasta con champiñones", description: "Fettuccine en salsa cremosa de champiñones y parmesano.", image_url: null, price: 11 },
			{ name: "Pizza margarita", description: "Al horno de leña.", image_url: `${IMG}/margherita.jpg`, price: 10 },
		],
	],
	[
		"Postres",
		[
			{ name: "Quesillo", description: "Receta de la abuela.", image_url: null, price: 4 },
		],
	],
]);

export const LAB_MENUS: Record<string, LabMenu> = {
	"Pizzería": PIZZERIA,
	"Sushi": SUSHI,
	"Hamburguesas": BURGER,
	"Comida rápida": BURGER,
	"Restaurante": RESTAURANTE,
	"Cafetería": CAFE,
	"Panadería y pastelería": CAFE,
	"Otro": RESTAURANTE,
};

export function labBranch(menu: LabMenu): BranchInfo {
	return {
		id: "99999999-9999-4999-8999-999999999999",
		name: "Centro",
		address: "Av. Principal 123",
		phone: "+56 9 1234 5678",
		country: menu.country,
		currency: menu.currency,
		payment_methods: ["efectivo"],
		business_hours: null,
	};
}
