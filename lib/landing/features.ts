import { LANDING_COMPANY_NAME, LANDING_PRODUCT_NAME } from "./brand";
import type { LANDING_FEATURE_SLUG_LIST } from "./marketing-paths";

/**
 * Páginas por función (/funciones/punto-de-venta, /funciones/menu-qr…).
 *
 * La home compite por «menú digital y POS para restaurantes» todo junto; quien busca
 * «sistema POS para restaurante» o «menú QR» encuentra antes una página dedicada a
 * eso. Es el patrón de los sistemas grandes: una página por función, además de las de
 * rubro (`business-types.ts`) y país (`countries.ts`).
 *
 * Mismas reglas que los rubros:
 * - Cada página tiene su propio texto: nada se copia entre funciones ni con los rubros.
 * - Solo lo que el producto hace hoy, comprobado en el código (canales de pedido en
 *   `lib/tenant/menu-settings.ts`, delivery en `lib/delivery/delivery-settings.ts`, la
 *   tarjeta QR de `components/customer-portal/setup/steps/publish-step.tsx`…).
 * - El texto visible y el JSON-LD salen de estos datos.
 */

export type LandingFeatureSlug = (typeof LANDING_FEATURE_SLUG_LIST)[number];

type FeatureGuideItem = { title: string; text: string };
type FeatureStep = { title: string; text: string };
type FeatureFaq = { question: string; answer: string };

export type LandingFeature = {
	slug: LandingFeatureSlug;
	/** Nombre corto para tarjetas, chips y migas de pan. */
	label: string;
	/** Título de la pestaña; la plantilla raíz añade « · Gcode Labs». ≤ 60 caracteres en total. */
	metaTitle: string;
	metaDescription: string;
	keywords: string[];
	/** H1 en dos partes: la segunda va en color. */
	heroTitle: [string, string];
	heroSubtitle: string;
	/** Una línea para la tarjeta del índice /funciones. */
	teaser: string;
	/** Título de la guía («Qué debe tener un punto de venta…»). */
	guideTitle: string;
	guide: FeatureGuideItem[];
	/** Cómo se usa, en tres pasos. */
	steps: FeatureStep[];
	faq: FeatureFaq[];
};

const PUNTO_DE_VENTA: LandingFeature = {
	slug: "punto-de-venta",
	label: "Sistema POS y caja",
	metaTitle: "Sistema POS y caja para restaurantes",
	metaDescription:
		"Sistema POS y caja para restaurantes desde el navegador: turnos, pedidos del mostrador y online juntos, comandas a cocina y cierre por medio de pago.",
	keywords: [
		"punto de venta para restaurantes",
		"sistema POS para restaurantes",
		"POS restaurante",
		"sistema de caja para restaurante",
		"sistema administrativo para restaurantes",
		"caja para restaurante",
		"software de caja restaurante",
		"sistema de comandas",
		"POS sin comisión",
	],
	heroTitle: ["Sistema POS y caja para", "restaurantes"],
	heroSubtitle:
		"Abres el turno, tomas los pedidos del mostrador junto a los que llegan por tu menú online, los mandas a cocina y cierras la caja con el detalle de cada medio de pago.",
	teaser: "Turnos, comandas y cierre de caja, con los pedidos online en la misma pantalla.",
	guideTitle: "Qué debe tener el punto de venta de un restaurante",
	guide: [
		{
			title: "Turnos con apertura y cierre",
			text: "Cada turno se abre y se cierra en la caja. Al cerrar ves cuánto entró por efectivo, tarjeta, transferencia y cada medio que aceptas, y cuadras sin planillas.",
		},
		{
			title: "Online y mostrador en una sola fila",
			text: "Si tu caja recibe dos fuentes de pedidos por separado, alguno se pierde en la hora punta. Aquí el pedido de tu link y el del mostrador entran al mismo turno.",
		},
		{
			title: "Comandas para la cocina",
			text: "El pedido pasa a cocina con sus productos, tamaños, variantes y notas, como «sin cebolla». Nadie tiene que volver a escribirlo.",
		},
		{
			title: "Sin equipo especial",
			text: "La caja funciona en el navegador de un computador, una tablet o un teléfono. No hay que comprar un terminal ni instalar programas.",
		},
	],
	steps: [
		{ title: "Abres el turno", text: "Desde ese momento tu menú online acepta pedidos y la caja empieza a registrar." },
		{ title: "Vendes por los dos lados", text: "Tomas pedidos en el mostrador y recibes los de tu link en la misma pantalla." },
		{ title: "Cierras la caja", text: "El cierre trae el total del turno por medio de pago, listo para cuadrar." },
	],
	faq: [
		{
			question: "¿Necesito comprar un equipo para la caja?",
			answer:
				"No. La caja se usa desde el navegador en el computador, la tablet o el teléfono que ya tienes. Basta con conexión a internet.",
		},
		{
			question: "¿Por qué el menú online no recibe pedidos con la caja cerrada?",
			answer:
				"Cuando los pedidos online se guardan en tu caja, el menú los acepta solo con un turno abierto. Así nunca entra un pedido que nadie está viendo.",
		},
		{
			question: `¿${LANDING_PRODUCT_NAME} es un datáfono para pasar tarjetas?`,
			answer:
				"No. Es el sistema de caja, no la máquina para cobrar con tarjeta (en Venezuela le dicen «el punto»). Sigues cobrando con el datáfono de tu banco y registras en la caja que el pago fue con tarjeta.",
		},
		{
			question: "¿Emite boleta o factura electrónica?",
			answer:
				`Hoy registra la venta y el medio de pago; la boleta o factura la sigues emitiendo con tu sistema de siempre. Si necesitas la integración, ${LANDING_COMPANY_NAME} también construye sistemas a medida.`,
		},
	],
};

