"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft } from "lucide-react";

import type { MenuAccountDeliveryOptions } from "@/lib/menu-account/delivery-options";

import { getTenantScopedPath } from "../utils/tenant-route";

import { MenuAccountAuthPanel } from "./menu-account-auth-panel";
import { MenuAccountDashboard } from "./menu-account-dashboard";
import type { MenuAccountBranchOption, MenuAccountPublic } from "./menu-account-types";

type AccountPageClientProps = {
	businessName: string;
	companySlug: string;
	countryCode: string;
	branches: MenuAccountBranchOption[];
	account: MenuAccountPublic | null;
	deliveryOptions: MenuAccountDeliveryOptions;
};

export function AccountPageClient({
	businessName,
	companySlug,
	countryCode,
	branches,
	account: initialAccount,
	deliveryOptions,
}: AccountPageClientProps) {
	const t = useTranslations("tenant.account");
	const pathname = usePathname();
	const menuPath = useMemo(() => getTenantScopedPath(pathname ?? "/", "/menu"), [pathname]);

	const [account, setAccount] = useState<MenuAccountPublic | null>(initialAccount);
	const [notice, setNotice] = useState<"passwordChanged" | "linked" | null>(null);

	return (
		<div className="account-page">
			<header className="account-page-header">
				<Link href={menuPath} className="account-back-button" aria-label={t("back")}>
					<ChevronLeft size={26} />
				</Link>
				<div className="account-page-heading">
					<h1 className="account-page-title">{t("title")}</h1>
					<span className="account-page-business">{businessName}</span>
				</div>
			</header>

			<div className="account-page-body">
				{notice ? <p className="account-notice">{t(`notices.${notice}`)}</p> : null}

				{account ? (
					<MenuAccountDashboard
						companySlug={companySlug}
						countryCode={countryCode}
						branches={branches}
						account={account}
						deliveryOptions={deliveryOptions}
						menuPath={menuPath}
						onSignedOut={() => {
							setNotice(null);
							setAccount(null);
						}}
						onPasswordChanged={() => {
							setNotice("passwordChanged");
							setAccount(null);
						}}
					/>
				) : (
					<MenuAccountAuthPanel
						companySlug={companySlug}
						countryCode={countryCode}
						branches={branches}
						onAuthenticated={(nextAccount, how) => {
							setNotice(how === "linked" ? "linked" : null);
							setAccount(nextAccount);
						}}
						onPasswordReset={() => setNotice("passwordChanged")}
					/>
				)}
			</div>
		</div>
	);
}
