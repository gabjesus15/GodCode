import { LANDING_BRAND_ALTERNATE, LANDING_COMPANY_NAME, LANDING_PRODUCT_NAME } from "@/lib/landing/brand";

/**
 * Ruta del landing de Gcode POS. Hoy vive en la raíz del dominio; cuando la home
 * corporativa pase a «/», el producto se mueve a «/pos» y basta con cambiar esto
 * (y `POS_ADDRESS`): lo usan la página /labs, sus enlaces y su JSON-LD (`owns.url`).
 */
export const POS_PATH = "/";
/** La dirección del landing del producto tal como se lee en la barra del navegador de la captura. */
const POS_ADDRESS = "godcode.me";

/**
 * Contenido de la home corporativa de Gcode Labs (el estudio).
 *
 * La raíz del dominio presenta a la empresa: qué construye, cómo trabaja y qué
 * productos propios tiene. Gcode POS es uno de esos productos y vive en su
 * propio landing. Reglas del texto:
 * - Solo hechos: nada de cifras de clientes, años ni premios que no existan.
 * - Las secciones que dependen de datos reales (equipo, proyectos de clientes)
 *   se dibujan solo cuando hay datos; vacías no salen, en vez de rellenarse.
 * - El tono es el de una empresa establecida: frases cortas, sin superlativos.
 */

export type LabsService = {
	/** Ancla y clave estable. */
	id: string;
	title: string;
	summary: string;
	/** Qué entrega concreta incluye. */
	deliverables: string[];
	/** Para quién suele ser. */
	fit: string;
	/** Captura real que ilustra el servicio (en /public): una pantalla de teléfono o una ventana de navegador. */
	image?: LabsScreen;
};

/** Una captura real de algo que construimos, con su marco: teléfono o navegador. */
export type LabsScreen = {
	src: string;
	alt: string;
	width: number;
	height: number;
	frame: "phone" | "laptop" | "browser";
	/** Texto corto bajo la captura (hero, producto). */
	label?: string;
	/** Dirección que muestra la barra del navegador. */
	address?: string;
};

/** Un proyecto en la vitrina del hero: su pantalla de escritorio y, si la hay, la de teléfono. */
export type LabsShowcaseItem = {
	/** Nombre del proyecto, en la pestaña. */
	name: string;
	/** Qué es, en tres o cuatro palabras, bajo el nombre. */
	caption: string;
	/** La pantalla de escritorio, en una ventana de navegador. */
	desktop: LabsScreen;
	/** La de teléfono: en escritorio se superpone a la ventana; en el teléfono es la única que se ve. */
	phone?: LabsScreen;
};

type LabsProcessStep = { num: string; title: string; text: string };

export type LabsProject = {
	name: string;
	kind: string;
	summary: string;
	href?: string;
	/** Texto del enlace cuando el proyecto se puede ver en vivo. */
	linkLabel?: string;
	/** Qué se construyó, en 3 o 4 piezas. */
	scope: string[];
	/** Marca el producto propio para dibujarlo distinto. */
	ownProduct?: boolean;
	/** Captura real del proyecto (en /public), en una ventana de navegador. Sin ella, la tarjeta dibuja una ventana de muestra con el dominio. */
	image?: LabsScreen;
	/** Captura de teléfono, superpuesta a la ventana en la esquina de la tarjeta. */
	phone?: LabsScreen;
};

type LabsTeamMember = { name: string; role: string; photoUrl?: string; linkedinUrl?: string };

type LabsFaq = { question: string; answer: string };