const MENU_QR: LandingFeature = {
	slug: "menu-qr",
	label: "Menú QR",
	metaTitle: "Menú QR y carta digital para restaurantes",
	metaDescription:
		"Menú digital con QR para tu restaurante: fotos, tamaños y variantes, una tarjeta lista para imprimir en las mesas y un QR que no cambia aunque cambies los precios.",
	keywords: [
		"menú QR para restaurantes",
		"menú digital con QR",
		"crear menú QR",
		"carta digital QR",
		"carta QR restaurante",
		"menú QR gratis",
	],
	heroTitle: ["Menú QR para", "tu restaurante"],
	heroSubtitle:
		"Tus clientes escanean el QR de la mesa y ven tu menú con fotos y precios al día, sin descargar ninguna app. El mismo link sirve para pedir para llevar o con delivery.",
	teaser: "Un QR que no cambia, una tarjeta lista para imprimir y el menú siempre al día.",
	guideTitle: "Qué debe tener un buen menú QR",
	guide: [
		{
			title: "Un QR que no se reimprime",
			text: "El QR lleva al link de tu menú, no a un PDF. Cambias un precio o un plato en el panel y el mismo QR muestra lo nuevo en todas las mesas.",
		},
		{
			title: "Tarjeta lista para imprimir",
			text: "Descargas una imagen con el nombre de tu local, el QR y la dirección de tu menú, del tamaño justo para imprimir y poner en cada mesa.",
		},
		{
			title: "Fotos, tamaños y variantes",
			text: "Cada plato con su foto y, si los tiene, sus tamaños y opciones con precio. El cliente entiende lo que pide sin preguntarle al mesero.",
		},
		{
			title: "Horario y pausa",
			text: "Fuera de tu horario el menú avisa que estás cerrado, y si la cocina se satura puedes pausar los pedidos sin bajar el menú.",
		},
	],
	steps: [
		{ title: "Armas tu menú", text: "Partes con un menú de ejemplo de tu rubro y lo cambias por tus platos, fotos y precios." },
		{ title: "Descargas el QR", text: "Al publicar, bajas la tarjeta con tu QR para imprimir y poner en las mesas." },
		{ title: "El cliente escanea", text: "Ve el menú en su teléfono, con fotos y precios al día." },
	],
	faq: [
		{
			question: "¿El cliente tiene que descargar una app para ver el menú?",
			answer: "No. El QR abre tu menú en el navegador del teléfono, en cualquier marca y sin instalar nada.",
		},
		{
			question: "¿Tengo que cambiar el QR si cambio los precios?",
			answer:
				"No. El QR apunta siempre al mismo link; lo que cambias en el panel se ve al instante con el mismo QR impreso.",
		},
		{
			question: "¿Puedo usar el mismo menú en Instagram?",
			answer:
				"Sí. El link de tu menú sirve igual para la bio de Instagram, los estados de WhatsApp y el QR de las mesas.",
		},
	],
};

