import { LANDING_PRODUCT_NAME } from "./brand";
import type { LANDING_BUSINESS_TYPE_SLUG_LIST } from "./marketing-paths";
import type { BusinessSector } from "@/lib/onboarding/business-sectors";

/**
 * Páginas por tipo de negocio (/menu-digital/pizzerias, /menu-digital/sushi…).
 *
 * Por qué existen: casi nadie busca «software para restaurantes»; busca con su rubro
 * («menú digital para pizzería», «carta QR cafetería»). Son búsquedas largas, con menos
 * competencia, y quien las escribe ya sabe lo que necesita. Es el mismo patrón que usan
 * los sistemas de caja grandes: una página por tipo de local, con el vocabulario del rubro
 * y una guía de «qué debe tener» antes del producto.
 *
 * Reglas (Google castiga las páginas hechas en serie con el nombre cambiado):
 * - Cada página tiene su propio texto: guía, preguntas y ejemplos distintos. Nada se
 *   copia entre rubros salvo la lista de funciones generales.
 * - Solo promesas que el producto cumple hoy, igual que las páginas de país.
 * - El texto visible y el JSON-LD (FAQPage) salen de estos mismos datos.
 * - Pocas páginas y buenas: un rubro entra solo si existe en el alta (`business-sectors`),
 *   porque la tienda nace con su menú de ejemplo.
 */

export type LandingBusinessTypeSlug = (typeof LANDING_BUSINESS_TYPE_SLUG_LIST)[number];

type BusinessTypeGuideItem = { title: string; text: string };
type BusinessTypeFaq = { question: string; answer: string };

export type LandingBusinessType = {
	slug: LandingBusinessTypeSlug;
	/** Tipo de negocio del alta: de aquí sale el menú de ejemplo con que nace la tienda. */
	sector: BusinessSector;
	/** Plural en minúscula para el texto («pizzerías»). */
	plural: string;
	/** Singular para «el sistema de tu …» («pizzería», «local de sushi»). */
	singular: string;
	/** Nombre corto para tarjetas y migas de pan («Pizzerías»). */
	label: string;
	/** Título de la pestaña; la plantilla raíz añade « · Gcode Labs». ≤ 60 caracteres en total. */
	metaTitle: string;
	metaDescription: string;
	/** Búsquedas a las que apunta la página. */
	keywords: string[];
	/** H1 en dos partes: la segunda va en color. */
	heroTitle: [string, string];
	heroSubtitle: string;
	/** Una línea para la tarjeta del índice /menu-digital. */
	teaser: string;
	/** «Qué debe tener el sistema de una pizzería»: la guía que responde antes de vender. */
	guide: BusinessTypeGuideItem[];
	faq: BusinessTypeFaq[];
};

const PIZZERIAS: LandingBusinessType = {
	slug: "pizzerias",
	sector: "Pizzería",
	plural: "pizzerías",
	singular: "pizzería",
	label: "Pizzerías",
	metaTitle: "Menú digital y pedidos online para pizzerías",
	metaDescription:
		"Menú digital con QR, pedidos online por tamaño y delivery por zonas para tu pizzería, sin comisión por pedido. Tu tienda parte con un menú de pizzería de ejemplo.",
	keywords: [
		"menú digital para pizzería",
		"sistema de pedidos para pizzería",
		"menú QR pizzería",
		"pedidos online pizzería sin comisión",
		"software para pizzerías",
		"delivery pizzería propio",
	],
	heroTitle: ["Menú digital y pedidos online para", "pizzerías"],
	heroSubtitle:
		"Tus clientes eligen tamaño y masa desde tu link o tu QR, el pedido llega a tu caja y a la cocina, y la venta completa queda para tu pizzería.",
	teaser: "Tamaños, variantes, delivery por zonas y la noche del viernes bajo control.",
	guide: [
		{
			title: "Tamaños y variantes con su precio",
			text: "Individual, mediana o familiar; masa fina o gruesa, cada opción con su diferencia de precio. Si el sistema no lo maneja, el cliente termina preguntando por WhatsApp y el pedido se demora.",
		},
		{
			title: "Delivery por zonas",
			text: "El costo de envío no es el mismo a diez cuadras que al otro lado de la ciudad. Define tus zonas una vez y el menú cobra el envío correcto solo.",
		},
		{
			title: "Pausar pedidos en la hora punta",
			text: "Cuando el horno no da más, pausas los pedidos online con un aviso para el cliente y los reabres cuando la cocina se pone al día. Fuera de tu horario, el menú avisa que estás cerrado.",
		},
		{
			title: "Cocina y caja con el mismo pedido",
			text: "El pedido online y el del mostrador entran al mismo turno: va a cocina como comanda y al cierre ves cuánto vendiste por cada medio de pago.",
		},
	],
	faq: [
		{
			question: "¿Puedo vender la misma pizza en varios tamaños?",
			answer:
				"Sí. Cada producto puede tener tamaños y variantes con su propio precio, así que la Margarita familiar y la individual son el mismo producto con dos precios, no dos productos sueltos.",
		},
		{
			question: "¿Cómo cobro el delivery según la distancia?",
			answer:
				"Defines zonas de reparto con su costo de envío. El cliente elige su zona al pedir y el total ya incluye el envío correcto. También puedes ofrecer retiro en el local.",
		},
		{
			question: "¿Qué pasa si se me llena la cocina un viernes?",
			answer:
				"Pausas los pedidos online desde el panel y el menú muestra un aviso a quien entra. El mostrador sigue funcionando y reabres los pedidos con un clic.",
		},
	],
};

