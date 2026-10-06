import { getRequestConfig } from "next-intl/server";

import { getCurrentLocale } from "@/lib/i18n/server";
import { getMessagesForLocale } from "@/lib/i18n/messages";

// Misma resolución (cookie, local del tenant, Accept-Language) que el layout
// raíz y memoizada por petición: antes se repetía aquí y consultaba dos veces.
export default getRequestConfig(async () => {
  const locale = await getCurrentLocale();

  return {
    locale,
    messages: getMessagesForLocale(locale),
  };
});