const PEDIDOS_ONLINE: LandingFeature = {
	slug: "pedidos-online",
	label: "Pedidos online y WhatsApp",
	metaTitle: "Pedidos online y por WhatsApp para restaurantes",
	metaDescription:
		"Sistema de pedidos online para restaurantes: el cliente arma su pedido en tu menú y te llega completo por WhatsApp, a tu caja o a los dos, sin comisión por pedido.",
	keywords: [
		"sistema de pedidos online para restaurantes",
		"pedidos por WhatsApp restaurante",
		"pedidos online sin comisión",
		"tienda online para restaurante",
		"app de pedidos propia",
		"recibir pedidos por WhatsApp",
	],
	heroTitle: ["Pedidos online y por WhatsApp para", "restaurantes"],
	heroSubtitle:
		"En vez de audios y capturas, el cliente arma su pedido en tu menú y te llega ordenado: productos, dirección, forma de pago y total. Tú eliges si llega por WhatsApp, a tu caja o a los dos.",
	teaser: "El pedido llega completo por WhatsApp o a tu caja, sin comisión por pedido.",
	guideTitle: "Qué debe tener un sistema de pedidos propio",
	guide: [
		{
			title: "Tú eliges por dónde llega",
			text: "Solo por WhatsApp, solo a tu caja o por los dos a la vez. Lo cambias en la configuración de tu menú, sin cambiar de link.",
		},
		{
			title: "Un mensaje que se entiende",
			text: "El WhatsApp trae cada producto con su variante y nota, el envío, el total, la forma de pago y un código para que los dos hablen del mismo pedido.",
		},
		{
			title: "La dirección con mapa",
			text: "En los pedidos con delivery llega la dirección con su referencia y un enlace de Google Maps para pasárselo directo al repartidor.",
		},
		{
			title: "Cupones y comprobantes",
			text: "El cliente puede aplicar un cupón de descuento, y si paga por transferencia adjunta el comprobante, que llega junto al pedido.",
		},
	],
	steps: [
		{ title: "El cliente arma su pedido", text: "Elige productos, tamaños y variantes en tu menú, y si es retiro o delivery." },
		{ title: "Confirma y paga", text: "Ve el total con envío y elige cómo pagar: efectivo, tarjeta, transferencia u otros." },
		{ title: "Te llega ordenado", text: "Por WhatsApp con el mensaje listo, a tu caja como pedido, o por ambos." },
	],
	faq: [
		{
			question: "¿Cobran comisión por cada pedido online?",
			answer: `No. ${LANDING_PRODUCT_NAME} cobra un plan fijo al mes; los pedidos que entran por tu link no pagan porcentaje.`,
		},
		{
			question: "¿Tengo que usar WhatsApp Business?",
			answer:
				"No es obligatorio. El pedido se envía al número de WhatsApp que configures; puede ser un WhatsApp normal o uno de empresa.",
		},
		{
			question: "¿Puedo recibir pedidos sin usar WhatsApp?",
			answer:
				"Sí. Si eliges que los pedidos lleguen solo a tu caja, el cliente confirma en el menú y el pedido aparece en tu turno, sin pasar por WhatsApp.",
		},
	],
};

const DELIVERY_PROPIO: LandingFeature = {
	slug: "delivery-propio",
	label: "Delivery propio",
	metaTitle: "Delivery propio para restaurantes, sin comisión",
	metaDescription:
		"Ofrece delivery desde tu propio menú: costo de envío por distancia o por zona, retiro en el local y la dirección con mapa para tu repartidor. Sin comisión por pedido.",
	keywords: [
		"delivery propio restaurante",
		"delivery sin comisión",
		"sistema de delivery para restaurantes",
		"cobrar envío por zona",
		"costo de envío por distancia",
		"alternativa a apps de delivery",
	],
	heroTitle: ["Delivery propio para", "restaurantes"],
	heroSubtitle:
		"Tu menú calcula el envío según dónde vive el cliente, por distancia o por zona, y el pedido llega con la dirección y el mapa para tu repartidor. Sin pagarle comisión a una app.",
	teaser: "Envío por distancia o por zona, retiro en el local y el mapa para tu repartidor.",
	guideTitle: "Qué necesitas para tener delivery propio",
	guide: [
		{
			title: "Envío por distancia",
			text: "Defines anillos por kilómetros desde tu local, cada uno con su costo. El menú ubica la dirección del cliente y cobra el anillo que corresponde.",
		},
		{
			title: "O por zonas con nombre",
			text: "Si prefieres cobrar por zonas, como comunas, municipios, urbanizaciones o sectores, armas la lista con su precio y el cliente elige la suya, o se reconoce por su dirección.",
		},
		{
			title: "También para retirar",
			text: "No todos quieren delivery. El cliente elige retiro al pedir y el pedido te avisa cuál de los dos eligió.",
		},
		{
			title: "Todo lo que necesita el repartidor",
			text: "Dirección, referencia como «casa azul, timbre 2» y un enlace de Google Maps, en el mismo pedido.",
		},
	],
	steps: [
		{ title: "Configuras tus zonas", text: "Por distancia en kilómetros o por zonas con nombre, cada una con su precio." },
		{ title: "El cliente pone su dirección", text: "El menú calcula el envío y lo suma al total antes de confirmar." },
		{ title: "Despachas", text: "Tú o tu repartidor reciben la dirección con mapa y referencia." },
	],
	faq: [
		{
			question: "¿Ustedes ponen los repartidores?",
			answer:
				`No. ${LANDING_PRODUCT_NAME} calcula el envío y te entrega el pedido con la dirección; el despacho lo haces tú o tu repartidor de confianza.`,
		},
		{
			question: "¿Puedo cobrar distinto según el barrio o la zona?",
			answer:
				"Sí. Armas una lista de zonas (comunas, municipios o sectores), cada uno con su costo de envío, y el cliente paga el que le corresponde.",
		},
		{
			question: "¿Puedo tener delivery en una sucursal y solo retiro en otra?",
			answer: "Sí. El delivery se configura por sucursal, con sus propias zonas y precios.",
		},
	],
};

