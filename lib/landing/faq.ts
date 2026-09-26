import {
	LANDING_BRAND_ALTERNATE,
	LANDING_COMPANY_NAME,
	LANDING_PRODUCT_NAME,
} from "./brand";

export type LandingFaqItem = {
	question: string;
	answer: string;
};

export const LANDING_FAQ: LandingFaqItem[] = [
	{
		// Primera a propósito: es la consulta informacional ("qué es gcode / godcode")
		// que hoy genera clics y ninguna página respondía.
		question: `¿Qué es ${LANDING_PRODUCT_NAME} y quién está detrás?`,
		answer:
			`${LANDING_PRODUCT_NAME} es el menú digital, sistema de pedidos online y punto de venta para restaurantes creado por ${LANDING_COMPANY_NAME}, un estudio de desarrollo web con base en Santiago de Chile que también hace páginas y sistemas a medida. Antes se conocía como ${LANDING_BRAND_ALTERNATE}.`,
	},
	{
		question: "¿No sé nada de tecnología, puedo usarlo?",
		answer:
			"Sí. No necesitas programar ni saber de servidores. Te registras, subes tus productos y tu tienda queda lista. Si tienes dudas, nuestro equipo te acompaña por WhatsApp o correo.",
	},
	{
		question: "¿Cuánto cuesta realmente?",
		answer:
			"Los precios están en la sección de planes. No hay costos ocultos, comisiones por venta ni cargos sorpresa. En tu primer pago: 2 meses al precio de 1.",
	},
	{
		question: "¿Puedo cancelar cuando quiera?",
		answer: "Sí. Sin penalidad y sin permanencia mínima. Si no te sirve, cancelas y listo.",
	},
	{
		question: "¿Mis datos están seguros?",
		answer:
			"Tu tienda y tu panel funcionan siempre con conexión cifrada (SSL), en servidores protegidos, y cada negocio tiene sus datos completamente aislados. Nadie más puede ver tus ventas ni tus clientes.",
	},
	{
		question: "¿Cuánto tardo en tener mi tienda lista?",
		answer:
			"Si ya tienes tus productos y fotos, menos de una hora. El registro toma unos 5 minutos.",
	},
	{
		question: "¿Puedo tener más de una sucursal?",
		answer:
			"Sí. Según el plan, puedes administrar varias sucursales desde un mismo panel centralizado, con inventario y reportes independientes o consolidados.",
	},
];