const SUSHI: LandingBusinessType = {
	slug: "sushi",
	sector: "Sushi",
	plural: "locales de sushi",
	singular: "local de sushi",
	label: "Sushi",
	metaTitle: "Menú digital y delivery para locales de sushi",
	metaDescription:
		"Menú digital con fotos, promociones por piezas y pedidos online para tu local de sushi, con delivery por zonas y sin comisión por pedido. Hecho en Santiago.",
	keywords: [
		"menú digital para sushi",
		"sistema de pedidos sushi",
		"carta digital sushi",
		"delivery sushi sin comisión",
		"software para restaurante de sushi",
		"pedidos online sushi",
	],
	heroTitle: ["Menú digital y delivery para", "locales de sushi"],
	heroSubtitle:
		"Rolls con foto, promociones por piezas y pedidos que llegan completos a tu caja. El sushi se vende por los ojos: que tu menú lo muestre como se ve en la mesa.",
	teaser: "Promociones por piezas, fotos que venden y delivery sin pagar comisión.",
	guide: [
		{
			title: "Fotos grandes de cada roll",
			text: "En sushi, la foto vende más que la descripción. Cada producto lleva su imagen, y el cliente ve el roll antes de pedirlo, no un nombre en una lista.",
		},
		{
			title: "Promociones armadas por piezas",
			text: "Promo 30, 40 o 60 piezas como productos propios, con sus variantes. El cliente elige su promo sin escribirte para preguntar qué incluye.",
		},
		{
			title: "Delivery propio, sin comisión",
			text: "El sushi es de los rubros que más se piden a domicilio. Cada pedido que llega por tu link en vez de una app de delivery es un pedido sin comisión.",
		},
		{
			title: "Productos agotados al día",
			text: "Si se acabó el salmón, desactivas el producto en el panel y deja de aparecer en el menú hasta que lo vuelvas a activar. Así no tienes que llamar al cliente después.",
		},
	],
	faq: [
		{
			question: "¿Puedo armar promociones de 30 o 40 piezas?",
			answer:
				"Sí. Cada promoción es un producto con su foto, su precio y sus variantes, en la categoría que quieras. Tu tienda parte con una categoría de promociones de ejemplo que puedes editar.",
		},
		{
			question: "¿El cliente puede elegir los rolls de su promo?",
			answer:
				"Puedes ofrecer las opciones como variantes del producto, o el cliente las indica en la nota del producto. Lo que elige llega escrito en el pedido.",
		},
		{
			question: "¿Sirve si ya vendo por PedidosYa o Uber Eats?",
			answer:
				"Sí. Muchos locales siguen en las apps para captar clientes nuevos y llevan a su propio link a los que repiten. Con la calculadora de comisiones ves cuánto representa eso cada mes.",
		},
	],
};

