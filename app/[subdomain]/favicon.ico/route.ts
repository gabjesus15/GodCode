import { isTenantPubliclyOpen } from "@/lib/plans/tenant-subscription";
import { tenantBrandingIconVersionSeed } from "@/lib/tenant/tenant-favicon-utils";
import { getCachedCompany } from "@/utils/tenant-cache";

export const dynamic = "force-dynamic";

/**
 * `/<slug>/favicon.ico` lleva al ícono de la tienda. La regla de qué ícono se ve (logo de la
 * tienda abierta o el genérico de Gcode) vive en `tenant-favicon`; aquí solo cambia la
 * versión: una tienda que no está abierta al público no expone la de su marca, y al abrirse
 * la URL cambia y el navegador pide el logo.
 *
 * La redirección es relativa: detrás del proxy `req.url` llega como `http://0.0.0.0:3000/…`
 * y una URL absoluta armada con ella mandaba al navegador a la dirección interna.
 */
export async function GET(_req: Request, context: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = await context.params;
  const company = await getCachedCompany(subdomain);
  const versionSeed = company && isTenantPubliclyOpen(company) ? tenantBrandingIconVersionSeed(company) : "gcode";
  const target = `/${encodeURIComponent(subdomain)}/tenant-favicon?v=${encodeURIComponent(String(versionSeed))}`;
  return new Response(null, { status: 302, headers: { Location: target } });
}
