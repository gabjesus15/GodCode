import { NextResponse } from "next/server";

/** Manifest PWA para instalar el panel super-admin (escritorio y móvil). */
export async function GET() {
	// Rutas relativas: el navegador las resuelve contra la URL del manifest. Con req.url,
	// detrás del proxy de Coolify el origen salía como http://0.0.0.0:3000 y el icono fallaba.
	const png192 = "/saas-admin/icon-192.png";
	const png512 = "/saas-admin/icon-512.png";

	const manifest = {
		id: "/dashboard",
		name: "Gcode Admin",
		short_name: "Gcode Admin",
		description: "Panel de super administración de Gcode: empresas, planes, métricas y soporte.",
		start_url: "/dashboard",
		scope: "/",
		lang: "es",
		dir: "ltr",
		display: "standalone",
		orientation: "any",
		background_color: "#0a0a0a",
		theme_color: "#111827",
		icons: [
			{
				src: png192,
				sizes: "192x192",
				type: "image/png",
				purpose: "any",
			},
			{
				src: png512,
				sizes: "512x512",
				type: "image/png",
				purpose: "any",
			},
			{
				src: png512,
				sizes: "512x512",
				type: "image/png",
				purpose: "maskable",
			},
		],
	};

	return NextResponse.json(manifest, {
		headers: {
			"Cache-Control": "public, max-age=300",
			"Content-Type": "application/manifest+json; charset=utf-8",
		},
	});
}