export const LABS_HOME = {
	/** El nombre ya está en el logo; la línea dice qué somos y dónde. */
	eyebrow: "Estudio de desarrollo · Santiago",
	/** Qué hacemos y para quién, con palabras que un dueño de negocio usa. El inventario completo va en el intro y en Servicios. */
	title: "Sitios web y sistemas a medida para negocios que venden todos los días.",
	/** El estudio y su amplitud, sin nombrar un producto: la persona tiene que sentir que construimos de todo. */
	intro:
		`Somos ${LANDING_COMPANY_NAME}, un estudio de desarrollo en Santiago de Chile. Diseñamos y programamos sitios, sistemas internos, tiendas y automatizaciones para empresas de Chile, Venezuela y Estados Unidos: lo dejamos a tu nombre y te acompañamos después del lanzamiento.`,
	primaryCta: "Cotizar un proyecto",
	secondaryCta: "Ver proyectos",
	/** Tres respuestas a los miedos de quien cotiza: perder plata, quedar amarrado, no recibir respuesta. Van en una sola línea bajo el botón. */
	assurances: ["Propuesta cerrada por escrito", "Código y dominio a tu nombre", "Respuesta en dos días hábiles"],
	/**
	 * La frase grande entre el hero y los hechos. Cada frase entre llaves es un tipo de trabajo:
	 * lleva su icono delante (por la primera palabra) y va en tinta; lo que las une, en gris
	 * (`components/labs/labs-home.tsx`). Sin adjetivos de venta: cada pieza es algo que ya está
	 * en producción (las reservas de Auto Care Planet, la caja de Gcode POS, el dominio propio de
	 * cada tienda, los avisos al equipo).
	 */
	statement:
		"Hacemos {sitios con reservas y pago en línea}, {sistemas de caja e inventario}, {tiendas con dominio propio} y {automatizaciones que avisan al equipo} por Telegram o por correo.",
	/**
	 * Hechos, no promesas: cada cifra se comprueba en esta misma página. Los productos son los
	 * de «Proyectos» y los países, los mismos del intro, de las preguntas frecuentes y de los
	 * metadatos (`lib/labs/metadata.ts`).
	 */
	facts: [
		{ value: "3", unit: "productos", label: "Software propio en producción", detail: `${LANDING_PRODUCT_NAME}, MiDinerito y Colorín: los diseñamos, los programamos y los mantenemos nosotros.` },
		{ value: "3", unit: "países", label: "Clientes en tres países", detail: "Chile, Venezuela y Estados Unidos, trabajando a distancia." },
		{ value: "1", unit: "interlocutor", label: "Interlocutor directo", detail: "Hablas con quien diseña y programa, no con un vendedor." },
		{ value: "7", unit: "días", label: "Avances cada semana", detail: "Ves el proyecto funcionando en un entorno de prueba desde la primera entrega." },
	],
	/** La banda de logos bajo el hero: solo marcas que están en el código o en un proyecto entregado. */
	logosTitle: "Construimos y cobramos con",
	servicesEyebrow: "01 · Servicios",
	servicesTitle: "Qué construimos",
	servicesIntro: "Trabajamos con empresas que necesitan algo que un producto estándar no cubre.",
	/** El producto propio, con su propia sección: quien llega de Instagram buscándolo lo encuentra sin salir de la home. */
	productEyebrow: "Producto propio",
	productTitle: `${LANDING_PRODUCT_NAME}: menú digital, pedidos y caja para restaurantes`,
	productText:
		`Lo construimos y lo operamos nosotros. Cada restaurante recibe su menú con QR y pedidos online bajo su propia marca, una caja para tomar pedidos en el local y un panel con ventas e inventario, por una suscripción mensual sin comisión por venta.`,
	productPoints: ["Pedidos online y en el local, en una sola caja", "Cobros con PayPal, Mercado Pago, Zelle y pago móvil", "Restaurantes en Chile y Venezuela operando hoy"],
	productCta: `Ver ${LANDING_PRODUCT_NAME}`,
	productNote: "Si llegaste desde Instagram buscando el menú digital, es aquí.",
	processEyebrow: "02 · Cómo trabajamos",
	processTitle: "Un método sencillo, de principio a fin",
	/** El título del método se dibuja con una palabra que rueda: «Un método [sencillo] de principio a fin». */
	processTitleLead: "Un método",
	processWords: ["sencillo", "por escrito", "por entregas", "sin sorpresas"],
	processTitleTail: "de principio a fin",
	stackEyebrow: "03 · Con qué construimos",
	stackTitle: "Herramientas probadas, conectadas con lo que ya usas",
	/** Solo lo que de verdad usamos y mantenemos en producción; es el inventario de `LABS_STACK`. */
	stackIntro:
		"No reinventamos la base de cada proyecto. Trabajamos con tecnología que mantenemos en producción todos los días y la conectamos con los sistemas que tu empresa ya tiene.",
	projectsEyebrow: "04 · Proyectos",
	projectsTitle: "Trabajo reciente",
	/** Solo lo que está en producción: sin cifras ni promesas. */
	projectsIntro: "Lo que está en producción hoy: nuestro producto, dos apps propias y un sitio con reservas para un cliente en Estados Unidos.",
	teamEyebrow: "05 · Equipo",
	teamTitle: "Quiénes somos",
	teamIntro:
		"Somos un equipo pequeño a propósito. Hablas directamente con quien diseña y programa tu proyecto, y la persona que te responde es la que escribe el código.",
	/** Por qué existe el estudio: solo hechos conocidos. */
	founderNote:
		`${LANDING_COMPANY_NAME} nació en Santiago de Chile haciendo sitios y sistemas para negocios que venden todos los días. De ese trabajo salió ${LANDING_PRODUCT_NAME}: vimos restaurantes perdiendo margen en las apps de delivery y construimos el canal de venta propio que necesitaban. Hoy operamos ese producto y seguimos construyendo a medida.`,
	faqEyebrow: "Preguntas frecuentes",
	faqTitle: "Antes de cotizar",
	quoteEyebrow: "Cotizar",
	quoteTitle: "Cuéntanos qué necesitas",
	quoteText:
		"Te respondemos en menos de dos días hábiles con una primera lectura del proyecto. Si tiene sentido, agendamos una llamada de 30 minutos y después llega la propuesta por escrito.",
	footerNote: `${LANDING_COMPANY_NAME} (antes ${LANDING_BRAND_ALTERNATE}) · Santiago de Chile`,
	/** La palabra gigante del pie, cortada por el borde del panel. */
	footerWordmark: LANDING_COMPANY_NAME,
	footerLead: "Cuéntanos qué necesitas: respondemos en menos de dos días hábiles con una primera lectura del proyecto.",
} as const;