const INVENTARIO: LandingFeature = {
	slug: "inventario",
	label: "Inventario y reportes",
	metaTitle: "Inventario y reportes para restaurantes",
	metaDescription:
		"Inventario para restaurantes que se descuenta con cada venta, productos que se ocultan cuando se acaban y reportes de ventas, pedidos y ticket promedio por sucursal.",
	keywords: [
		"inventario para restaurantes",
		"control de stock restaurante",
		"reportes de ventas restaurante",
		"software de inventario restaurante",
		"ticket promedio restaurante",
	],
	heroTitle: ["Inventario y reportes para", "restaurantes"],
	heroSubtitle:
		"El stock baja solo con cada venta, lo que se acaba deja de ofrecerse y al final del día sabes cuánto vendiste, cuántos pedidos hubo y cuál fue tu ticket promedio.",
	teaser: "Stock que se descuenta solo y reportes de ventas, pedidos y ticket promedio.",
	guideTitle: "Qué debe darte el inventario de un restaurante",
	guide: [
		{
			title: "Stock que se descuenta con la venta",
			text: "Cada venta, del mostrador o del menú online, descuenta el stock del producto. No hay que anotar las salidas a mano.",
		},
		{
			title: "Lo agotado sale del menú",
			text: "Cuando algo se acaba, lo desactivas y deja de aparecer en el menú hasta que vuelvas a activarlo, para no vender lo que no tienes.",
		},
		{
			title: "Reportes que se leen rápido",
			text: "Ventas, cantidad de pedidos y ticket promedio del período, para saber cómo va el negocio sin armar planillas.",
		},
		{
			title: "Por sucursal o en total",
			text: "Si tienes más de un local, ves el inventario y los reportes de cada uno o de todos juntos.",
		},
	],
	steps: [
		{ title: "Cargas tus productos", text: "Con su precio y su stock, por sucursal." },
		{ title: "Vendes como siempre", text: "Cada venta descuenta lo que salió, en el mostrador y online." },
		{ title: "Revisas los números", text: "Ventas, pedidos y ticket promedio del día, la semana o el mes." },
	],
	faq: [
		{
			question: "¿El stock baja también con los pedidos online?",
			answer: "Sí. Los pedidos que entran a tu caja descuentan stock igual que las ventas del mostrador.",
		},
		{
			question: "¿Qué es el ticket promedio?",
			answer:
				"Es lo que gasta en promedio cada pedido: el total vendido dividido por la cantidad de pedidos. Sirve para ver si tus combos y promociones suben el gasto por cliente.",
		},
		{
			question: "¿Puedo ver los números de cada local por separado?",
			answer: "Sí. Los reportes se ven por sucursal o consolidados, desde el mismo panel.",
		},
	],
};

export const LANDING_FEATURES: Record<LandingFeatureSlug, LandingFeature> = {
	"punto-de-venta": PUNTO_DE_VENTA,
	"menu-qr": MENU_QR,
	"pedidos-online": PEDIDOS_ONLINE,
	"delivery-propio": DELIVERY_PROPIO,
	inventario: INVENTARIO,
};

export const LANDING_FEATURE_SLUGS = Object.keys(LANDING_FEATURES) as LandingFeatureSlug[];

export function isLandingFeatureSlug(value: string): value is LandingFeatureSlug {
	return Object.hasOwn(LANDING_FEATURES, value);
}
