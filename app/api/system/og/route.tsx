export const runtime = "edge";

export async function GET() {
  const svg =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">` +
    `<defs>` +
    `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0%" stop-color="#0f172a"/>` +
    `<stop offset="50%" stop-color="#1e293b"/>` +
    `<stop offset="100%" stop-color="#0f172a"/>` +
    `</linearGradient>` +
    `<linearGradient id="logo" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0%" stop-color="#6366f1"/>` +
    `<stop offset="100%" stop-color="#818cf8"/>` +
    `</linearGradient>` +
    `</defs>` +
    `<rect width="1200" height="630" fill="url(#bg)"/>` +
    `<rect x="390" y="210" width="64" height="64" rx="16" fill="url(#logo)"/>` +
    `<text x="422" y="250" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="32" font-weight="800">G</text>` +
    `<text x="476" y="254" fill="#ffffff" font-family="Arial, sans-serif" font-size="48" font-weight="800">GodCode</text>` +
    `<text x="600" y="332" text-anchor="middle" fill="#94a3b8" font-family="Arial, sans-serif" font-size="28">Crea tu tienda online en minutos.</text>` +
    `<text x="600" y="368" text-anchor="middle" fill="#64748b" font-family="Arial, sans-serif" font-size="20">Menú digital · Carrito · Delivery · Caja · Inventario</text>` +
    `</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=600",
    },
  });
}
