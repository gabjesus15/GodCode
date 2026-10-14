import { LANDING_COMPANY_NAME, LANDING_PRODUCT_NAME } from "@/lib/landing/brand";

import { LABS_PROJECTS, LABS_SERVICES, type LabsProject, type LabsService } from "./content";

/**
 * Páginas del estudio debajo de /labs: una por servicio, una por proyecto y la guía de
 * costos. La home compite por «desarrollo web Chile» todo junto; cada página compite por
 * su búsqueda («software a medida Chile», «integrar Mercado Pago»…) y es la prueba de lo
 * que el estudio hace.
 *
 * Reglas, las mismas de `content.ts`: solo hechos, sin cifras de clientes ni precios (el
 * estudio cotiza por proyecto), y cada página con su propio texto. Viven en /labs/* para
 * mudarse juntas con un 301 cuando Labs pase a la raíz.
 */

export const LABS_PATH = "/labs";
export const LABS_SERVICES_PATH = `${LABS_PATH}/servicios`;
export const LABS_PROJECTS_PATH = `${LABS_PATH}/proyectos`;
export const LABS_COST_GUIDE_PATH = `${LABS_PATH}/cuanto-cuesta-un-sitio-web`;

type Item = { title: string; text: string };
type Faq = { question: string; answer: string };

export type LabsServicePage = {
	/** El `id` del servicio en `LABS_SERVICES`. */
	id: LabsService["id"];
	metaTitle: string;
	metaDescription: string;
	keywords: string[];
	h1: string;
	intro: string;
	/** «Señales de que lo necesitas». */
	signals: Item[];
	faq: Faq[];
	/** Proyecto que lo muestra hecho (slug de `LABS_PROJECT_PAGES`). */
	projectSlug?: string;
};

