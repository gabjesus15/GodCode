import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import Script from "next/script";
import {
  Anton,
  Bebas_Neue,
  Geist,
  Geist_Mono,
  Inter,
  Lilita_One,
  Lora,
  Luckiest_Guy,
  Montserrat,
  Nunito,
  Playfair_Display,
  Poppins,
  Space_Grotesk,
} from "next/font/google";
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
import { LANDING_COMPANY_NAME } from "@/lib/landing/brand";
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
 * Tipografías que el local puede elegir en el panel (STORE_THEME_FONTS). Solo
 * se declaran: el navegador descarga únicamente la que `--tenant-font` usa.
 * Poppins no es variable, así que lleva los pesos que pide el menú.
 */
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const poppins = Poppins({ variable: "--font-poppins", subsets: ["latin"], display: "swap", weight: ["400", "500", "600", "700", "800"] });
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"], display: "swap" });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], display: "swap" });
const lora = Lora({ variable: "--font-lora", subsets: ["latin"], display: "swap" });
/* De cartel: un solo peso cada una (ver STORE_THEME_FONTS). */
const anton = Anton({ variable: "--font-anton", subsets: ["latin"], display: "swap", weight: "400" });
const bebas = Bebas_Neue({ variable: "--font-bebas", subsets: ["latin"], display: "swap", weight: "400" });
const luckiest = Luckiest_Guy({ variable: "--font-luckiest", subsets: ["latin"], display: "swap", weight: "400" });
const lilita = Lilita_One({ variable: "--font-lilita", subsets: ["latin"], display: "swap", weight: "400" });
const tenantFontVariables = [montserrat, inter, poppins, nunito, playfair, lora, anton, bebas, luckiest, lilita]
  .map((font) => font.variable)
  .join(" ");


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
    // Nombre de la empresa al final: es lo que Google usa como "nombre del sitio".
    template: `%s · ${LANDING_COMPANY_NAME}`,
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
            ? `${tenantFontVariables} bg-background text-foreground antialiased transition-colors duration-200`
            : /* El panel también las lleva: la vista previa del nombre del local las
                 necesita. Solo son declaraciones; cada fuente se descarga al usarse. */
              `${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} ${tenantFontVariables} bg-background text-foreground antialiased transition-colors duration-200`
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