export const LABS_SERVICES: LabsService[] = [
	{
		id: "sitios-web",
		title: "Sitios web y landings",
		summary:
			"Páginas rápidas, medibles y pensadas para aparecer en Google: la web de la empresa, una landing de campaña o el sitio de un producto.",
		deliverables: ["Diseño y contenido", "SEO técnico y de contenido", "Analítica y formularios conectados", "Dominio, hosting y certificado"],
		fit: "Empresas que hoy dependen de redes sociales o de una web que no convierte.",
		image: { src: "/labs/capturas/autocareplanet-inicio.jpg", alt: "Portada de autocareplanet.com, diseñada y programada por el estudio", width: 1280, height: 800, frame: "laptop", address: "autocareplanet.com" },
	},
	{
		id: "sistemas-a-medida",
		title: "Sistemas a medida",
		summary:
			"Paneles internos, portales de clientes y flujos de trabajo hechos para cómo opera tu empresa, no al revés.",
		deliverables: ["Levantamiento del proceso", "Panel con roles y permisos", "Reportes y exportaciones", "Capacitación del equipo"],
		fit: "Operaciones que viven en planillas, WhatsApp y correos, y ya no escalan.",
		image: { src: "/labs/capturas/midinerito-cobros.jpg", alt: "Cobros y pagos del mes en MiDinerito, con la pregunta de si ya te pagaron", width: 600, height: 1386, frame: "phone" },
	},
	{
		id: "tiendas-y-pedidos",
		title: "Tiendas y pedidos online",
		summary:
			"Catálogo, carrito, pagos y entrega en tu propio dominio, sin comisión por venta a plataformas de terceros.",
		deliverables: ["Catálogo con variantes", "Pagos locales e internacionales", "Zonas y costos de despacho", "Avisos por WhatsApp y correo"],
		fit: "Negocios que venden por marketplaces y quieren un canal propio.",
		image: { src: "/labs/capturas/gcode-pos-menu-escritorio.jpg", alt: `Menú digital de Rica Pizza en ${LANDING_PRODUCT_NAME}, visto en un portátil`, width: 1280, height: 800, frame: "laptop" },
	},
	{
		id: "integraciones",
		title: "Integraciones y automatización",
		summary:
			"Conectamos lo que ya usas: Stripe, PayPal y Mercado Pago, correo, Telegram y WhatsApp, hojas de cálculo y APIs de terceros.",
		deliverables: ["Integración de pagos y suscripciones", "Avisos automáticos al equipo", "Sincronización de datos", "Documentación de cada conexión"],
		fit: "Equipos que pierden horas copiando datos de un sistema a otro.",
		image: { src: "/labs/capturas/gcode-pos-metodos-de-pago.jpg", alt: `Métodos de pago de un pedido en ${LANDING_PRODUCT_NAME}: efectivo, tarjeta, Pago Móvil y Zelle`, width: 600, height: 1103, frame: "phone" },
	},
	{
		id: "mantenimiento",
		title: "Mantenimiento y evolución",
		summary:
			"Después del lanzamiento el software sigue vivo: monitoreo, actualizaciones de seguridad, mejoras por iteración y soporte directo.",
		deliverables: ["Monitoreo y respaldos", "Actualizaciones de dependencias", "Mejoras mensuales acordadas", "Soporte por WhatsApp y correo"],
		fit: "Empresas con un sistema en producción que nadie mantiene.",
	},
];