export const LABS_SERVICE_PAGES: LabsServicePage[] = [
	{
		id: "sitios-web",
		metaTitle: "Desarrollo de sitios web en Santiago de Chile",
		metaDescription:
			"Sitios web y landings rápidos, medibles y pensados para Google, con formularios, reservas o pagos conectados. Estudio en Santiago; propuesta cerrada por escrito.",
		keywords: ["desarrollo web Santiago", "diseño de páginas web Chile", "landing page empresa", "sitio web con reservas", "agencia de desarrollo web Chile"],
		h1: "Sitios web que traen clientes, no solo visitas",
		intro:
			"Diseñamos y programamos la web de tu empresa, una landing de campaña o el sitio de un producto. Rápida en el teléfono, preparada para aparecer en Google y conectada a lo que hace que un visitante se vuelva cliente: un formulario, una reserva o un pago.",
		signals: [
			{ title: "Dependes solo de redes sociales", text: "Si Instagram cambia el alcance o te bloquea la cuenta, te quedas sin vitrina. Un sitio propio es tuyo y aparece cuando alguien te busca en Google." },
			{ title: "Tu web no convierte", text: "Recibe visitas pero nadie escribe ni compra: casi siempre es una página lenta, un mensaje confuso o un botón que no lleva a ninguna parte." },
			{ title: "Coordinas todo a mano", text: "Si cada consulta termina en un ida y vuelta por WhatsApp para dar precios o fechas, la web puede responder eso sola." },
			{ title: "No sabes qué funciona", text: "Sin analítica no sabes de dónde llegan los clientes ni qué página los convence. La medición va incluida desde el primer día." },
		],
		faq: [
			{ question: "¿El sitio queda a mi nombre?", answer: "Sí. El dominio, el hosting y el código quedan a nombre de tu empresa desde el lanzamiento." },
			{ question: "¿Puedo editar los textos yo mismo?", answer: "Depende del proyecto: lo definimos en la propuesta. Si necesitas cambiar contenido seguido, se incluye un panel para hacerlo sin programar." },
			{ question: "¿Incluye posicionamiento en Google?", answer: "Incluye el SEO técnico y de contenido de base: velocidad, títulos, datos estructurados, sitemap y textos pensados para las búsquedas de tus clientes. Las campañas pagadas no." },
		],
		projectSlug: "auto-care-planet",
	},
	{
		id: "sistemas-a-medida",
		metaTitle: "Software a medida para empresas en Chile",
		metaDescription:
			"Paneles internos, portales de clientes y flujos de trabajo hechos para cómo opera tu empresa, con roles, reportes y capacitación. Desde Santiago, para todo Chile.",
		keywords: ["software a medida Chile", "sistema a medida para empresas", "desarrollo de sistemas Santiago", "reemplazar Excel por un sistema", "portal de clientes a medida"],
		h1: "Software a medida para la forma en que trabaja tu empresa",
		intro:
			"Cuando la operación vive en planillas, correos y chats, un sistema propio ordena el trabajo: cada persona ve lo que le toca, los datos están en un solo lugar y los reportes salen solos. Lo construimos sobre tu proceso, no al revés.",
		signals: [
			{ title: "La planilla ya no da más", text: "Varias personas editan el mismo Excel, aparecen versiones distintas y nadie sabe cuál es la buena." },
			{ title: "La información está repartida", text: "Una parte en el correo, otra en WhatsApp y otra en la cabeza de alguien. Cuando esa persona falta, el trabajo se detiene." },
			{ title: "Un software estándar no calza", text: "Probaste programas genéricos y obligan a cambiar cómo trabajas, o te cobran por funciones que no usas." },
			{ title: "Necesitas reportes sin armarlos", text: "Cada fin de mes alguien junta datos a mano para saber cómo va el negocio." },
		],
		faq: [
			{ question: "¿Cuánto tarda un sistema a medida?", answer: "Meses, según los módulos. Se construye por entregas: ves partes funcionando cada semana y la fecha final va en la propuesta." },
			{ question: "¿Qué pasa con mis datos actuales?", answer: "Lo vemos en la primera conversación y queda escrito en la propuesta: qué datos pasan al sistema nuevo, desde dónde y cómo." },
			{ question: "¿Y si después quiero cambiar algo?", answer: "Se puede. El código es tuyo y puedes seguir con nosotros en mantenimiento mensual o con otro equipo." },
		],
		projectSlug: "midinerito",
	},
	{
		id: "tiendas-y-pedidos",
		metaTitle: "Tiendas online a medida con pagos locales",
		metaDescription:
			"Catálogo, carrito, pagos y despacho en tu propio dominio, sin comisión por venta a marketplaces. Mercado Pago, PayPal, transferencias y avisos por WhatsApp.",
		keywords: ["tienda online a medida", "ecommerce a medida Chile", "tienda online con Mercado Pago", "vender sin marketplace", "pedidos online propios"],
		h1: "Tu propia tienda online, sin pagarle comisión a un marketplace",
		intro:
			"Catálogo con variantes, carrito, pagos y despacho en tu dominio. Los clientes compran directo y la venta completa es tuya. Es lo mismo que construimos para nuestro producto de restaurantes, adaptado a lo que vendes.",
		signals: [
			{ title: "Vendes por marketplaces", text: "Cada venta deja un porcentaje en la plataforma y el cliente queda en su lista, no en la tuya." },
			{ title: "Los pedidos llegan desordenados", text: "Capturas, audios y transferencias que hay que cruzar a mano. Una tienda propia trae el pedido completo y el comprobante." },
			{ title: "Necesitas cobrar como cobra tu país", text: "Mercado Pago, transferencias, pago móvil o Zelle: medios que las plataformas genéricas no siempre traen." },
			{ title: "Despachas por zonas", text: "El costo de envío cambia según el sector y hoy lo calculas tú en cada pedido." },
		],
		faq: [
			{ question: "¿Qué medios de pago se pueden integrar?", answer: "Los que usamos en producción: PayPal, Mercado Pago, Stripe, transferencias, Zelle y pago móvil. Si necesitas otro, lo revisamos antes de cotizar." },
			{ question: "¿Puedo seguir vendiendo en marketplaces?", answer: "Sí. Muchos negocios mantienen el marketplace para clientes nuevos y llevan a los que repiten a su tienda propia." },
			{ question: `¿Es lo mismo que ${LANDING_PRODUCT_NAME}?`, answer: `${LANDING_PRODUCT_NAME} es nuestra tienda lista para restaurantes, por suscripción. Una tienda a medida es para negocios que necesitan algo distinto.` },
		],
	},
	{
		id: "integraciones",
		metaTitle: "Integración de pagos y automatizaciones",
		metaDescription:
			"Conectamos Stripe, PayPal y Mercado Pago, correo, Telegram, WhatsApp, planillas y APIs, para que los datos pasen solos de un sistema a otro. Cada conexión documentada.",
		keywords: ["integración de pagos", "integrar Mercado Pago", "integración Stripe", "automatización de procesos", "avisos automáticos por Telegram"],
		h1: "Integraciones que te ahorran copiar datos de un sistema a otro",
		intro:
			"Conectamos lo que ya usas: la pasarela de pago con tu sistema, los formularios con el correo, los pedidos con un aviso al equipo. Cada conexión queda documentada para que nadie dependa de un secreto.",
		signals: [
			{ title: "Copias datos a mano", text: "Alguien pasa cada venta, reserva o formulario de un sistema a otro, y a veces se equivoca." },
			{ title: "Te enteras tarde", text: "Un pedido o un pago entra y el equipo lo ve horas después porque nadie revisó el panel." },
			{ title: "Cobras y luego confirmas", text: "El pago llega por un lado y la confirmación al cliente sale por otro, a mano." },
			{ title: "Tus herramientas no se hablan", text: "Tienes buenas herramientas por separado, pero ninguna sabe lo que pasa en la otra." },
		],
		faq: [
			{ question: "¿Qué pasa si una herramienta no tiene API?", answer: "Te lo decimos antes de cotizar. A veces hay otra vía (correo, exportaciones, webhooks) y a veces no conviene." },
			{ question: "¿Quién mantiene las conexiones?", answer: "Quedan documentadas y a tu nombre. Si una API cambia, el mantenimiento mensual lo cubre; si no lo contratas, la documentación sirve a cualquier equipo." },
			{ question: "¿Pueden avisar al equipo por Telegram o WhatsApp?", answer: "Sí. Los avisos automáticos al equipo son de lo que más hacemos: pedidos, pagos, reservas o formularios nuevos." },
		],
		projectSlug: "colorin",
	},
	{
		id: "mantenimiento",
		metaTitle: "Mantenimiento de sitios web y sistemas",
		metaDescription:
			"Monitoreo, respaldos, actualizaciones de seguridad y mejoras mensuales para el sitio o sistema que tu empresa ya tiene, con soporte directo por WhatsApp y correo.",
		keywords: ["mantenimiento web", "mantenimiento de sistemas", "soporte web empresas Chile", "actualizaciones de seguridad sitio web", "mejoras a un sistema existente"],
		h1: "Mantenimiento para el sistema que nadie está cuidando",
		intro:
			"Un sitio o un sistema en producción necesita cuidado: dependencias que se actualizan, respaldos que hay que probar y mejoras que el uso va pidiendo. Lo tomamos aunque no lo hayamos construido nosotros.",
		signals: [
			{ title: "Quien lo hizo ya no está", text: "El desarrollador original se fue y nadie se atreve a tocar el código." },
			{ title: "No sabes si hay respaldos", text: "Si mañana se cae el servidor, no tienes claro qué se pierde." },
			{ title: "Las mejoras se acumulan", text: "Hay una lista de cambios pendientes que nunca encuentra tiempo." },
			{ title: "Te preocupa la seguridad", text: "El sistema usa versiones antiguas y no sabes qué riesgos tiene." },
		],
		faq: [
			{ question: "¿Mantienen sistemas que no hicieron ustedes?", answer: "Sí. Primero revisamos el código y te decimos con franqueza en qué estado está y qué conviene hacer." },
			{ question: "¿Cómo se acuerdan las mejoras?", answer: "Cada mes definimos juntos qué mejoras entran, y las ves funcionando en un entorno de prueba antes de publicarlas." },
			{ question: "¿Tengo que contratarlo?", answer: "No. Después del primer mes de ajustes incluido, puedes contratar mantenimiento mensual o quedarte con el código y gestionarlo tú." },
		],
	},
];

