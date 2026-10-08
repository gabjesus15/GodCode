import { LANDING_COMPANY_NAME, LANDING_PRODUCT_NAME } from "./brand";

/**
 * Páginas de país del landing (/chile, /venezuela).
 *
 * Son páginas de posicionamiento local: la home compite por «menú digital» y
 * «POS para restaurantes» en general; estas compiten por las mismas búsquedas
 * con el país («menú digital Chile», «sistema para restaurantes Venezuela») y
 * por el vocabulario de cada mercado (boleta, Webpay, pago móvil, tasa BCV…).
 *
 * Reglas:
 * - Solo promesas que el producto cumple hoy (mismas que FAQ, precios y términos).
 * - El texto visible y el JSON-LD (FAQPage) salen de los mismos datos.
 * - Cada país tiene su propia pregunta frecuente, su moneda y sus medios de pago;
 *   lo demás es compartido para no duplicar contenido entre las dos páginas.
 */

export type LandingCountrySlug = "chile" | "venezuela";

export type LandingCountryFaq = { question: string; answer: string };

export type LandingCountryFeature = { title: string; text: string };

export type LandingCountry = {
	slug: LandingCountrySlug;
	/** ISO 3166-1 alpha-2, para `areaServed` y para resolver el precio regional. */
	code: "CL" | "VE";
	/** Nombre del país tal como se escribe en el texto. */
	name: string;
	/** Gentilicio en plural («restaurantes chilenos»). */
	demonym: string;
	/** Ciudades para el texto y para `areaServed` (señal local, sin inventar sedes). */
	cities: string[];
	/** Título de la pestaña; la plantilla raíz añade « · Gcode Labs». ≤ 60 caracteres en total. */
	metaTitle: string;
	metaDescription: string;
	/** Búsquedas a las que apunta la página (meta keywords; Google no las usa, otros sí). */
	keywords: string[];
	/** H1 en dos partes: la segunda va en color. */
	heroTitle: [string, string];
	heroSubtitle: string;
	/** Apps de delivery que cobran comisión en ese país (para el texto de ahorro). */
	deliveryApps: string[];
	/** Medios de pago que el menú ya acepta en ese país. */
	paymentMethods: string[];
	/** Cómo cobra la suscripción allí. */
	billingNote: string;
	/** Bloques «Pensado para {país}». */
	localFeatures: LandingCountryFeature[];
	faq: LandingCountryFaq[];
};

/** Funciones iguales en los dos países: se escriben una vez. */
export const LANDING_COUNTRY_SHARED_FEATURES: LandingCountryFeature[] = [
	{
		title: "Menú digital con QR",
		text: "Fotos, variantes, combos y tamaños. Tus clientes lo abren desde la mesa, Instagram o WhatsApp sin descargar nada.",
	},
	{
		title: "Pedidos online sin comisión",
		text: "Carrito y checkout en tu propio link. Cada pedido llega a tu caja y la venta completa es tuya.",
	},
	{
		title: "Punto de venta y comandas",
		text: "Abres el turno, tomas pedidos en mostrador, los mandas a cocina y cierras caja con el detalle del día.",
	},
	{
		title: "Delivery y retiro en tienda",
		text: "Zonas de reparto, costo de envío y pedidos para retirar, desde el mismo panel que la sala.",
	},
	{
		title: "Inventario y reportes",
		text: "Stock que se descuenta con cada venta, y reportes de ventas, pedidos y ticket promedio.",
	},
	{
		title: "Varias sucursales",
		text: "Un panel para todas tus ubicaciones, con precios, inventario y reportes por local o consolidados.",
	},
];