/** La vitrina del hero: cuatro proyectos reales, uno a la vez. Primero el producto propio; luego los tres de la cuadrícula de proyectos. */
export const LABS_SHOWCASE: LabsShowcaseItem[] = [
	{
		name: LANDING_PRODUCT_NAME,
		caption: "Menú digital con pedidos · Rica Pizza",
		desktop: { src: "/labs/capturas/gcode-pos-menu-escritorio.jpg", alt: "Menú digital de Rica Pizza en Gcode POS, en el navegador: fotos de las pizzas, precios y una oferta", width: 1280, height: 800, frame: "browser", address: "Menú de Rica Pizza" },
		phone: { src: "/labs/capturas/gcode-pos-menu-portada.jpg", alt: "El menú de Rica Pizza en el teléfono: logo, portada de la marca y las primeras pizzas con una oferta", width: 600, height: 1386, frame: "phone" },
	},
	{
		name: "Auto Care Planet",
		caption: "Sitio web con reservas y pago",
		desktop: { src: "/labs/capturas/autocareplanet-inicio.jpg", alt: "Portada de autocareplanet.com con el buscador de citas", width: 1280, height: 800, frame: "browser", address: "autocareplanet.com" },
	},
	{
		name: "MiDinerito",
		caption: "App de finanzas personales",
		desktop: { src: "/labs/capturas/midinerito-escritorio.jpg", alt: "Inicio de MiDinerito en el navegador: saldo total, cobros por confirmar y metas de ahorro", width: 1280, height: 800, frame: "browser", address: "midinerito.app" },
		phone: { src: "/labs/capturas/midinerito-inicio.jpg", alt: "Inicio de MiDinerito en el teléfono: saldo en dólares con su equivalente en bolívares", width: 600, height: 1386, frame: "phone" },
	},
	{
		name: "Colorín",
		caption: "App para dibujar y colorear",
		desktop: { src: "/labs/capturas/colorin-escritorio.jpg", alt: "Colorín en el navegador: lienzo para colorear con la paleta y las herramientas", width: 1280, height: 800, frame: "browser", address: "colorin.games" },
		phone: { src: "/labs/capturas/colorin-app.jpg", alt: "Colorín en el teléfono, con un dinosaurio a medio colorear", width: 600, height: 1386, frame: "phone" },
	},
];

/** Las dos pantallas de la sección del producto propio. */
export const LABS_PRODUCT_SCREENS: LabsScreen[] = [
	{ src: "/labs/capturas/gcode-pos-menu.jpg", alt: "Menú digital de Rica Pizza en Gcode POS: las pizzas con foto, precio y una oferta", width: 600, height: 1386, frame: "phone", label: "Menú con tu marca y QR" },
	{ src: "/labs/capturas/gcode-pos-pedido.jpg", alt: "Carrito de un pedido en el menú de Rica Pizza, con el total en dólares y en bolívares", width: 600, height: 1386, frame: "phone", label: "Pedido y pago" },
];

/** Con qué construimos: herramientas e integraciones que usamos de verdad, por grupo. Sin logos, solo nombres. */
export const LABS_STACK: Array<{ label: string; items: string[] }> = [
	{ label: "Web y aplicaciones", items: ["Next.js", "React", "TypeScript", "Expo"] },
	{ label: "Datos", items: ["Supabase", "PostgreSQL", "APIs REST"] },
	{ label: "Pagos", items: ["PayPal", "Stripe", "Mercado Pago", "Google Play", "Zelle", "Pago móvil", "Transferencias"] },
	{ label: "Avisos", items: ["WhatsApp", "Telegram", "Correo con Resend"] },
	{ label: "Infraestructura", items: ["Vercel", "Cloudinary", "Dominios propios", "Certificados SSL", "Respaldos"] },
	{ label: "Calidad", items: ["Pruebas automáticas", "Análisis de código", "Revisión de seguridad"] },
];

