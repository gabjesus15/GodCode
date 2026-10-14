import { LEGAL_MERCADO_PAGO_CLP, LEGAL_OTHER_CURRENCY, LEGAL_PRICES_IN_USD } from "@/lib/legal/legal-documents";

import { LANDING_COMPANY_NAME, LANDING_PRODUCT_NAME } from "./brand";
import type { LANDING_COUNTRY_SLUG_LIST } from "./marketing-paths";

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

/**
 * Los slugs salen de la lista única de `marketing-paths.ts` (la que usa la analítica):
 * `LANDING_COUNTRIES` se tipa con ellos, así que un país nuevo se añade en los dos sitios
 * o no compila.
 */
export type LandingCountrySlug = (typeof LANDING_COUNTRY_SLUG_LIST)[number];

type LandingCountryFaq = { question: string; answer: string };

/** `href`: la página de esa función (/funciones/…), si existe. */
type LandingCountryFeature = { title: string; text: string; href?: string };

export type LandingCountry = {
	slug: LandingCountrySlug;
	/** ISO 3166-1 alpha-2, para `areaServed` y para resolver el precio regional. */
	code: "CL" | "VE" | "US";
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
	/**
	 * En qué moneda se paga, con las mismas frases que los Términos (`lib/legal/legal-documents.ts`).
	 * Va bajo `billingNote`, en el bloque «Cuánto cuesta».
	 */
	currencyNote?: string;
	/** Bloques «Pensado para {país}». */
	localFeatures: LandingCountryFeature[];
	faq: LandingCountryFaq[];
};