export type LabsProjectPage = {
	slug: string;
	/** El `name` del proyecto en `LABS_PROJECTS`. */
	name: string;
	metaTitle: string;
	metaDescription: string;
	challenge: string;
	solution: string;
	/** Lo que cambió, sin cifras que no se puedan comprobar. */
	result: string;
	/** Servicios del estudio que muestra (ids de `LABS_SERVICES`). */
	services: LabsService["id"][];
};

export const LABS_PROJECT_PAGES: LabsProjectPage[] = [
	{
		slug: "auto-care-planet",
		name: "Auto Care Planet",
		metaTitle: "Auto Care Planet: sitio web con reservas y pagos",
		metaDescription:
			"Caso de Auto Care Planet, detailing en Wisconsin: un sitio con paquetes y precios donde el cliente reserva día y hora y paga en línea, completo o con depósito.",
		challenge:
			"Auto Care Planet hace detailing y protección anticorrosión en Stoughton, Wisconsin. Las citas se coordinaban a mano y cada cotización se enviaba por correo, uno por uno: tiempo que se iba en coordinar en vez de trabajar en los autos.",
		solution:
			"Un sitio que presenta cada paquete con su precio y deja reservar en el mismo lugar: el cliente elige el servicio, el día y la hora, y paga en línea con Stripe, el total o un depósito. Los términos de reserva y cancelación quedan claros antes de pagar.",
		result:
			"Agendar y cotizar dejó de ser trabajo manual. El cliente ve el precio y reserva solo, y el negocio ahorra el tiempo que antes se le iba en coordinar fechas y en enviar cotizaciones por correo.",
		services: ["sitios-web", "integraciones"],
	},
	{
		slug: "midinerito",
		name: "MiDinerito",
		metaTitle: "MiDinerito: app de finanzas en dólares y bolívares",
		metaDescription:
			"Caso de MiDinerito, app propia del estudio: ingresos, gastos, ahorro y cobros en dólares con su equivalente en bolívares a la tasa BCV y a la referencia de Binance.",
		challenge:
			"Llevar las cuentas en Venezuela obliga a pensar en dos monedas y dos tasas a la vez. Las apps de finanzas comunes no entienden el dólar con su equivalente en bolívares, ni los cobros que hay que perseguir cada mes.",
		solution:
			"Una app web instalable que guarda todo en dólares y muestra el equivalente en bolívares con la tasa BCV y la referencia de Binance P2P, actualizadas a diario. Lleva cuentas, metas de ahorro, cuotas, gastos compartidos y cobros recurrentes con la pregunta «¿ya te pagó?».",
		result:
			"Está en producción en midinerito.app, funciona sin conexión y avisa con notificaciones. La diseñamos, la programamos y la mantenemos nosotros.",
		services: ["sistemas-a-medida", "integraciones"],
	},
	{
		slug: "colorin",
		name: "Colorín",
		metaTitle: "Colorín: app para colorear en la web y Android",
		metaDescription:
			"Caso de Colorín, app propia del estudio para dibujar y colorear en español, en la web y en Android, con un club de pago único verificado en el servidor.",
		challenge:
			"Una app infantil tenía que ser segura para los niños, funcionar igual en la web y en Android y cobrar sin suscripciones: un pago único que valiera en las dos plataformas.",
		solution:
			"Una app para dibujar y colorear con bote de pintura por zonas, 42 plantillas, pegatinas, retos diarios y logros. El Club se paga una vez con PayPal en la web y con Google Play en Android, y cada compra se verifica en el servidor. Tiene zona de padres y control parental para compartir.",
		result:
			"Está disponible en colorin.games y en Android. La diseñamos, la programamos y la mantenemos nosotros.",
		services: ["sitios-web", "integraciones"],
	},
];

