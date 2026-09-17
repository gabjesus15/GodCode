"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { LogOut, MapPin, Package, Settings, UserRound, UtensilsCrossed } from "lucide-react";

import { getFormStrategy } from "@/lib/geo/country-forms";
import type { MenuAccountDeliveryOptions } from "@/lib/menu-account/delivery-options";

import type { MenuAccountBranchOption, MenuAccountPublic } from "./menu-account-types";
import { MenuAccountAddresses } from "./menu-account-addresses";
import { errorMessage } from "./menu-account-auth-panel";
import { MenuAccountOrders } from "./menu-account-orders";
import { useMenuAccount } from "./use-menu-account";

type MenuAccountDashboardProps = {
	companySlug: string;
	countryCode: string;
	branches: MenuAccountBranchOption[];
	account: MenuAccountPublic;
	/** Si el negocio reparte por dirección o por zonas; decide el formulario de direcciones. */
	deliveryOptions: MenuAccountDeliveryOptions;
	/** Ruta del menú público, ya con el prefijo del tenant. */
	menuPath: string;
	onSignedOut: () => void;
	/**
	 * Cambiar la contraseña revoca la sesión en Supabase, así que hay que devolver a
	 * la persona al login en vez de dejarla en un panel que ya no responde.
	 */
	onPasswordChanged: () => void;
};

type DashboardSection = "account" | "orders" | "addresses" | "settings";

const SECTIONS: Array<{ id: DashboardSection; icon: typeof UserRound }> = [
	{ id: "account", icon: UserRound },
	{ id: "orders", icon: Package },
	{ id: "addresses", icon: MapPin },
	{ id: "settings", icon: Settings },
];

export function MenuAccountDashboard({
	companySlug,
	countryCode,
	branches,
	account: initialAccount,
	deliveryOptions,
	menuPath,
	onSignedOut,
	onPasswordChanged,
}: MenuAccountDashboardProps) {
	const t = useTranslations("tenant.account");
	const [section, setSection] = useState<DashboardSection>("account");
	// Vive aquí y no en la sección: al cambiar de sección el formulario se desmonta, y
	// al volver debe mostrar lo último guardado.
	const [account, setAccount] = useState(initialAccount);
	// El detalle de un pedido trae su propio encabezado con "Volver".
	const [orderDetailOpen, setOrderDetailOpen] = useState(false);

	return (
		<div className="account-dashboard">
			<nav className="account-nav" aria-label={t("title")}>
				<span className="account-nav-heading">{t("title")}</span>
				{SECTIONS.map(({ id, icon: Icon }) => (
					<button
						key={id}
						type="button"
						className={`account-nav-item ${section === id ? "is-active" : ""}`}
						aria-current={section === id ? "page" : undefined}
						onClick={() => {
							setSection(id);
							setOrderDetailOpen(false);
						}}
					>
						<Icon size={16} aria-hidden />
						<span>{t(`nav.${id}`)}</span>
					</button>
				))}
				{/* Salida al menú siempre a mano, sin depender de la flecha del encabezado. */}
				<Link href={menuPath} className="account-nav-item account-nav-item--link">
					<UtensilsCrossed size={16} aria-hidden />
					<span>{t("nav.menu")}</span>
				</Link>
			</nav>

			{/* Cada sección se monta solo al abrirla: pedidos y direcciones hacen su
			    petición al entrar, no todas al cargar la página. */}
			<div className="account-dashboard-content">
				{section === "orders" && orderDetailOpen ? null : (
					<header className="account-section-head">
						<h2 className="account-section-heading">{t(`nav.${section}`)}</h2>
						<p className="account-section-description">{t(`sectionDescriptions.${section}`)}</p>
					</header>
				)}

				{section === "account" ? (
					<ProfileSection
						companySlug={companySlug}
						countryCode={countryCode}
						branches={branches}
						account={account}
						onAccountUpdated={setAccount}
					/>
				) : null}
				{section === "orders" ? (
					<MenuAccountOrders companySlug={companySlug} onDetailChange={setOrderDetailOpen} />
				) : null}
				{section === "addresses" ? (
					<MenuAccountAddresses companySlug={companySlug} deliveryOptions={deliveryOptions} />
				) : null}
				{section === "settings" ? (
					<SettingsSection
						companySlug={companySlug}
						onSignedOut={onSignedOut}
						onPasswordChanged={onPasswordChanged}
					/>
				) : null}
			</div>
		</div>
	);
}

/** Grupo con título en mayúsculas, al estilo de un formulario de ajustes. */
function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
	return (
		<section className="account-group">
			<h3 className="account-group-title">{title}</h3>
			<div className="account-rows">{children}</div>
		</section>
	);
}

/** Fila etiqueta / control. `htmlFor` enlaza la etiqueta con su input. */
function SettingsRow({
	label,
	htmlFor,
	children,
}: {
	label: string;
	htmlFor?: string;
	children: ReactNode;
}) {
	return (
		<div className="account-row">
			{htmlFor ? (
				<label className="account-row-label" htmlFor={htmlFor}>
					{label}
				</label>
			) : (
				<span className="account-row-label">{label}</span>
			)}
			<div className="account-row-control">{children}</div>
		</div>
	);
}

type ProfileSectionProps = {
	companySlug: string;
	countryCode: string;
	branches: MenuAccountBranchOption[];
	account: MenuAccountPublic;
	onAccountUpdated: (account: MenuAccountPublic) => void;
};

