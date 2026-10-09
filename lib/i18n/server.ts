import { cache } from "react";
import { cookies, headers } from "next/headers";

import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, normalizeLocale, type AppLocale } from "./config";
import { resolveTenantPreferredLocale } from "./tenant-locale";

/** Memoizado por petición: lo piden el layout raíz y la config de next-intl. */
export const getCurrentLocale = cache(async function getCurrentLocale(): Promise<AppLocale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  if (cookieLocale) return normalizeLocale(cookieLocale);

  const requestHeaders = await headers();
  const tenantLocale = await resolveTenantPreferredLocale(requestHeaders);
  if (tenantLocale) return tenantLocale;

  const acceptLanguage = requestHeaders.get("accept-language") ?? "";
  const firstPreferred = acceptLanguage.split(",")[0] ?? "";

  if (!firstPreferred) return DEFAULT_LOCALE;
  return normalizeLocale(firstPreferred);
});