export const LABS_PROCESS: LabsProcessStep[] = [
	{
		num: "01",
		title: "Conversación",
		text: "Una llamada de 30 minutos para entender el negocio, el problema y qué significa que el proyecto salga bien.",
	},
	{
		num: "02",
		title: "Propuesta cerrada",
		text: "Alcance, entregas, fechas y precio por escrito. Si algo queda fuera, se dice antes de empezar, no al final.",
	},
	{
		num: "03",
		title: "Construcción por entregas",
		text: "Ves avances funcionando cada semana en un entorno de prueba, y ajustamos sobre lo real, no sobre un documento.",
	},
	{
		num: "04",
		title: "Lanzamiento y acompañamiento",
		text: "Publicamos en tu dominio, capacitamos a tu equipo y nos quedamos el primer mes para los ajustes que aparecen con el uso.",
	},
];

export const LABS_PROJECTS: LabsProject[] = [
	{
		name: LANDING_PRODUCT_NAME,
		kind: "Producto propio · SaaS para restaurantes",
		summary:
			"Menú digital con QR, pedidos online, punto de venta, delivery e inventario para restaurantes, con un panel por negocio y suscripción mensual sin comisión por venta.",
		href: POS_PATH,
		linkLabel: "Ver el producto",
		scope: ["Plataforma multiempresa con datos aislados", "Cobros con PayPal, Mercado Pago, Zelle y pago móvil, con tasa BCV", "Dominio propio por negocio", "Alta en línea con pago y verificación"],
		ownProduct: true,
		image: { src: "/labs/capturas/gcode-pos-landing.jpg", alt: "Página de Gcode POS: menú digital y POS para restaurantes", width: 1024, height: 589, frame: "browser", address: POS_ADDRESS },
		phone: { src: "/labs/capturas/gcode-pos-pedido.jpg", alt: "Carrito de un pedido en el menú de Rica Pizza, con el total en dólares y en bolívares", width: 600, height: 1386, frame: "phone" },
	},
	{
		name: "Auto Care Planet",
		kind: "Sitio web con reservas · Estados Unidos",
		summary:
			"Detailing y protección anticorrosión en Stoughton, Wisconsin. Un sitio que presenta los paquetes con precio y permite reservar día y hora pagando en línea con Stripe, completo o con depósito.",
		href: "https://autocareplanet.com",
		linkLabel: "Ver el sitio en vivo",
		scope: ["Catálogo de servicios con precios", "Reserva con calendario y cobro con Stripe, completo o con depósito", "Términos de reserva y cancelación", "Galería de trabajos y preguntas frecuentes"],
		image: { src: "/labs/capturas/autocareplanet-reservar.jpg", alt: "Reserva de una cita en autocareplanet.com: servicio, fecha y pago con tarjeta por Stripe", width: 1280, height: 800, frame: "browser", address: "autocareplanet.com" },
	},
	{
		name: "MiDinerito",
		kind: "App propia · Finanzas personales",
		summary:
			"App web instalable para llevar ingresos, gastos, ahorro y cobros mensuales en dólares, con su equivalente en bolívares a la tasa BCV y a la referencia de Binance P2P.",
		href: "https://midinerito.app",
		linkLabel: "Ver la app",
		scope: ["Tasas BCV y Binance actualizadas a diario", "Cobros y pagos recurrentes con la pregunta «¿ya te pagó?»", "Cuentas, metas de ahorro, cuotas y gastos compartidos", "Notificaciones push y uso sin conexión"],
		image: { src: "/labs/capturas/midinerito-escritorio.jpg", alt: "Inicio de MiDinerito en el navegador: saldo total, cobros por confirmar y metas de ahorro", width: 1280, height: 800, frame: "browser", address: "midinerito.app" },
		phone: { src: "/labs/capturas/midinerito-cobros.jpg", alt: "Cobros y pagos del mes en MiDinerito, en el teléfono", width: 600, height: 1386, frame: "phone" },
	},
	{
		name: "Colorín",
		kind: "App propia · Dibujo y coloreo para niños",
		summary:
			"App para dibujar y colorear en español, en la web y en Android: bote de pintura por zonas, pegatinas, retos diarios y logros, con un club de pago único y sin suscripción.",
		href: "https://www.colorin.games",
		linkLabel: "Ver la app",
		scope: ["42 plantillas con los contornos siempre por encima", "Estrellas, niveles, racha diaria y logros", "Pago único del Club con PayPal en la web y Google Play en Android, verificado en el servidor", "Zona de padres y compartir con control parental"],
		image: { src: "/labs/capturas/colorin-escritorio.jpg", alt: "Colorín en el navegador: lienzo para colorear con la paleta y las herramientas", width: 1280, height: 800, frame: "browser", address: "colorin.games" },
		phone: { src: "/labs/capturas/colorin-app.jpg", alt: "Colorín en el teléfono, con un dinosaurio a medio colorear", width: 600, height: 1386, frame: "phone" },
	},
];

