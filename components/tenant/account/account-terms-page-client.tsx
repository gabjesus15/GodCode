"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { useApplyTenantSurfaceScheme } from "@/lib/tenant/hooks/use-tenant-surface-scheme";

import { PoweredByGcode } from "../branding/powered-by-gcode";
import { getTenantScopedPath } from "../utils/tenant-route";

import { AccountHero } from "./account-hero";
import { MENU_ACCOUNT_TERMS_UPDATED_AT, MenuAccountTermsContent } from "./menu-account-terms-content";
import { useAccountScheme } from "./use-account-scheme";

type AccountTermsPageClientProps = {
	businessName: string;
	logoUrl?: string | null;
	companySlug: string;
};

export function AccountTermsPageClient({ businessName, logoUrl = null, companySlug }: AccountTermsPageClientProps) {
	const t = useTranslations("tenant.account");
	const pathname = usePathname();
	const accountPath = useMemo(() => getTenantScopedPath(pathname ?? "/", "/mi-cuenta"), [pathname]);
	const menuPath = useMemo(() => getTenantScopedPath(pathname ?? "/", "/menu"), [pathname]);
	// El mismo claro/oscuro que eligió la persona en Mi cuenta.
	useApplyTenantSurfaceScheme();
	const { scheme, toggle } = useAccountScheme();

	return (
		<div className="account-page" data-menu-scheme={scheme}>
			<AccountHero
				businessName={businessName}
				menuPath={menuPath}
				scheme={scheme}
				onToggleScheme={toggle}
				back={{ href: accountPath, label: t("title"), ariaLabel: t("terms.back") }}
			>
				<div className="account-hero-text account-hero-text--section">
					<h1 className="account-hero-title">{t("terms.title")}</h1>
					<span className="account-hero-sub">{t("terms.updated", { date: MENU_ACCOUNT_TERMS_UPDATED_AT })}</span>
				</div>
			</AccountHero>

			<div className="account-page-body account-page-body--terms">
				<article className="account-terms-page">
					<MenuAccountTermsContent />
				</article>
			</div>

			<PoweredByGcode tenantSlug={companySlug} surface="account" logoUrl={logoUrl} brandName={businessName} />
		</div>
	);
}
