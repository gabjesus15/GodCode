import { ImageResponse } from "next/og";

import { LABS_HOME } from "@/lib/labs/content";
import { LANDING_COMPANY_NAME, LANDING_PRODUCT_NAME } from "@/lib/landing/brand";

export const runtime = "edge";

/**
 * Tarjeta para compartir (WhatsApp, LinkedIn, Facebook). Por defecto, la de Gcode POS;
 * con `?v=labs`, la del estudio (`lib/labs/metadata.ts`), para que un enlace a la home
 * de Gcode Labs no se vea como el anuncio del producto.
 */
const CARDS = {
	pos: {
		title: LANDING_PRODUCT_NAME,
		lead: "Arma tu tienda online gratis. Pagas cuando la publiques.",
		detail: `Menú digital · Carrito · Delivery · Caja · Inventario · por ${LANDING_COMPANY_NAME}`,
	},
	labs: {
		title: LANDING_COMPANY_NAME,
		lead: LABS_HOME.title,
		detail: "Estudio de desarrollo · Santiago de Chile",
	},
} as const;

export async function GET(req: Request) {
	const url = new URL(req.url);
	const origin = url.origin;
	const logoUrl = new URL("/logo.png", origin).toString();
	const card = url.searchParams.get("v") === "labs" ? CARDS.labs : CARDS.pos;

	return new ImageResponse(
		(
			<div
				style={{
					width: "100%",
					height: "100%",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
					fontFamily: "Arial, sans-serif",
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: 24,
						marginBottom: 36,
					}}
				>
					{/* ImageResponse renderiza con Satori: aquí solo vale <img> plano. */}
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img src={logoUrl} width={72} height={72} alt="" style={{ borderRadius: 16 }} />
					<div
						style={{
							fontSize: 48,
							fontWeight: 800,
							color: "#ffffff",
							letterSpacing: "-0.02em",
						}}
					>
						{card.title}
					</div>
				</div>
				<div
					style={{
						fontSize: 28,
						color: "#94a3b8",
						textAlign: "center",
						maxWidth: 900,
					}}
				>
					{card.lead}
				</div>
				<div
					style={{
						marginTop: 16,
						fontSize: 20,
						color: "#64748b",
						textAlign: "center",
					}}
				>
					{card.detail}
				</div>
			</div>
		),
		{
			width: 1200,
			height: 630,
			headers: {
				"Cache-Control": "public, max-age=600",
			},
		},
	);
}