/**
 * Solo personas reales. Si la lista queda vacía, la sección de equipo no se dibuja.
 */
export const LABS_TEAM: LabsTeamMember[] = [
	{
		name: "Jesús Rodríguez Morales",
		role: "Fundador y desarrollador",
		photoUrl: "/labs/equipo/jesus-rodriguez.jpg",
		linkedinUrl: "https://www.linkedin.com/in/jesus-rodriguez-morales/",
	},
];

export const LABS_FAQ: LabsFaq[] = [
	{
		question: "¿Cuánto cuesta un proyecto?",
		answer:
			"Depende del alcance, y por eso no publicamos precios de lista. Después de la primera conversación recibes una propuesta cerrada con precio, entregas y fechas. Si el presupuesto no alcanza para todo, proponemos una primera versión que sí lo haga.",
	},
	{
		question: "¿Cuánto tarda?",
		answer:
			"Una web corporativa o una landing suele estar en semanas; un sistema a medida, en meses, según los módulos. La fecha va en la propuesta y se construye por entregas, así que ves resultados antes del final.",
	},
	{
		question: "¿De quién es el código?",
		answer:
			"Tuyo. El código, el dominio, las cuentas de hosting y los datos quedan a nombre de tu empresa. Si mañana quieres seguir con otro equipo, puedes.",
	},
	{
		question: "¿Trabajan fuera de Santiago?",
		answer:
			"Sí. El estudio está en Santiago de Chile y trabajamos a distancia con empresas de todo Chile, de Venezuela y de Estados Unidos. Las reuniones son por videollamada y los avances se ven en un entorno de prueba en línea.",
	},
	{
		question: `¿Qué relación tiene ${LANDING_PRODUCT_NAME} con el estudio?`,
		answer:
			`${LANDING_PRODUCT_NAME} es un producto creado y operado por ${LANDING_COMPANY_NAME}. Si tienes un restaurante, probablemente te sirve tal cual; si tu negocio necesita algo distinto, lo construimos a medida.`,
	},
	{
		question: "¿Ya tengo una web o un sistema? ¿Pueden mejorarlo?",
		answer:
			"Sí. Revisamos lo que tienes, te decimos con franqueza qué conviene conservar y qué conviene rehacer, y trabajamos sobre eso. No hace falta empezar de cero para tener algo que funcione.",
	},
	{
		question: "¿Se conecta con lo que ya uso?",
		answer:
			"Casi siempre. Integramos pasarelas de pago (Stripe, PayPal, Mercado Pago), correo, WhatsApp y Telegram, hojas de cálculo y APIs de terceros. Si una herramienta no tiene forma de conectarse, te lo decimos antes de cotizar, no después.",
	},
	{
		question: "¿Qué pasa después del lanzamiento?",
		answer:
			"El primer mes de ajustes está incluido. Después puedes contratar mantenimiento mensual (monitoreo, actualizaciones y mejoras) o quedarte con el código y gestionarlo tú.",
	},
];

/** Saludo con el que se abre el chat de WhatsApp desde la home del estudio. */
export const LABS_WHATSAPP_GREETING = `Hola, vi ${LANDING_COMPANY_NAME} en la web y quiero cotizar un proyecto.`;

export const LABS_QUOTE_PROJECT_TYPES = [
	{ value: "sitio-web", label: "Sitio web o landing" },
	{ value: "sistema", label: "Sistema a medida" },
	{ value: "tienda", label: "Tienda o pedidos online" },
	{ value: "integracion", label: "Integración o automatización" },
	{ value: "mantenimiento", label: "Mantenimiento de un sistema existente" },
	{ value: "otro", label: "Otro" },
] as const;

export const LABS_QUOTE_BUDGETS = [
	{ value: "", label: "Prefiero no decirlo aún" },
	{ value: "menos-1000", label: "Menos de US$ 1.000" },
	{ value: "1000-3000", label: "US$ 1.000 a 3.000" },
	{ value: "3000-8000", label: "US$ 3.000 a 8.000" },
	{ value: "mas-8000", label: "Más de US$ 8.000" },
] as const;

export type LabsQuoteProjectType = (typeof LABS_QUOTE_PROJECT_TYPES)[number]["value"];
export type LabsQuoteBudget = (typeof LABS_QUOTE_BUDGETS)[number]["value"];