const CHILE: LandingCountry = {
	slug: "chile",
	code: "CL",
	name: "Chile",
	demonym: "chilenos",
	cities: ["Santiago", "Valparaíso", "Viña del Mar", "Concepción", "Antofagasta", "La Serena", "Temuco"],
	metaTitle: "Menú digital y POS para restaurantes en Chile",
	metaDescription:
		"Carta digital con QR, pedidos online y punto de venta para restaurantes en Chile, sin comisión por venta. Precios en pesos chilenos, soporte desde Santiago.",
	keywords: [
		"menú digital Chile",
		"carta digital QR Chile",
		"menú QR para restaurantes Chile",
		"sistema para restaurantes Chile",
		"POS para restaurantes Chile",
		"punto de venta restaurante Chile",
		"pedidos online restaurante Chile",
		"delivery sin comisiones Chile",
		"alternativa a PedidosYa",
		"alternativa a Rappi",
		"software restaurante Santiago",
	],
	heroTitle: ["Menú digital y POS para", "restaurantes en Chile"],
	heroSubtitle:
		"Hecho en Santiago. Tus clientes piden desde tu link o tu QR, pagas un plan fijo en pesos y no cedes comisión en ningún pedido.",
	deliveryApps: ["PedidosYa", "Rappi", "Uber Eats"],
	paymentMethods: ["Efectivo", "Tarjeta en el local", "Transferencia", "Mercado Pago"],
	billingNote: "Planes en pesos chilenos, con precios fijos cada mes. Sin UF ni reajustes sorpresa.",
	localFeatures: [
		{
			title: "Precios en pesos, sin comisión",
			text: "Pagas un plan mensual en CLP y nada más. Un local que vende $2.000.000 al mes por apps de delivery puede dejar ahí entre $400.000 y $600.000 solo en comisiones.",
		},
		{
			title: "Cobra como ya cobras",
			text: "Efectivo, tarjeta en el local, transferencia o Mercado Pago. El cliente elige al pedir y el pedido llega a tu caja con el medio de pago marcado.",
		},
		{
			title: "Soporte desde Santiago",
			text: `${LANDING_COMPANY_NAME} es un estudio de Santiago de Chile. Te atiende por WhatsApp quien construyó el sistema, en tu horario.`,
		},
		{
			title: "Tu link en Instagram y en la mesa",
			text: "El mismo menú sirve para la bio de Instagram, el QR en la mesa y los pedidos por WhatsApp. Sin app que descargar.",
		},
	],
	faq: [
		{
			question: `¿Cuánto cuesta ${LANDING_PRODUCT_NAME} en Chile?`,
			answer:
				"Es un plan mensual fijo en pesos chilenos, que ves en la sección de planes de la home. No hay comisión por venta ni por pedido, y en tu primer pago llevas 2 meses al precio de 1.",
		},
		{
			question: "¿Sirve para dejar PedidosYa, Rappi o Uber Eats?",
			answer:
				"Sirve para dejar de pagarles comisión por los clientes que ya son tuyos: los que repiten, los que llegan desde Instagram y los que piden en la mesa. Muchos locales siguen en las apps para captar clientes nuevos y mueven a su propio link a los demás. Con la calculadora de comisiones ves cuánto ahorrarías.",
		},
		{
			question: "¿Qué medios de pago acepta en Chile?",
			answer:
				"Efectivo, tarjeta en el local, transferencia bancaria y Mercado Pago. Configuras cuáles ofreces y el cliente elige al hacer el pedido.",
		},
		{
			question: "¿Emite boleta electrónica?",
			answer:
				`Hoy ${LANDING_PRODUCT_NAME} registra la venta y el medio de pago; la boleta la sigues emitiendo con tu sistema del SII como hasta ahora. Si tu local necesita la integración, cuéntanos por WhatsApp: ${LANDING_COMPANY_NAME} también construye sistemas a medida.`,
		},
		{
			question: "¿Funciona fuera de Santiago?",
			answer:
				"Sí. Es un sistema web: funciona igual en Valparaíso, Concepción, Antofagasta, Temuco o cualquier comuna con internet. El soporte es el mismo para todo Chile.",
		},
	],
};

