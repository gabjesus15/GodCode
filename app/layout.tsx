import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { DevServiceWorkerCleanup } from "../components/dev-sw-cleanup";
import { GlobalAntiZoom } from "../components/theme/global-anti-zoom";
import { PageAnalyticsTracker } from "../components/analytics/page-analytics-tracker";
import { getMessagesForLocale } from "@/lib/i18n/messages";
import { getCurrentLocale } from "@/lib/i18n/server";
import { getAppUrl } from "@/lib/tenant/app-url";
// import Image from 'next/image'; // Eliminado porque no se usa

import "./globals.css";

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


export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
};

export const metadata: Metadata = {
  metadataBase: new URL(getAppUrl()),
  title: {
    default: "GodCode | Menú digital y pedidos online para restaurantes",
    template: "%s · GodCode",
  },
  description:
    "GodCode ayuda a restaurantes y negocios con sucursales a vender online con menú digital, pedidos por WhatsApp, delivery, caja e inventario. Sin comisiones por venta y listo en minutos.",
  verification: {
    google:
      process.env.GOOGLE_SITE_VERIFICATION?.trim() ||
      process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim() ||
      undefined,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getCurrentLocale();
  const messages = getMessagesForLocale(locale);

  return (
    <html lang={locale} suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://saas-godcode-admin.vercel.app" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />
        {process.env.NEXT_PUBLIC_SUPABASE_URL ? (
          <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")} crossOrigin="anonymous" />
        ) : null}
        <link rel="preload" href="/fonts/outfit.css" as="style" />
        <link rel="preload" href="/fonts/Outfit-Regular.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/Outfit-Bold.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="stylesheet" href="/fonts/custom-fonts.css" />
      </head>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} bg-background text-foreground antialiased transition-colors duration-200`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <GlobalAntiZoom />
          {/* Logo y slogan eliminados del layout global por petición del usuario */}
          {process.env.NODE_ENV !== "production" ? <DevServiceWorkerCleanup /> : null}
          {process.env.NODE_ENV === "production" ? <PageAnalyticsTracker /> : null}
          {children}
          {process.env.NODE_ENV === "production" ? (
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