const HAMBURGUESERIAS: LandingBusinessType = {
	slug: "hamburgueserias",
	sector: "Hamburguesas",
	plural: "hamburgueserías",
	singular: "hamburguesería",
	label: "Hamburgueserías",
	metaTitle: "Menú digital y pedidos para hamburgueserías",
	metaDescription:
		"Menú QR, pedidos online con variantes y punto de venta para tu hamburguesería. Combos, retiro en el local y delivery por zonas, con un plan fijo y sin comisión.",
	keywords: [
		"menú digital hamburguesería",
		"sistema de pedidos hamburguesería",
		"menú QR hamburguesas",
		"punto de venta hamburguesería",
		"pedidos online hamburguesas sin comisión",
	],
	heroTitle: ["Menú digital y pedidos para", "hamburgueserías"],
	heroSubtitle:
		"Simple o doble, de carne o de pollo, en combo o sola: el cliente la elige en tu menú, anota «sin cebolla» en el mismo producto y el pedido llega a la plancha tal como lo pidió.",
	teaser: "Variantes, combos y notas por producto que llegan a la plancha sin errores.",
	guide: [
		{
			title: "Opciones sin anotar a mano",
			text: "Simple o doble, carne o pollo: cada variante con su precio. Y «sin cebolla» va como nota en el mismo producto, así no se pierde entre mensajes de WhatsApp.",
		},
		{
			title: "Combos como un solo producto",
			text: "Hamburguesa, papas y bebida en un combo con su precio y su foto. Tu tienda parte con una categoría de acompañamientos de ejemplo.",
		},
		{
			title: "Retiro en el local",
			text: "Mucho cliente de hamburguesas pasa a buscar. El menú ofrece retiro además de delivery, y el pedido te avisa cuál de los dos eligió.",
		},
		{
			title: "Mostrador y online en la misma caja",
			text: "Los pedidos del mostrador y los que llegan por tu link entran al mismo turno. Al cerrar, cuadras la caja con el detalle de cada venta.",
		},
	],
	faq: [
		{
			question: "¿El cliente puede sacar o agregar ingredientes?",
			answer:
				"Sí. Cada producto puede tener variantes con su precio, como simple o doble, y el cliente deja en la nota del producto lo que quiere cambiar, como «sin cebolla». Todo llega escrito en el pedido.",
		},
		{
			question: "¿Puedo vender combos?",
			answer:
				"Sí, como productos con su precio y su foto, en una categoría de combos. Así el cliente ve el ahorro frente a comprar cada cosa por separado.",
		},
		{
			question: "¿Funciona para un food truck?",
			answer:
				"Sí. Es un sistema web: el menú se abre desde un QR o un link, y la caja funciona en el navegador de un teléfono o tablet, sin instalar nada.",
		},
	],
};

const COMIDA_RAPIDA: LandingBusinessType = {
	slug: "comida-rapida",
	sector: "Comida rápida",
	plural: "locales de comida rápida",
	singular: "local de comida rápida",
	label: "Comida rápida",
	metaTitle: "Menú digital y caja para comida rápida",
	metaDescription:
		"Menú QR, pedidos para retirar y caja para tu local de comida rápida, de sándwiches o food truck. Combos, pedidos ordenados y un plan fijo, sin comisión por venta.",
	keywords: [
		"menú digital comida rápida",
		"sistema para local de comida rápida",
		"menú QR para food truck",
		"sistema de pedidos food truck",
		"caja para comida rápida",
	],
	heroTitle: ["Menú digital y caja para", "comida rápida"],
	heroSubtitle:
		"Perros calientes, sándwiches, arepas o salchipapas: el cliente pide desde el QR o tu link, paga como prefiera y el pedido sale del mostrador sin errores ni filas largas.",
	teaser: "Pedidos para retirar, combos y una caja que no se traba en la hora de almuerzo.",
	guide: [
		{
			title: "Pedir sin hacer fila",
			text: "Con el QR en el mostrador o en la vitrina, el cliente arma su pedido desde el teléfono mientras espera, y tú lo recibes ordenado.",
		},
		{
			title: "Combos que se venden solos",
			text: "Sándwich, papas y bebida en un combo con su precio y su foto. Tu tienda parte con una categoría de combos de ejemplo.",
		},
		{
			title: "Una caja para la hora de almuerzo",
			text: "Los pedidos del mostrador y los del menú entran al mismo turno, y el cierre te dice cuánto entró por cada medio de pago.",
		},
		{
			title: "El mismo link donde te instales",
			text: "Si tienes un food truck o vendes en ferias, el menú va contigo: el mismo QR y el mismo link sirven en cualquier punto.",
		},
	],
	faq: [
		{
			question: "¿Sirve para un local de sándwiches o un carrito de perros calientes?",
			answer:
				"Sí. Sirve para cualquier local que venda por pedido: armas tu menú con tus sándwiches y combos, y lo compartes con un QR o un link.",
		},
		{
			question: "¿El cliente puede pagar por transferencia?",
			answer:
				"Sí. Eliges los medios de pago que aceptas, como efectivo, tarjeta en el local o transferencia, y el cliente elige al pedir. Si paga por transferencia, adjunta el comprobante al pedido.",
		},
		{
			question: "¿Cuánto me demoro en tener el menú listo?",
			answer:
				"La tienda parte con un menú de comida rápida de ejemplo: cambias nombres, fotos y precios, y la publicas. Se arma en una tarde, y armarla no cuesta nada: pagas cuando la publicas.",
		},
	],
};