/** Funciones iguales en los dos países: se escriben una vez. */
export const LANDING_COUNTRY_SHARED_FEATURES: LandingCountryFeature[] = [
	{
		title: "Menú digital con QR",
		href: "/funciones/menu-qr",
		text: "Fotos, variantes, combos y tamaños. Tus clientes lo abren desde la mesa, Instagram o WhatsApp sin descargar nada.",
	},
	{
		title: "Pedidos online sin comisión",
		href: "/funciones/pedidos-online",
		text: "Carrito y checkout en tu propio link. Cada pedido llega a tu caja y la venta completa es tuya.",
	},
	{
		title: "Punto de venta y comandas",
		href: "/funciones/punto-de-venta",
		text: "Abres el turno, tomas pedidos en mostrador, los mandas a cocina y cierras caja con el detalle del día.",
	},
	{
		title: "Delivery y retiro en tienda",
		href: "/funciones/delivery-propio",
		text: "Zonas de reparto, costo de envío y pedidos para retirar, desde el mismo panel que la sala.",
	},
	{
		title: "Inventario y reportes",
		href: "/funciones/inventario",
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
		"Carta digital con QR, pedidos online y punto de venta para restaurantes en Chile, sin comisión por venta. Plan fijo al mes, sin UF, soporte desde Santiago.",
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
		"Hecho en Santiago. Tus clientes piden desde tu link o tu QR, pagas un plan fijo al mes y no cedes comisión en ningún pedido.",
	deliveryApps: ["PedidosYa", "Rappi", "Uber Eats"],
	paymentMethods: ["Efectivo", "Tarjeta en el local", "Transferencia", "Mercado Pago"],
	// El precio del plan está en dólares; con Mercado Pago se cobra el equivalente en pesos. Las frases de
	// moneda son las de los Términos (sección 5): no se reescriben aquí con otras palabras.
	billingNote: "Armas tu tienda gratis y eliges tu plan cuando la publicas. Es un monto fijo al mes, sin UF ni comisión por venta.",
	currencyNote: `${LEGAL_PRICES_IN_USD} ${LEGAL_MERCADO_PAGO_CLP} ${LEGAL_OTHER_CURRENCY}`,
	localFeatures: [
		{
			title: "Un plan fijo, sin comisión",
			text: "Pagas un plan mensual en dólares y nada más: ni UF ni porcentaje por pedido. Un local que vende por apps de delivery puede dejar ahí entre un 20 y un 30 % en comisiones; calcúlalo con tu propia venta.",
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
				`Armar tu tienda no cuesta nada. Pagas cuando la publicas, con un plan mensual fijo que ves en la sección de planes de la home, por PayPal, Mercado Pago o transferencia. ${LEGAL_PRICES_IN_USD} ${LEGAL_MERCADO_PAGO_CLP} No hay comisión por venta ni por pedido, ni reajuste por UF, y en tu primer pago llevas 2 meses al precio de 1.`,
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
		// «Punto de venta» en Venezuela es el datáfono del banco: no se apunta a esa búsqueda.
		"sistema de caja para restaurantes Venezuela",
		"sistema administrativo para restaurantes",
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
	billingNote: "Armas tu tienda gratis y eliges tu plan cuando la publicas. La suscripción es un monto fijo en dólares al mes.",
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
				"Armar tu tienda no cuesta nada. Pagas cuando la publicas, con un plan mensual fijo en dólares que ves en la sección de planes de la home. No hay comisión por venta ni por pedido, y en tu primer pago llevas 2 meses al precio de 1.",
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
			question: "¿Funciona con el punto de mi banco?",
			answer:
				"Sí. Sigues cobrando con el punto de venta de tu banco como siempre; en la caja marcas que el pago fue con tarjeta y el cierre te lo muestra separado del pago móvil, el Zelle y el efectivo.",
		},
		{
			question: "¿Funciona con el internet de Venezuela?",
			answer:
				"El menú del cliente es una página web ligera que carga en cualquier teléfono con datos. El panel de caja funciona desde el navegador, sin instalar nada.",
		},
	],
};

/**
 * Estados Unidos, en español: para dueños hispanos (Miami, Doral, Houston…). Solo lo que
 * funciona hoy para un local de allá (rama fix/checkout-otros-paises): carrito sin documento
 * y con +1, centavos, sales tax por sucursal, menú en inglés. No hay cobro con tarjeta
 * dentro del menú ni despacho con Uber: no se promete.
 */
const ESTADOS_UNIDOS: LandingCountry = {
	slug: "estados-unidos",
	code: "US",
	name: "Estados Unidos",
	demonym: "hispanos en Estados Unidos",
	cities: ["Miami", "Doral", "Houston", "Orlando", "Dallas", "Nueva York", "Los Ángeles"],
	metaTitle: "Menú digital para restaurantes en Estados Unidos",
	metaDescription:
		"Menú QR y pedidos online para restaurantes hispanos en Estados Unidos: tú lo manejas en español y tus clientes piden en inglés. Dólares, Zelle y sin comisión por pedido.",
	keywords: [
		"menú digital restaurante Miami",
		"sistema para restaurantes en Estados Unidos",
		"menú QR restaurante hispano",
		"pedidos online restaurante Doral",
		"software para restaurante en español Estados Unidos",
		"alternativa a DoorDash sin comisión",
		"pedidos por WhatsApp restaurante Houston",
	],
	heroTitle: ["Menú digital y pedidos para", "restaurantes en EE. UU."],
	heroSubtitle:
		"Tú manejas todo en español; tus clientes ven el menú en inglés y piden desde tu link o tu QR. Precios en dólares con centavos, sales tax incluido en la cuenta y sin comisión por pedido.",
	deliveryApps: ["DoorDash", "Uber Eats", "Grubhub"],
	paymentMethods: ["Efectivo", "Tarjeta al retirar o al entregar", "Zelle", "PayPal"],
	billingNote: "Armas tu tienda gratis y eliges tu plan cuando la publicas. Es un monto fijo al mes en dólares, sin comisión por venta.",
	currencyNote: LEGAL_PRICES_IN_USD,
	localFeatures: [
		{
			title: "Tú en español, tus clientes en inglés",
			text: "El panel y la caja están en español. El menú que ven tus clientes sale en inglés, y los nombres de los platos los escribes como quieras, en un idioma o en los dos.",
		},
		{
			title: "Dólares y sales tax",
			text: "Precios con centavos y la tasa de sales tax de tu ciudad configurada por local: el menú la suma al precio y el cliente ve el total antes de pedir.",
		},
		{
			title: "Zelle y PayPal con comprobante",
			text: "El cliente paga en efectivo o con tarjeta al retirar, o por Zelle o PayPal y adjunta el comprobante al pedido. Tú confirmas el pago en la caja.",
		},
		{
			title: "Sin la comisión de DoorDash",
			text: "Las apps de delivery cobran un porcentaje de cada pedido. Con tu propio link pagas un plan fijo al mes y los clientes que repiten te piden a ti.",
		},
	],
	faq: [
		{
			question: `¿Cuánto cuesta ${LANDING_PRODUCT_NAME} en Estados Unidos?`,
			answer:
				`Armar tu tienda no cuesta nada. Pagas cuando la publicas, con un plan mensual fijo en dólares por PayPal. ${LEGAL_PRICES_IN_USD} No hay comisión por venta ni por pedido, y en tu primer pago llevas 2 meses al precio de 1.`,
		},
		{
			question: "¿Mis clientes pueden pagar con tarjeta dentro del menú?",
			answer:
				"Hoy no hay cobro con tarjeta dentro del menú. El cliente paga en efectivo o con tarjeta al retirar o recibir el pedido, o por Zelle o PayPal adjuntando el comprobante, que tú confirmas en la caja.",
		},
		{
			question: "¿El menú sale en inglés?",
			answer:
				"Sí. Para un negocio en Estados Unidos, los botones, el carrito y los avisos del menú salen en inglés. Los platos y sus descripciones los escribes tú, en el idioma que prefieras.",
		},
		{
			question: "¿Cómo se cobra el sales tax?",
			answer:
				"Configuras la tasa de tu ciudad en cada local y el menú la suma al precio de los productos. Es una tasa fija por local, no se calcula por dirección del cliente.",
		},
		{
			question: "¿Puedo tener delivery propio?",
			answer:
				"Sí, con tu repartidor. El costo de envío se calcula por distancia (en kilómetros) o por zonas que defines tú, y el pedido llega con la dirección y un enlace de Google Maps.",
		},
	],
};

export const LANDING_COUNTRIES: Record<LandingCountrySlug, LandingCountry> = {
	chile: CHILE,
	venezuela: VENEZUELA,
	"estados-unidos": ESTADOS_UNIDOS,
};

export const LANDING_COUNTRY_SLUGS = Object.keys(LANDING_COUNTRIES) as LandingCountrySlug[];
