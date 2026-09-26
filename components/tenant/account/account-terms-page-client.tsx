"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft } from "lucide-react";

import { useApplyTenantSurfaceScheme } from "@/lib/tenant/hooks/use-tenant-surface-scheme";

import { PoweredByGcode } from "../branding/powered-by-gcode";
import { getTenantScopedPath } from "../utils/tenant-route";

import { MENU_ACCOUNT_TERMS_UPDATED_AT, MenuAccountTermsContent } from "./menu-account-terms-content";

type AccountTermsPageClientProps = {
	businessName: string;
	logoUrl?: string | null;
	companySlug: string;
};

export function AccountTermsPageClient({ businessName, logoUrl = null, companySlug }: AccountTermsPageClientProps) {
	const t = useTranslations("tenant.account");
	const pathname = usePathname();
	const accountPath = useMemo(() => getTenantScopedPath(pathname ?? "/", "/mi-cuenta"), [pathname]);
	// Mismo claro/oscuro que el menú y Mi cuenta.
	useApplyTenantSurfaceScheme();

	return (
		<div className="account-page">
			<header className="account-page-header">
				<Link href={accountPath} className="account-back-button" aria-label={t("terms.back")}>
					<ChevronLeft size={26} />
				</Link>
				<div className="account-page-heading">
					<h1 className="account-page-title">{t("terms.title")}</h1>
					<span className="account-page-business">{businessName}</span>
				</div>
			</header>

			<div className="account-page-body account-page-body--terms">
				<article className="account-terms-page">
					<p className="account-terms-updated">{t("terms.updated", { date: MENU_ACCOUNT_TERMS_UPDATED_AT })}</p>
					<MenuAccountTermsContent />
				</article>
			</div>

			<PoweredByGcode tenantSlug={companySlug} surface="account" logoUrl={logoUrl} brandName={businessName} />
		</div>
	);
}