const RESTAURANTES: LandingBusinessType = {
	slug: "restaurantes",
	sector: "Restaurante",
	plural: "restaurantes",
	singular: "restaurante",
	label: "Restaurantes a la carta",
	metaTitle: "Menú digital para restaurantes a la carta",
	metaDescription:
		"Menú digital con QR para restaurantes a la carta y de menú del día: entradas, platos principales y postres con foto, pedidos para llevar y caja, sin comisión por venta.",
	keywords: [
		"carta digital restaurante",
		"menú del día digital",
		"carta QR restaurante a la carta",
		"sistema para restaurante",
		"pedidos para llevar restaurante",
	],
	heroTitle: ["Menú digital y caja para", "restaurantes a la carta"],
	heroSubtitle:
		"Entradas, platos principales y postres con su foto en el QR de la mesa, pedidos para llevar desde tu link y una caja que cierra el día con el detalle de cada venta.",
	teaser: "Entradas, principales y postres en un menú QR, con pedidos para llevar y caja.",
	guide: [
		{
			title: "Una carta ordenada por tiempos",
			text: "Entradas, platos principales, postres y bebidas en categorías, para que el cliente recorra el menú como en el papel.",
		},
		{
			title: "El plato del día sin reimprimir",
			text: "Cambias el plato del día o un precio en el panel y el menú de todas las mesas se actualiza con el mismo QR.",
		},
		{
			title: "Acompañamientos y opciones",
			text: "Arroz o puré, ensalada o papas: cada plato puede tener variantes, con o sin diferencia de precio, y llegan escritas al pedido.",
		},
		{
			title: "Para llevar y delivery",
			text: "Además de la mesa, tus clientes piden para retirar o con delivery desde el mismo link, y el pedido entra a tu caja.",
		},
	],
	faq: [
		{
			question: "¿Puedo publicar un menú del día?",
			answer:
				"Sí. Lo publicas como un producto o una categoría que actualizas cada día; el QR de las mesas siempre muestra lo vigente.",
		},
		{
			question: "¿Los clientes pueden pedir desde la mesa?",
			answer:
				"En la mesa ven el menú en su teléfono; el pedido lo toma tu equipo y lo registra en la caja. Los pedidos online del link son para retirar o con delivery.",
		},
		{
			question: "¿Sirve para un restaurante con varias sucursales?",
			answer:
				"Sí. Cada sucursal tiene su horario y sus zonas de delivery, y los reportes se ven por local o consolidados.",
		},
	],
};

const CAFETERIAS: LandingBusinessType = {
	slug: "cafeterias",
	sector: "Cafetería",
	plural: "cafeterías",
	singular: "cafetería",
	label: "Cafeterías",
	metaTitle: "Menú QR y caja para cafeterías",
	metaDescription:
		"Menú digital con QR para la mesa, pedidos para llevar y caja para tu cafetería. Tamaños, tipo de leche y vitrina del día, sin comisión por venta.",
	keywords: [
		"carta digital cafetería",
		"menú QR cafetería",
		"sistema para cafetería",
		"punto de venta cafetería",
		"pedidos para llevar cafetería",
	],
	heroTitle: ["Menú QR y caja para", "cafeterías"],
	heroSubtitle:
		"El menú en la mesa con un QR, los pedidos para llevar desde tu link y una caja que cierra el día sola. Para que la fila avance y la barra no se sature.",
	teaser: "QR en la mesa, tamaños y tipo de leche, y la vitrina del día siempre al día.",
	guide: [
		{
			title: "Un menú QR que se actualiza solo",
			text: "Cambias un precio o la torta del día en el panel y el QR de todas las mesas ya muestra lo nuevo. Sin reimprimir cartas.",
		},
		{
			title: "Tamaños y opciones de cada bebida",
			text: "Chico, mediano o grande; leche entera, descremada o vegetal. Cada opción con su precio, para que la barra reciba el pedido exacto.",
		},
		{
			title: "Pedidos para llevar, listos al llegar",
			text: "El cliente pide desde tu link camino a la cafetería y lo retira en el mostrador. Menos fila en la hora del café de la mañana.",
		},
		{
			title: "Lo que se acabó, fuera del menú",
			text: "La vitrina cambia durante el día. Desactivas lo que ya no queda y deja de aparecer en el menú, para no vender lo que no tienes.",
		},
	],
	faq: [
		{
			question: "¿Necesito imprimir un QR por mesa?",
			answer:
				"Basta con un QR que lleve a tu menú; puedes imprimir el mismo en todas las mesas. Como el menú vive en la web, el QR no cambia aunque cambies los productos.",
		},
		{
			question: "¿Puedo cobrar distinto por leche vegetal?",
			answer:
				"Sí. El tipo de leche puede ser una variante de la bebida con su propio recargo, y el total del pedido se calcula solo.",
		},
		{
			question: `¿${LANDING_PRODUCT_NAME} sirve también para una cafetería con panadería?`,
			answer:
				"Sí. Ordenas el menú en categorías, por ejemplo cafés, para comer y panadería, y el inventario descuenta el stock de cada producto con cada venta.",
		},
	],
};

