import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import Script from "next/script";
import { Geist, Geist_Mono, Montserrat, Space_Grotesk } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { DevServiceWorkerCleanup } from "../components/dev-sw-cleanup";
import { SilentConsole } from "../components/silent-console";
import { GlobalAntiZoom } from "../components/theme/global-anti-zoom";
import { LIGHT_ONLY_THEME_SCRIPT } from "@/components/theme/saas-theme-scope";
import { PageAnalyticsTracker } from "../components/analytics/page-analytics-tracker";
import { getClientMessagesForPath } from "@/lib/i18n/client-messages";
import { getCurrentLocale } from "@/lib/i18n/server";
import { LANDING_BRAND_NAME } from "@/lib/landing/brand";
import { LANDING_DESCRIPTION, LANDING_SHARE_TITLE } from "@/lib/landing/metadata";
import { getAppUrl } from "@/lib/tenant/app-url";
// import Image from 'next/image'; // Eliminado porque no se usa

import "./globals.css";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID?.trim() || "G-ZLTXLHNVNE";
const IS_VERCEL = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "700"],
});

/**
 * Tipografia del menu publico del tenant.
 *
 * Sin `weight`: Montserrat es variable en Google Fonts, asi que un solo fichero
 * cubre de 100 a 900. Importa aqui porque el CSS del tenant pide siete pesos
 * distintos (400, 450, 500, 600, 700, 800 y 900) y con caras estaticas el
 * navegador tendria que fabricar por software los 34 usos de 800 y 900 —
 * precios y titulos de categoria — engordando los trazos del 700.
 *
 * Va por `next/font` y no autoalojada a mano como la anterior: se sirve desde
 * el propio dominio, sin peticion a Google, y con las metricas del respaldo
 * ajustadas para que no salte el layout mientras carga.
 */
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
});


/**
 * Sin `maximumScale` ni `userScalable`: bloquear el pellizco es un fallo de
 * WCAG 1.4.4 (AA), y es el viewport de este layout raiz el que acaba sirviendo
 * el menu publico del tenant.
 *
 * En una carta duele especialmente: el zoom es el gesto con el que alguien con
 * vista cansada lee la descripcion de un plato o mira bien la foto. El motivo
 * habitual para bloquearlo — el zoom accidental al tocar dos veces — ya lo
 * cubren los `touch-action: manipulation` de los controles.
 *
 * Los layouts de auth, super-admin y onboarding declaran el suyo y siguen
 * bloqueandolo; son superficies de panel y se dejan como estaban.
 */
export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(getAppUrl()),
  title: {
    default: LANDING_SHARE_TITLE,
    template: `%s · ${LANDING_BRAND_NAME}`,
  },
  description: LANDING_DESCRIPTION,
  verification: {
    google:
      process.env.GOOGLE_SITE_VERIFICATION?.trim() ||
      process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim() ||
      undefined,
  },
  icons: {
    icon: [
      // Google Search exige favicons múltiplo de 48px para mostrarlos en resultados.
      { url: "/favicon-48.png", type: "image/png", sizes: "48x48" },
      { url: "/favicon.png", type: "image/png", sizes: "1024x1024" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16.png", type: "image/png", sizes: "16x16" },
    ],
    shortcut: "/favicon-32.png",
    apple: "/apple-touch-icon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getCurrentLocale();
  const hdrs = await headers();
  const pathname = hdrs.get("x-pathname") || "/";
  const tenantSlug = hdrs.get("x-tenant-slug");
  const messages = getClientMessagesForPath(pathname, locale, { tenantSlug });
  const isTenantRoute = Boolean(tenantSlug);

  return (
    <html lang={locale} suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        {process.env.NEXT_PUBLIC_SUPABASE_URL ? (
          <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")} crossOrigin="anonymous" />
        ) : null}
        <link rel="preconnect" href="https://saas-godcode-admin.vercel.app" crossOrigin="anonymous" />
        {!isTenantRoute ? (
          <>
            {/* Los preload de Outfit apuntaban a cuatro ficheros de 0 bytes: la
                fuente nunca llego a cargar en ninguna superficie. Se retiran con
                ellos. `custom-fonts.css` se queda: declara Nevis y Aleo. */}
            <link rel="stylesheet" href="/fonts/custom-fonts.css" />
          </>
        ) : null}
        {/* Script nativo: evita el warning de React 19 con next/script + beforeInteractive en <head>. */}
        <script
          id="saas-theme-light-only"
          dangerouslySetInnerHTML={{ __html: LIGHT_ONLY_THEME_SCRIPT.trim() }}
        />
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}', { send_page_view: false });
          `}
        </Script>
      </head>
      <body
        suppressHydrationWarning
        className={
          isTenantRoute
            ? `${montserrat.variable} bg-background text-foreground antialiased transition-colors duration-200`
            : `${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} bg-background text-foreground antialiased transition-colors duration-200`
        }
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <GlobalAntiZoom />
          {/* Logo y slogan eliminados del layout global por petición del usuario */}
          {process.env.NODE_ENV === "production" ? <SilentConsole /> : null}
          {process.env.NODE_ENV !== "production" ? <DevServiceWorkerCleanup /> : null}
          {process.env.NODE_ENV === "production" ? <PageAnalyticsTracker /> : null}
          {children}
          {IS_VERCEL ? (
            <>
              <Analytics />
              <SpeedInsights />
            </>
          ) : null}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