export function labsServicePath(id: string): string {
	return `${LABS_SERVICES_PATH}/${id}`;
}

export function labsProjectPath(slug: string): string {
	return `${LABS_PROJECTS_PATH}/${slug}`;
}

export function findLabsService(id: string): LabsService | undefined {
	return LABS_SERVICES.find((service) => service.id === id);
}

export function findLabsProject(name: string): LabsProject | undefined {
	return LABS_PROJECTS.find((project) => project.name === name);
}

/** Página de proyecto para un proyecto de la home, si la tiene (Gcode POS tiene su landing). */
export function labsProjectPageFor(project: Pick<LabsProject, "name">): LabsProjectPage | undefined {
	return LABS_PROJECT_PAGES.find((page) => page.name === project.name);
}

/** La guía «¿Cuánto cuesta un sitio web o un sistema a medida?»: de qué depende, sin precios de lista. */
export const LABS_COST_GUIDE = {
	metaTitle: "¿Cuánto cuesta una página web o un sistema?",
	metaDescription:
		"De qué depende el precio de un sitio web o un sistema a medida, qué debe incluir una cotización seria, señales de alerta y cómo bajar el costo sin perder lo importante.",
	h1: "¿Cuánto cuesta una página web o un sistema a medida?",
	shortAnswer:
		"Depende del alcance, y por eso un estudio serio no puede darte un precio sin conocer el proyecto. Lo que sí podemos explicarte es de qué depende, para que compares cotizaciones con criterio. En " +
		`${LANDING_COMPANY_NAME} cotizamos cada proyecto con una propuesta cerrada: precio, entregas y fechas por escrito.`,
	factors: [
		{ title: "Cuántas pantallas y qué hacen", text: "No es lo mismo una landing de una página que un sitio con veinte, ni una página informativa que una con buscador, filtros o cuentas de usuario." },
		{ title: "Pagos, reservas y cuentas", text: "Cobrar en línea, reservar horas o tener usuarios con contraseña suma trabajo y responsabilidad: hay que probar cada caso y cuidar los datos." },
		{ title: "Integraciones con otros sistemas", text: "Conectar la pasarela de pago, el correo, la facturación o una API de terceros depende de cuán bien documentado esté cada servicio." },
		{ title: "Diseño a medida o sobre una base", text: "Un diseño desde cero para tu marca toma más que adaptar una estructura probada. Ambos pueden verse bien; cambia el tiempo." },
		{ title: "Quién pone el contenido", text: "Si los textos, las fotos y los precios están listos, el proyecto avanza más rápido que si hay que crearlos." },
		{ title: "Qué pasa después", text: "Un sistema necesita mantenimiento. Pregunta si está incluido, cuánto tiempo y qué cubre, para comparar cotizaciones parejas." },
	],
	include: [
		"El alcance por escrito: qué se construye y qué no",
		"Entregas con fecha, no solo una fecha final",
		"A nombre de quién quedan el código, el dominio y el hosting",
		"Qué incluye el soporte después del lanzamiento y por cuánto tiempo",
		"Qué pasa si quieres agregar algo a mitad de camino",
	],
	redFlags: [
		{ title: "Un precio sin preguntas", text: "Si te cotizan sin entender tu negocio, el alcance real aparece después, como cobro extra." },
		{ title: "Todo a nombre del proveedor", text: "Si el dominio o el hosting quedan a su nombre, cambiar de equipo se vuelve difícil." },
		{ title: "Nada que ver hasta el final", text: "Sin avances intermedios, los errores de rumbo se descubren cuando ya están construidos." },
		{ title: "Sin mantenimiento a la vista", text: "Un sistema sin nadie que lo actualice se vuelve inseguro con el tiempo." },
	],
	saveMoney: [
		{ title: "Empieza por una primera versión", text: "Lo que resuelve el problema principal primero; lo demás, en una segunda etapa con lo aprendido del uso real." },
		{ title: "Ten el contenido listo", text: "Textos, fotos y precios preparados ahorran semanas de ida y vuelta." },
		{ title: "Usa lo que ya existe", text: "Si una herramienta probada resuelve una parte, se integra en vez de construirla de cero." },
		{ title: "Decide rápido en las revisiones", text: "Las entregas semanales funcionan cuando hay alguien del negocio que puede aprobar o pedir cambios a tiempo." },
	],
	faq: [
		{
			question: "¿Por qué no publican precios?",
			answer: "Porque dos proyectos con el mismo nombre pueden ser muy distintos. Preferimos una propuesta cerrada después de entender el tuyo a un precio de lista que después cambie.",
		},
		{
			question: "¿Puedo decirles mi presupuesto?",
			answer: "Sí, y ayuda. En el formulario de cotización puedes elegir un rango; si el presupuesto no alcanza para todo, proponemos una primera versión que sí lo haga.",
		},
		{
			question: "¿Cuánto tardan en responder?",
			answer: "Menos de dos días hábiles, con una primera lectura del proyecto. Si tiene sentido, agendamos una llamada de 30 minutos y después llega la propuesta por escrito.",
		},
	],
} as const;