const PANADERIAS: LandingBusinessType = {
	slug: "panaderias",
	sector: "Panadería y pastelería",
	plural: "panaderías y pastelerías",
	singular: "panadería o pastelería",
	label: "Panaderías y pastelerías",
	metaTitle: "Pedidos online para panaderías y pastelerías",
	metaDescription:
		"Catálogo digital y pedidos online para tu panadería o pastelería: tortas por porciones, encargos con retiro y caja del día, con un plan fijo y sin comisión.",
	keywords: [
		"pedidos online panadería",
		"catálogo digital pastelería",
		"sistema para panadería",
		"pedidos de tortas online",
		"menú digital pastelería",
	],
	heroTitle: ["Pedidos online para", "panaderías y pastelerías"],
	heroSubtitle:
		"Tortas por tamaño, pan por kilo y encargos que llegan escritos, no en un audio. Tu catálogo en un link para Instagram y WhatsApp, y la caja del día en el mismo panel.",
	teaser: "Tortas por porciones, encargos con retiro y el pan del día en un link.",
	guide: [
		{
			title: "Tortas por tamaño o porciones",
			text: "12, 15 o 20 porciones, cada una con su precio. El cliente elige en el catálogo y no tienes que mandar la lista de precios por WhatsApp cada vez.",
		},
		{
			title: "Encargos con todo por escrito",
			text: "El pedido llega con los productos, la variante y la nota del cliente, por ejemplo el mensaje para la torta, en vez de capturas y audios sueltos.",
		},
		{
			title: "Encargos para retirar",
			text: "La mayoría de los encargos se retiran. El cliente elige retiro al pedir y lo pasa a buscar; si haces despachos, defines tus zonas de reparto.",
		},
		{
			title: "Venta del mostrador en la misma caja",
			text: "El pan del día y los encargos online entran al mismo turno, y al cierre ves lo que vendiste por cada medio de pago.",
		},
	],
	faq: [
		{
			question: "¿Puedo vender tortas por número de porciones?",
			answer:
				"Sí. Cada torta puede tener variantes por tamaño o porciones con su precio. Tu tienda parte con una categoría de tortas y dulces de ejemplo que adaptas a la tuya.",
		},
		{
			question: "¿Sirve si vendo sobre todo por Instagram?",
			answer:
				"Es justo para eso: pones el link de tu catálogo en la bio y en las historias, y los pedidos te llegan ordenados en el panel en lugar de en los mensajes directos.",
		},
		{
			question: "¿Puedo vender pan por kilo?",
			answer:
				"Puedes publicar el pan por unidad de venta, por ejemplo una bolsa de 1 kg, con su precio. Las variantes te sirven para ofrecer medio kilo o un kilo.",
		},
	],
};

export const LANDING_BUSINESS_TYPES: Record<LandingBusinessTypeSlug, LandingBusinessType> = {
	pizzerias: PIZZERIAS,
	sushi: SUSHI,
	hamburgueserias: HAMBURGUESERIAS,
	"comida-rapida": COMIDA_RAPIDA,
	restaurantes: RESTAURANTES,
	cafeterias: CAFETERIAS,
	panaderias: PANADERIAS,
};

export const LANDING_BUSINESS_TYPE_SLUGS = Object.keys(LANDING_BUSINESS_TYPES) as LandingBusinessTypeSlug[];

export function isLandingBusinessTypeSlug(value: string): value is LandingBusinessTypeSlug {
	return Object.hasOwn(LANDING_BUSINESS_TYPES, value);
}