const VENEZUELA: LandingCountry = {
	slug: "venezuela",
	code: "VE",
	name: "Venezuela",
	demonym: "venezolanos",
	cities: ["Caracas", "Maracaibo", "Valencia", "Barquisimeto", "Maracay", "Lechería", "Puerto Ordaz"],
	metaTitle: "Menú digital y caja para restaurantes en Venezuela",
	metaDescription:
		"Menú digital con QR, pedidos online y caja para restaurantes en Venezuela. Cobra en bolívares o dólares, con pago móvil, Zelle y tasa BCV del día. Sin comisión por venta.",
	keywords: [
		"menú digital Venezuela",
		"menú QR para restaurantes Venezuela",
		"carta digital Venezuela",
		"sistema para restaurantes Venezuela",
		"punto de venta para restaurantes Venezuela",
		"sistema de pedidos online Venezuela",
		"pedidos por WhatsApp Venezuela",
		"menú digital con pago móvil",
		"cobrar en bolívares y dólares restaurante",
		"tasa BCV restaurante",
		"software restaurante Caracas",
	],
	heroTitle: ["Menú digital y caja para", "restaurantes en Venezuela"],
	heroSubtitle:
		"Tus clientes piden desde tu link o tu QR y pagan en bolívares o en dólares. Tú ves el total en las dos monedas, a la tasa BCV del día, y no pagas comisión por venta.",
	deliveryApps: ["Yummy", "PedidosYa"],
	paymentMethods: ["Pago móvil", "Zelle", "Transferencia", "Efectivo", "Tarjeta en el local"],
	billingNote: "La suscripción se paga en dólares, con un precio fijo al mes.",
	localFeatures: [
		{
			title: "Bolívares y dólares, sin calculadora",
			text: "Tus precios van en dólares y el menú muestra el total también en bolívares, a la tasa BCV del día. El cliente que paga por pago móvil ve el monto exacto en Bs.",
		},
		{
			title: "Pago móvil, Zelle y transferencia",
			text: "El cliente elige cómo pagar al hacer el pedido, ve tus datos de cobro y el monto en la moneda que corresponde. El pedido llega a tu caja con el medio de pago marcado.",
		},
		{
			title: "Pedidos por WhatsApp, ordenados",
			text: "En vez de capturas y audios, el cliente arma el pedido en tu menú y te llega completo: productos, variantes, dirección y forma de pago.",
		},
		{
			title: "Caja que cuadra por moneda",
			text: "Abres y cierras el turno con lo que entró en bolívares y en dólares por separado, y cada venta guarda la tasa con la que se cobró.",
		},
	],
	faq: [
		{
			question: `¿Cuánto cuesta ${LANDING_PRODUCT_NAME} en Venezuela?`,
			answer:
				"Es un plan mensual fijo en dólares, que ves en la sección de planes de la home. No hay comisión por venta ni por pedido, y en tu primer pago llevas 2 meses al precio de 1.",
		},
		{
			question: "¿Puedo cobrar en bolívares y en dólares?",
			answer:
				"Sí. Pones tus precios en dólares y el menú calcula el equivalente en bolívares con la tasa BCV del día. Pago móvil, transferencia, efectivo y tarjeta en el local se cobran en bolívares; Zelle y los demás medios internacionales, en dólares.",
		},
		{
			question: "¿Acepta pago móvil y Zelle?",
			answer:
				"Sí. Configuras tus datos de pago móvil, Zelle o transferencia una vez, y el cliente los ve al elegir ese medio de pago, junto con el monto exacto que debe enviar.",
		},
		{
			question: "¿Qué pasa cuando cambia la tasa?",
			answer:
				"El menú usa la tasa BCV vigente, y cada pedido guarda la tasa con la que se cobró. En el cierre de caja ves lo que entró en cada moneda sin tener que recalcular nada.",
		},
		{
			question: "¿Funciona con el internet de Venezuela?",
			answer:
				"El menú del cliente es una página web ligera que carga en cualquier teléfono con datos. El panel de caja funciona desde el navegador, sin instalar nada.",
		},
	],
};

export const LANDING_COUNTRIES: Record<LandingCountrySlug, LandingCountry> = {
	chile: CHILE,
	venezuela: VENEZUELA,
};

export const LANDING_COUNTRY_SLUGS = Object.keys(LANDING_COUNTRIES) as LandingCountrySlug[];

export function getLandingCountry(slug: string): LandingCountry | null {
	return (LANDING_COUNTRIES as Record<string, LandingCountry>)[slug] ?? null;
}
