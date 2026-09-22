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
			"Sí. No necesitás programar ni saber de servidores. Te registrás, subís tus productos y tu tienda está lista. Si tenés dudas, nuestro soporte te guía.",
	},
	{
		question: "¿Cuánto cuesta realmente?",
		answer:
			"Los precios están en la sección de planes. No hay costos ocultos, comisiones por venta ni cargos sorpresa. En tu primer pago: 2 meses al precio de 1.",
	},
	{
		question: "¿Puedo cancelar cuando quiera?",
		answer: "Sí. Sin penalidad, sin permanencia mínima. Si no te sirve, cancelás y listo.",
	},
	{
		question: "¿Mis datos están seguros?",
		answer:
			"Usamos encriptación SSL, servidores protegidos y cada negocio tiene sus datos completamente aislados. Nadie más puede ver tu información.",
	},
	{
		question: "¿Cuánto tardo en tener mi tienda lista?",
		answer:
			"Si ya tenés tus productos y fotos, menos de 1 hora. El proceso de registro toma 5 minutos.",
	},
	{
		question: "¿Puedo tener más de una sucursal?",
		answer:
			"Sí. Dependiendo del plan, podés administrar varias sucursales desde un mismo panel centralizado, con inventario y reportes independientes o consolidados.",
	},
];
