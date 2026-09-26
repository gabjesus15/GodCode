/**
 * Videos de la sección «Míralo funcionando». Los usa la landing (reproductor y capítulos)
 * y el JSON-LD (VideoObject), así el nombre, la descripción y la duración son los mismos
 * en la página y en lo que lee Google.
 *
 * Los nombres de archivo describen el contenido con palabras de búsqueda reales.
 * Los `start` de cada capítulo son segundos del video: si se regraba uno, hay que medirlos de nuevo.
 */

export type DemoChapter = { start: number; title: string; text: string };

export type LandingDemoVideo = {
	id: "cliente" | "caja";
	tab: string;
	badge: string;
	/** Título para Google (VideoObject.name) y nombre accesible del video. */
	name: string;
	description: string;
	src: string;
	poster: string;
	/** Duración real del archivo en segundos (VideoObject.duration). */
	durationSeconds: number;
	/** Segundo en que termina el último capítulo (antes del cierre con el logo). */
	end: number;
	uploadDate: string;
	chapters: readonly DemoChapter[];
};

export const LANDING_DEMO_VIDEOS: readonly LandingDemoVideo[] = [
	{
		id: "cliente",
		tab: "Así pide tu cliente",
		badge: "Rica Pizza · pedido de prueba",
		name: "Cómo pide un cliente en el menú digital de un restaurante con Gcode POS",
		description:
			"Un cliente entra al link del restaurante, elige en el menú digital con fotos, arma su pedido online, escoge retiro o delivery y cómo pagar, y lo confirma desde el celular. Sin apps ni comisiones.",
		src: "/landing/demo/menu-digital-pedido-online-restaurante-gcode-pos.mp4",
		poster: "/landing/demo/menu-digital-pedido-online-restaurante-gcode-pos.jpg",
		durationSeconds: 48,
		end: 45,
		uploadDate: "2026-09-26T00:00:00-03:00",
		chapters: [
			{ start: 3, title: "Abre tu link", text: "Desde la bio de Instagram, un QR en la mesa o WhatsApp." },
			{ start: 5.2, title: "Elige en la carta", text: "Fotos, precios y variantes. Agrega en un toque." },
			{ start: 19, title: "Revisa y elige cómo pagar", text: "Retiro o delivery, efectivo, tarjeta o transferencia." },
			{ start: 31, title: "Confirma y listo", text: "Sin descargar apps ni crear cuentas." },
		],
	},
	{
		id: "caja",
		tab: "Así lo recibes tú",
		badge: "Panel Gcode POS",
		name: "Sistema POS para restaurantes: abrir caja, crear pedidos y enviarlos a cocina con Gcode POS",
		description:
			"El panel de Gcode POS abre la caja del turno, crea un pedido en segundos, lo envía a cocina y muestra las ventas del día: punto de venta y pedidos online en un solo sistema.",
		src: "/landing/demo/sistema-pos-restaurante-caja-pedidos-gcode-pos.mp4",
		poster: "/landing/demo/sistema-pos-restaurante-caja-pedidos-gcode-pos.jpg",
		durationSeconds: 31,
		end: 28,
		uploadDate: "2026-09-22T19:51:57-03:00",
		chapters: [
			{ start: 3, title: "Abre tu caja", text: "Entras al panel y abres el turno con tu monto inicial." },
			{ start: 10.3, title: "Crea o recibe pedidos", text: "Los del menú online llegan solos; los de mostrador, en segundos." },
			{ start: 21, title: "Mándalo a cocina", text: "Cada pedido entra a tu caja con su detalle y su total." },
			{ start: 24.8, title: "Mira tus ventas", text: "Ventas, pedidos y ticket promedio del día." },
		],
	},
];

/** VideoObject para Google (resultados de video y pestaña Videos). */
export function buildDemoVideosJsonLd(base: string, organizationId: string): Record<string, unknown>[] {
	return LANDING_DEMO_VIDEOS.map((video) => ({
		"@context": "https://schema.org",
		"@type": "VideoObject",
		name: video.name,
		description: video.description,
		thumbnailUrl: [`${base}${video.poster}`],
		contentUrl: `${base}${video.src}`,
		uploadDate: video.uploadDate,
		duration: `PT${video.durationSeconds}S`,
		inLanguage: "es",
		isFamilyFriendly: true,
		publisher: { "@id": organizationId },
		// Sin `hasPart` (Clip): Google exige una URL que abra el video en cada segundo y la landing no la tiene.
	}));
}
