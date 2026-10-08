import { LANDING_BRAND_ALTERNATE, LANDING_COMPANY_NAME, LANDING_PRODUCT_NAME } from "@/lib/landing/brand";

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
};

export type LabsProcessStep = { num: string; title: string; text: string };

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
};

export type LabsTeamMember = { name: string; role: string; photoUrl?: string; linkedinUrl?: string };

export type LabsFaq = { question: string; answer: string };

export const LABS_HOME = {
	/** El nombre ya está en el logo; la línea dice qué somos y dónde. */
	eyebrow: "Estudio de desarrollo · Santiago",
	/** Qué hacemos y para quién, con palabras que un dueño de negocio usa. El inventario completo va en el intro y en Servicios. */
	title: "Sitios web y sistemas a medida para negocios que venden todos los días.",
	intro:
		`Somos ${LANDING_COMPANY_NAME}, un estudio de desarrollo en Santiago de Chile. Diseñamos y programamos lo que tu empresa necesita, lo dejamos a tu nombre y te acompañamos después del lanzamiento. También creamos ${LANDING_PRODUCT_NAME}, el menú digital y punto de venta que usan restaurantes en Chile y Venezuela.`,
	primaryCta: "Cotizar un proyecto",
	/** Reparte a la otra audiencia de la página: quien tiene un restaurante no cotiza, va al producto. */
	secondaryCta: `¿Tienes un restaurante? Conoce ${LANDING_PRODUCT_NAME}`,
	/** Tres respuestas a los miedos de quien cotiza: perder plata, quedar amarrado, no recibir respuesta. Van en una sola línea bajo el botón. */
	assurances: ["Propuesta cerrada por escrito", "Código y dominio a tu nombre", "Respuesta en dos días hábiles"],
	/** La prueba de que lo que construimos llega a producción: nuestro propio producto, en un teléfono. */
	heroFigure: {
		src: "/pedidos_caja_v2.png",
		alt: `Pantalla de pedidos de ${LANDING_PRODUCT_NAME} en un teléfono`,
		caption: `${LANDING_PRODUCT_NAME}, nuestro producto propio, en producción`,
	},
	/** Credenciales, no promesas: lo que el hero ya promete no se repite aquí. */
	facts: [
		{ label: "Producto propio en producción", detail: `Operamos ${LANDING_PRODUCT_NAME} con restaurantes de Chile y Venezuela.` },
		{ label: "Clientes en tres países", detail: "Chile, Venezuela y Estados Unidos, trabajando a distancia." },
		{ label: "Interlocutor directo", detail: "Hablas con quien diseña y programa, no con un vendedor." },
		{ label: "Avances cada semana", detail: "Ves el proyecto funcionando en un entorno de prueba desde la primera entrega." },
	],
	servicesEyebrow: "01 · Servicios",
	servicesTitle: "Qué construimos",
	servicesIntro:
		"Trabajamos con empresas que necesitan algo que un producto estándar no cubre: una web que convierta, un sistema que ordene la operación o una tienda que venda sin intermediarios.",
	processEyebrow: "02 · Cómo trabajamos",
	processTitle: "Un método sencillo, de principio a fin",
	productsEyebrow: "03 · Producto propio",
	productsTitle: "No solo construimos software. También lo operamos.",
	/** El origen del producto se cuenta una sola vez, en Equipo. Aquí va el argumento: operar en producción nos enseña a construir. */
	productsIntro:
		`${LANDING_PRODUCT_NAME} es nuestro producto: menú digital, pedidos online y punto de venta para restaurantes de Chile y Venezuela. Mantenerlo en producción todos los días, con pagos, dominios, soporte y datos aislados por negocio, es lo que nos enseña a construir sistemas que aguantan el uso real.`,
	/** Prueba social verificable: el directorio público de negocios que usan el producto. */
	productsProof: "Ver los restaurantes que lo usan",
	projectsEyebrow: "04 · Proyectos",
	projectsTitle: "Trabajo reciente",
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
} as const;

export const LABS_SERVICES: LabsService[] = [
	{
		id: "sitios-web",
		title: "Sitios web y landings",
		summary:
			"Páginas rápidas, medibles y pensadas para aparecer en Google: la web de la empresa, una landing de campaña o el sitio de un producto.",
		deliverables: ["Diseño y contenido", "SEO técnico y de contenido", "Analítica y formularios conectados", "Dominio, hosting y certificado"],
		fit: "Empresas que hoy dependen de redes sociales o de una web que no convierte.",
	},
	{
		id: "sistemas-a-medida",
		title: "Sistemas a medida",
		summary:
			"Paneles internos, portales de clientes y flujos de trabajo hechos para cómo opera tu empresa, no al revés.",
		deliverables: ["Levantamiento del proceso", "Panel con roles y permisos", "Reportes y exportaciones", "Capacitación del equipo"],
		fit: "Operaciones que viven en planillas, WhatsApp y correos, y ya no escalan.",
	},
	{
		id: "tiendas-y-pedidos",
		title: "Tiendas y pedidos online",
		summary:
			"Catálogo, carrito, pagos y entrega en tu propio dominio, sin comisión por venta a plataformas de terceros.",
		deliverables: ["Catálogo con variantes", "Pagos locales e internacionales", "Zonas y costos de despacho", "Avisos por WhatsApp y correo"],
		fit: "Negocios que venden por marketplaces y quieren un canal propio.",
	},
	{
		id: "integraciones",
		title: "Integraciones y automatización",
		summary:
			"Conectamos lo que ya usas: pasarelas de pago, correo, Telegram y WhatsApp, hojas de cálculo y APIs de terceros.",
		deliverables: ["Integración de pagos y suscripciones", "Avisos automáticos al equipo", "Sincronización de datos", "Documentación de cada conexión"],
		fit: "Equipos que pierden horas copiando datos de un sistema a otro.",
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
		href: "/pos",
		linkLabel: "Ver el producto",
		scope: ["Plataforma multiempresa con datos aislados", "Pagos en Chile y Venezuela, incluida tasa BCV", "Dominio propio por negocio", "Alta en línea con pago y verificación"],
		ownProduct: true,
	},
	{
		name: "Auto Care Planet",
		kind: "Sitio web con reservas · Estados Unidos",
		summary:
			"Detailing y protección anticorrosión en Stoughton, Wisconsin. Un sitio que presenta los paquetes con precio y permite reservar día y hora pagando en línea, completo o con depósito.",
		href: "https://autocareplanet.com",
		linkLabel: "Ver el sitio en vivo",
		scope: ["Catálogo de servicios con precios", "Reserva con calendario y pago o depósito en línea", "Términos de reserva y cancelación", "Galería de trabajos y preguntas frecuentes"],
	},
];

/**
 * Solo personas reales. Si la lista queda vacía, la sección de equipo no se dibuja.
 */
export const LABS_TEAM: LabsTeamMember[] = [
	{
		name: "Jesús Rodríguez Morales",
		role: "Fundador y desarrollador",
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
			"Sí. El estudio está en Santiago de Chile y trabajamos a distancia con empresas de todo Chile y de Venezuela. Las reuniones son por videollamada y los avances se ven en un entorno de prueba en línea.",
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
			"Casi siempre. Integramos pasarelas de pago, correo, WhatsApp y Telegram, hojas de cálculo y APIs de terceros. Si una herramienta no tiene forma de conectarse, te lo decimos antes de cotizar, no después.",
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
