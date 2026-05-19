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
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}