function ProfileSection({
	companySlug,
	countryCode,
	branches,
	account,
	onAccountUpdated,
}: ProfileSectionProps) {
	const t = useTranslations("tenant.account");
	const { pending, errorCode, run } = useMenuAccount("login");
	const strategy = useMemo(() => getFormStrategy(countryCode), [countryCode]);

	const [fullName, setFullName] = useState(account.fullName);
	const [phone, setPhone] = useState(account.phone);
	const [branchId, setBranchId] = useState(account.preferredBranchId ?? "");
	const [profileSaved, setProfileSaved] = useState(false);

	const handleProfileSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		setProfileSaved(false);
		const result = await run<{ account: MenuAccountPublic }>("profile", {
			method: "PATCH",
			body: { companySlug, fullName, phone, preferredBranchId: branchId || null },
		});
		if (result.ok) {
			onAccountUpdated(result.data.account);
			setProfileSaved(true);
		}
	};

	return (
		<form className="account-panel" onSubmit={handleProfileSubmit}>
			<SettingsGroup title={t("dashboard.profileTitle")}>
				<SettingsRow label={t("dashboard.fullNameLabel")} htmlFor="account-full-name">
					<input
						id="account-full-name"
						className="account-input"
						value={fullName}
						onChange={(event) => setFullName(event.target.value)}
						autoComplete="name"
						required
					/>
				</SettingsRow>
				<SettingsRow label={t("dashboard.phoneLabel")} htmlFor="account-phone">
					<input
						id="account-phone"
						className="account-input"
						value={phone}
						onChange={(event) => setPhone(strategy.normalizePhone(event.target.value))}
						placeholder={strategy.phonePlaceholder}
						autoComplete="tel"
						required
					/>
				</SettingsRow>
				<SettingsRow label={t("dashboard.emailLabel")}>
					<span className="account-row-value">{account.email}</span>
				</SettingsRow>
				<SettingsRow label={t("dashboard.documentLabel")}>
					<span className="account-row-value">{account.documentMasked}</span>
				</SettingsRow>
			</SettingsGroup>

			{branches.length > 0 ? (
				<SettingsGroup title={t("dashboard.preferencesTitle")}>
					<SettingsRow label={t("dashboard.branchLabel")} htmlFor="account-branch">
						<select
							id="account-branch"
							className="account-input"
							value={branchId}
							onChange={(event) => setBranchId(event.target.value)}
						>
							<option value="">{t("dashboard.branchNone")}</option>
							{branches.map((branch) => (
								<option key={branch.id} value={branch.id}>
									{branch.name}
								</option>
							))}
						</select>
					</SettingsRow>
				</SettingsGroup>
			) : null}

			<div className="account-actions">
				{profileSaved ? <p className="account-success">{t("dashboard.saved")}</p> : null}
				{errorCode ? <p className="account-error">{errorMessage(t, errorCode)}</p> : null}
				<button type="submit" className="account-button" disabled={pending}>
					{pending ? t("dashboard.saving") : t("dashboard.save")}
				</button>
			</div>
		</form>
	);
}

type SettingsSectionProps = {
	companySlug: string;
	onSignedOut: () => void;
	onPasswordChanged: () => void;
};

function SettingsSection({ companySlug, onSignedOut, onPasswordChanged }: SettingsSectionProps) {
	const t = useTranslations("tenant.account");
	const password = useMenuAccount("login");
	const logout = useMenuAccount("login");

	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");

	const handlePasswordSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		const result = await password.run("password", {
			body: { companySlug, currentPassword, newPassword },
		});
		if (result.ok) {
			setCurrentPassword("");
			setNewPassword("");
			onPasswordChanged();
		}
	};

	const handleLogout = async () => {
		const result = await logout.run("logout");
		if (result.ok) onSignedOut();
	};

	return (
		<div className="account-panel">
			<form onSubmit={handlePasswordSubmit}>
				<SettingsGroup title={t("dashboard.passwordTitle")}>
					<SettingsRow label={t("dashboard.currentPassword")} htmlFor="account-current-password">
						<input
							id="account-current-password"
							className="account-input"
							type="password"
							value={currentPassword}
							onChange={(event) => setCurrentPassword(event.target.value)}
							autoComplete="current-password"
							required
						/>
					</SettingsRow>
					<SettingsRow label={t("dashboard.newPassword")} htmlFor="account-new-password">
						<input
							id="account-new-password"
							className="account-input"
							type="password"
							value={newPassword}
							onChange={(event) => setNewPassword(event.target.value)}
							autoComplete="new-password"
							minLength={8}
							required
						/>
						<span className="account-field-hint">{t("dashboard.passwordSharedNote")}</span>
					</SettingsRow>
				</SettingsGroup>
				<div className="account-actions">
					{password.errorCode ? (
						<p className="account-error">{errorMessage(t, password.errorCode)}</p>
					) : null}
					{/* El éxito no se muestra aquí: al cambiar la contraseña se cierra la
					    sesión y el aviso lo da el panel de acceso. */}
					<button type="submit" className="account-button" disabled={password.pending}>
						{password.pending ? t("dashboard.changingPassword") : t("dashboard.changePassword")}
					</button>
				</div>
			</form>

			<SettingsGroup title={t("dashboard.sessionTitle")}>
				<SettingsRow label={t("dashboard.logoutLabel")}>
					<button
						type="button"
						className="account-button account-button--ghost"
						onClick={handleLogout}
						disabled={logout.pending}
					>
						<LogOut size={15} aria-hidden />
						{logout.pending ? t("dashboard.loggingOut") : t("dashboard.logout")}
					</button>
					{logout.errorCode ? (
						<p className="account-error">{errorMessage(t, logout.errorCode)}</p>
					) : null}
				</SettingsRow>
			</SettingsGroup>
		</div>
	);
}
