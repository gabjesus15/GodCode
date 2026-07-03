import type { AppLocale } from "./config";
import { getMessagesForLocale, type I18nMessages } from "./messages";
import { MAIN_DOMAIN_RESERVED_PATH_SEGMENTS } from "@/lib/tenant/reserved-path-segments";

export type ClientI18nMessages = Pick<I18nMessages, "common"> &
	Partial<Pick<I18nMessages, "onboarding" | "tenant">>;

function isTenantPublicPath(pathname: string): boolean {
	const first = pathname.split("/").filter(Boolean)[0]?.toLowerCase();
	if (!first || first.includes(".")) return false;
	return !MAIN_DOMAIN_RESERVED_PATH_SEGMENTS.has(first);
}

export type ClientMessagesOptions = {
	tenantSlug?: string | null;
};

/** Solo envía al cliente los namespaces que usan componentes client. */
export function getClientMessagesForPath(
	pathname: string,
	locale: AppLocale,
	options?: ClientMessagesOptions,
): ClientI18nMessages {
	const all = getMessagesForLocale(locale);
	const tenantSlug = options?.tenantSlug?.trim();

	if (tenantSlug || isTenantPublicPath(pathname)) {
		return all;
	}

	if (pathname.startsWith("/onboarding")) {
		return {
			common: all.common,
			onboarding: all.onboarding,
		};
	}

	return { common: all.common };
}
