import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  normalizeLocale,
} from "@/lib/i18n/config";
import { getMessagesForLocale } from "@/lib/i18n/messages";
import { resolveTenantPreferredLocale } from "@/lib/i18n/tenant-locale";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;

  let locale = DEFAULT_LOCALE;

  if (cookieLocale) {
    locale = normalizeLocale(cookieLocale);
  } else {
    const requestHeaders = await headers();
    const tenantLocale = await resolveTenantPreferredLocale(requestHeaders);
    if (tenantLocale) {
      locale = tenantLocale;
    } else {
      const acceptLanguage = requestHeaders.get("accept-language") ?? "";
      const preferred = acceptLanguage.split(",")[0] ?? "";
      locale = normalizeLocale(preferred);
    }
  }

  return {
    locale,
    messages: getMessagesForLocale(locale),
  };
});
