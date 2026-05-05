import type { MetadataRoute } from "next";

import { getAppUrl } from "@/lib/tenant/app-url";

export default function robots(): MetadataRoute.Robots {
  const base = getAppUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/saas-admin",
          "/dashboard",
          "/companies",
          "/plans",
          "/tickets",
          "/herramientas",
          "/addons",
          "/plan-payment-methods",
          "/post-login",
          "/cuenta",
          "/checkout",
          "/onboarding/solicitudes",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
