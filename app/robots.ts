import { MetadataRoute } from 'next';
import { getAppUrl } from '@/lib/tenant/app-url';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getAppUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/api/system/og"],
        disallow: [
          // Rutas de autenticación y administración
          "/admin/",
          "/api/",
          "/login",
          "/post-login",
          // Panel de la empresa (requieren sesión; evitamos que gasten rastreo)
          "/dashboard/",
          "/companies/",
          "/plans/",
          "/addons/",
          "/plan-payment-methods/",
          "/herramientas/",
          "/tickets/",
          "/landing/",
          // Rutas del super-admin (panel interno)
          "/saas-admin/",
          // Portal de cliente (privado)
          "/cuenta/",
          // Checkout y flujos transaccionales
          "/checkout/",
          // Onboarding: pasos internos post-registro (no indexables)
          "/onboarding/complete",
          "/onboarding/verify",
          "/onboarding/pago",
          // «Arma y paga»: la tienda en construcción ya es noindex; que tampoco gaste rastreo.
          "/onboarding/tienda",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}