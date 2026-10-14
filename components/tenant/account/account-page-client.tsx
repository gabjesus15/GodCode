"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";

import type { MenuAccountDeliveryOptions } from "@/lib/menu-account/delivery-options";
import { useApplyTenantSurfaceScheme } from "@/lib/tenant/hooks/use-tenant-surface-scheme";

import { PoweredByGcode } from "../branding/powered-by-gcode";
import { useCartStore } from "../cart/cart-store";
import { getTenantScopedPath } from "../utils/tenant-route";

import { AccountAvatar, AccountHero, initialsOf, type AccountHeroChrome } from "./account-hero";
import { MenuAccountAuthPanel } from "./menu-account-auth-panel";
import { MenuAccountDashboard } from "./menu-account-dashboard";
import type { MenuAccountBranchOption, MenuAccountPublic } from "./menu-account-types";
import { useAccountScheme } from "./use-account-scheme";

type AccountPageClientProps = {
	businessName: string;
	/** Logo del local para el sello del pie ("local | Gcode"); sin logo, crédito de texto. */
	logoUrl?: string | null;
	companySlug: string;
	countryCode: string;
	branches: MenuAccountBranchOption[];
	account: MenuAccountPublic | null;
	deliveryOptions: MenuAccountDeliveryOptions;
};

const GUEST_PERKS = ["repeat", "addresses", "track"] as const;

export function AccountPageClient({
	businessName,
	logoUrl = null,
	companySlug,
	countryCode,
	branches,
	account: initialAccount,
	deliveryOptions,
}: AccountPageClientProps) {
	const t = useTranslations("tenant.account");
	const pathname = usePathname();
	const router = useRouter();
	const searchParams = useSearchParams();
	const menuPath = useMemo(() => getTenantScopedPath(pathname ?? "/", "/menu"), [pathname]);
	/* El resto del sitio (fondo del shell) sigue el claro/oscuro del menú; la cuenta
	   lleva el suyo propio, claro por defecto. */
	useApplyTenantSurfaceScheme();
	const { scheme, toggle } = useAccountScheme();
	/* `?next=cart`: quien vino desde el carrito (botón de cuenta o cupón que pide
	   sesión) vuelve al menú con el carrito abierto en cuanto entra. */
	const returnToCart = searchParams.get("next") === "cart";

	const [account, setAccount] = useState<MenuAccountPublic | null>(initialAccount);
	const [notice, setNotice] = useState<"passwordChanged" | "linked" | "accountDeleted" | null>(null);
	const noticeText = notice ? t(`notices.${notice}`) : null;

	const chrome: AccountHeroChrome = { businessName, menuPath, scheme, onToggleScheme: toggle };

	return (
		<div className="account-page" data-menu-scheme={scheme}>
			{account ? (
				<MenuAccountDashboard
					chrome={chrome}
					notice={noticeText}
					companySlug={companySlug}
					countryCode={countryCode}
					branches={branches}
					account={account}
					deliveryOptions={deliveryOptions}
					onSignedOut={() => {
						setNotice(null);
						setAccount(null);
					}}
					onPasswordChanged={() => {
						setNotice("passwordChanged");
						setAccount(null);
					}}
					onAccountDeleted={() => {
						setNotice("accountDeleted");
						setAccount(null);
					}}
				/>
			) : (
				<>
					<AccountHero {...chrome}>
						<div className="account-hero-me">
							<AccountAvatar label={initialsOf(businessName)} imageUrl={logoUrl} />
							<div className="account-hero-text">
								<h1 className="account-hero-title">{t("hero.guestTitle", { business: businessName })}</h1>
							</div>
						</div>
						<ul className="account-hero-perks">
							{GUEST_PERKS.map((perk) => (
								<li key={perk}>
									<span className="account-hero-perk-check" aria-hidden>
										<Check size={14} strokeWidth={3} />
									</span>
									{t(`hero.perks.${perk}`)}
								</li>
							))}
						</ul>
					</AccountHero>
					<div className="account-page-body account-page-body--guest">
						{noticeText ? <p className="account-notice">{noticeText}</p> : null}
						<MenuAccountAuthPanel
							companySlug={companySlug}
							countryCode={countryCode}
							branches={branches}
							onAuthenticated={(nextAccount, how) => {
								setNotice(how === "linked" ? "linked" : null);
								setAccount(nextAccount);
								if (returnToCart) {
									useCartStore.getState().openCart();
									router.push(menuPath);
								}
							}}
							onPasswordReset={() => setNotice("passwordChanged")}
						/>
					</div>
				</>
			)}

			<PoweredByGcode tenantSlug={companySlug} surface="account" logoUrl={logoUrl} brandName={businessName} />
		</div>
	);
}
