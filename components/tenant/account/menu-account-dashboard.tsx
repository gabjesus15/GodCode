"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Clock, KeyRound, LogOut, MapPin, Package } from "lucide-react";

import type { MenuAccountBranchOption, MenuAccountPublic } from "./menu-account-types";
import { errorMessage } from "./menu-account-auth-panel";
import { useMenuAccount } from "./use-menu-account";

type MenuAccountDashboardProps = {
	companySlug: string;
	branches: MenuAccountBranchOption[];
	account: MenuAccountPublic;
	/** Llegó desde el enlace de recuperación: se abre directo el cambio de contraseña. */
	resetMode: boolean;
	onSignedOut: () => void;
	/**
	 * Cambiar la contraseña revoca la sesión en Supabase, así que hay que devolver a
	 * la persona al login en vez de dejarla en un panel que ya no responde.
	 */
	onPasswordChanged: () => void;
};

export function MenuAccountDashboard({
	companySlug,
	branches,
	account: initialAccount,
	resetMode,
	onSignedOut,
	onPasswordChanged,
}: MenuAccountDashboardProps) {
	const t = useTranslations("tenant.account");
	const { pending, errorCode, setErrorCode, run } = useMenuAccount("login");

	const [account, setAccount] = useState(initialAccount);
	const [fullName, setFullName] = useState(initialAccount.fullName);
	const [phone, setPhone] = useState(initialAccount.phone);
	const [branchId, setBranchId] = useState(initialAccount.preferredBranchId ?? "");
	const [profileSaved, setProfileSaved] = useState(false);

	const [showPasswordForm, setShowPasswordForm] = useState(resetMode);
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");

	const handleProfileSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		setProfileSaved(false);
		const result = await run<{ account: MenuAccountPublic }>("profile", {
			method: "PATCH",
			body: { companySlug, fullName, phone, preferredBranchId: branchId || null },
		});
		if (result.ok) {
			setAccount(result.data.account);
			setProfileSaved(true);
		}
	};

	const handlePasswordSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		const result = await run("password", {
			body: {
				companySlug,
				// En modo recuperación el servidor acepta el cambio sin la anterior,
				// validando la ventana que abrió el canje del enlace.
				...(resetMode && !currentPassword ? {} : { currentPassword }),
				newPassword,
			},
		});
		if (result.ok) {
			setCurrentPassword("");
			setNewPassword("");
			onPasswordChanged();
		}
	};

	const handleLogout = async () => {
		const result = await run("logout");
		if (result.ok) onSignedOut();
	};

	return (
		<div className="account-dashboard">
			<section className="account-card account-card--form">
				<h2 className="account-card-title">{t("dashboard.greeting", { name: account.fullName })}</h2>

				<dl className="account-readonly">
					<div>
						<dt>{t("dashboard.documentLabel")}</dt>
						<dd>{account.documentMasked}</dd>
					</div>
					<div>
						<dt>{t("dashboard.emailLabel")}</dt>
						<dd>{account.email}</dd>
					</div>
				</dl>

				<form className="account-form" onSubmit={handleProfileSubmit}>
					<label className="account-field">
						<span className="account-field-label">{t("dashboard.fullNameLabel")}</span>
						<input
							className="account-input"
							value={fullName}
							onChange={(event) => setFullName(event.target.value)}
							required
						/>
					</label>
					<label className="account-field">
						<span className="account-field-label">{t("dashboard.phoneLabel")}</span>
						<input
							className="account-input"
							value={phone}
							onChange={(event) => setPhone(event.target.value)}
							required
						/>
					</label>
					{branches.length > 0 ? (
						<label className="account-field">
							<span className="account-field-label">
								<MapPin size={13} aria-hidden /> {t("dashboard.branchLabel")}
							</span>
							<select
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
						</label>
					) : null}
					{profileSaved ? <p className="account-success">{t("dashboard.saved")}</p> : null}
					{errorCode ? <p className="account-error">{errorMessage(t, errorCode)}</p> : null}
					<button type="submit" className="account-submit" disabled={pending}>
						{pending ? t("dashboard.saving") : t("dashboard.save")}
					</button>
				</form>
			</section>

			<section className="account-card account-card--form">
				<h3 className="account-section-title">
					<KeyRound size={16} aria-hidden /> {t("dashboard.passwordTitle")}
				</h3>
				{showPasswordForm ? (
					<form className="account-form" onSubmit={handlePasswordSubmit}>
						{!resetMode ? (
							<label className="account-field">
								<span className="account-field-label">{t("dashboard.currentPassword")}</span>
								<input
									className="account-input"
									type="password"
									value={currentPassword}
									onChange={(event) => setCurrentPassword(event.target.value)}
									autoComplete="current-password"
									required
								/>
							</label>
						) : null}
						<label className="account-field">
							<span className="account-field-label">{t("dashboard.newPassword")}</span>
							<input
								className="account-input"
								type="password"
								value={newPassword}
								onChange={(event) => setNewPassword(event.target.value)}
								autoComplete="new-password"
								minLength={8}
								required
							/>
						</label>
						<p className="account-note">{t("dashboard.passwordSharedNote")}</p>
						{errorCode ? <p className="account-error">{errorMessage(t, errorCode)}</p> : null}
						{/* El éxito no se muestra aquí: al cambiar la contraseña se cierra la
						    sesión y el aviso lo da el panel de acceso. */}
						<button type="submit" className="account-submit" disabled={pending}>
							{pending ? t("dashboard.changingPassword") : t("dashboard.changePassword")}
						</button>
					</form>
				) : (
					<button
						type="button"
						className="account-link-button"
						onClick={() => {
							setErrorCode(null);
							setShowPasswordForm(true);
						}}
					>
						{t("dashboard.changePassword")}
					</button>
				)}
			</section>

			<section className="account-card account-card--soon">
				<h3 className="account-section-title">
					<Package size={16} aria-hidden /> {t("dashboard.ordersTitle")}
				</h3>
				<p className="account-card-text">{t("dashboard.ordersSoon")}</p>
				<h3 className="account-section-title">
					<Clock size={16} aria-hidden /> {t("dashboard.addressesTitle")}
				</h3>
				<p className="account-card-text">{t("dashboard.addressesSoon")}</p>
			</section>

			<button
				type="button"
				className="account-logout"
				onClick={handleLogout}
				disabled={pending}
			>
				<LogOut size={16} aria-hidden />
				{pending ? t("dashboard.loggingOut") : t("dashboard.logout")}
			</button>
		</div>
	);
}
