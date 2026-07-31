import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(req: Request) {
	const origin = new URL(req.url).origin;
	const logoUrl = new URL("/logo.png", origin).toString();

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
					<img src={logoUrl} width={72} height={72} alt="" style={{ borderRadius: 16 }} />
					<div
						style={{
							fontSize: 48,
							fontWeight: 800,
							color: "#ffffff",
							letterSpacing: "-0.02em",
						}}
					>
						Gcode
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
					Crea tu tienda online en minutos.
				</div>
				<div
					style={{
						marginTop: 16,
						fontSize: 20,
						color: "#64748b",
						textAlign: "center",
					}}
				>
					Menú digital · Carrito · Delivery · Caja · Inventario
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
