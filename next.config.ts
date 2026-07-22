import type { NextConfig } from "next";
import { resolve } from "path";
import createNextIntlPlugin from "next-intl/plugin";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");
const isProduction = process.env.NODE_ENV === "production";

const supabaseStoragePattern = (() => {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!rawUrl) return null;

  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;

    const basePath = url.pathname.replace(/\/$/, "");
    return {
      protocol: url.protocol.slice(0, -1) as "http" | "https",
      hostname: url.hostname,
      port: url.port,
      pathname: `${basePath}/storage/v1/object/public/menu/**`,
    };
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  compiler: isProduction
    ? {
        removeConsole: true,
      }
    : undefined,
  // Evita que Turbopack infiera `app/` como raíz y luego falle con "Next.js package not found".
  turbopack: {
    root: resolve(__dirname),
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "@radix-ui/react-dialog",
      "@radix-ui/react-accordion",
      "embla-carousel-react",
    ],
  },
  images: {
    qualities: [75, 92, 95],
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      ...(supabaseStoragePattern ? [supabaseStoragePattern] : []),
    ],
  },
  webpack: (config, { dev }) => {
    if (dev) {
      const currentIgnored = config.watchOptions?.ignored;
      const ignoredList = Array.isArray(currentIgnored)
        ? currentIgnored
        : currentIgnored
          ? [currentIgnored]
          : [];

      config.watchOptions = {
        ...config.watchOptions,
        ignored: [...ignoredList, "**/services/**"],
      };
    }

    return config;
  },
  async headers() {
    // Detectar si estamos en un dominio de preview de Vercel para añadir noindex.
    // En producción (godcode.me) este bloque no aplica el header.
    const isVercelPreview = process.env.VERCEL_ENV === "preview";
    const previewNoindexHeaders = isVercelPreview
      ? [
          {
            source: "/(.*)",
            headers: [
              {
                key: "X-Robots-Tag",
                value: "noindex, nofollow",
              },
            ],
          },
        ]
      : [];

    return [
      ...previewNoindexHeaders,
      {
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
        ],
      },
      {
        source: "/:path*.map",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store",
          },
        ],
      },
    ];
  },
  async redirects() {
    // 301 permanente: consolida SEO en www.godcode.me.
    // Vercel aplica un 307 por defecto; este redirect lo overridea con 301.
    const baseDomain = process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN?.trim() || "";
    if (!baseDomain || baseDomain.startsWith("www.") || baseDomain.includes("localhost")) {
      return [];
    }
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: baseDomain }],
        destination: `https://www.${baseDomain}/:path*`,
        permanent: true, // 301
      },
    ];
  },

};

export default withBundleAnalyzer(withNextIntl(nextConfig));
