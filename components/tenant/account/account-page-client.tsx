"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft } from "lucide-react";

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
	/** Query de la vuelta desde un enlace de correo: `linked`, `reset`, `error`. */
	notice: "linked" | "reset" | null;
	errorCode: string | null;
};

export function AccountPageClient({
	businessName,
	companySlug,
	countryCode,
	branches,
	account: initialAccount,
	notice,
	errorCode,
}: AccountPageClientProps) {
	const t = useTranslations("tenant.account");
	const pathname = usePathname();
	const menuPath = useMemo(() => getTenantScopedPath(pathname ?? "/", "/menu"), [pathname]);

	const [account, setAccount] = useState<MenuAccountPublic | null>(initialAccount);
	/** Aviso generado en el cliente; pisa al que venga por query de la URL. */
	const [localNotice, setLocalNotice] = useState<"passwordChanged" | null>(null);

	const activeNotice = localNotice ?? notice;

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
				{activeNotice ? (
					<p className="account-notice">{t(`notices.${activeNotice}`)}</p>
				) : null}

				{account ? (
					<MenuAccountDashboard
						companySlug={companySlug}
						branches={branches}
						account={account}
						resetMode={notice === "reset"}
						onSignedOut={() => {
							setLocalNotice(null);
							setAccount(null);
						}}
						onPasswordChanged={() => {
							setLocalNotice("passwordChanged");
							setAccount(null);
						}}
					/>
				) : (
					<MenuAccountAuthPanel
						companySlug={companySlug}
						countryCode={countryCode}
						branches={branches}
						initialView="login"
						initialErrorCode={errorCode}
						onAuthenticated={setAccount}
					/>
				)}
			</div>
		</div>
	);
}
