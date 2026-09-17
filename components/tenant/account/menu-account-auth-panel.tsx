"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { UserRound } from "lucide-react";

import { getFormStrategy } from "@/lib/geo/country-forms";

import type { MenuAccountBranchOption, MenuAccountPublic, MenuAccountView } from "./menu-account-types";
import { useMenuAccount } from "./use-menu-account";

type MenuAccountAuthPanelProps = {
	companySlug: string;
	countryCode: string;
	branches: MenuAccountBranchOption[];
	/** `linked`: el correo ya tenía cuenta en otro negocio y se vinculó con su contraseña. */
	onAuthenticated: (account: MenuAccountPublic, how: "login" | "created" | "linked") => void;
};

export function MenuAccountAuthPanel({
	companySlug,
	countryCode,
	branches,
	onAuthenticated,
}: MenuAccountAuthPanelProps) {
	const t = useTranslations("tenant.account");
	const strategy = useMemo(() => getFormStrategy(countryCode), [countryCode]);

	const { view, setView, pending, errorCode, setErrorCode, run } = useMenuAccount("login");

	const [document, setDocument] = useState("");
	const [password, setPassword] = useState("");
	const [email, setEmail] = useState("");
	const [fullName, setFullName] = useState("");
	const [phone, setPhone] = useState(strategy.phonePrefix);
	const [branchId, setBranchId] = useState("");

	const shownError = errorCode;

	/** El formato del documento es por país: RUT, Cédula/RIF o Cédula. */
	const handleDocumentChange = (value: string) => {
		setDocument(strategy.formatId ? strategy.formatId(value) : value);
	};

	const switchView = (next: MenuAccountView) => {
		setErrorCode(null);
		setView(next);
	};

	const handleLogin = async (event: React.FormEvent) => {
		event.preventDefault();
		const result = await run<{ account: MenuAccountPublic }>("login", {
			body: { companySlug, document, password },
		});
		if (result.ok) onAuthenticated(result.data.account, "login");
	};

	const handleRegister = async (event: React.FormEvent) => {
		event.preventDefault();
		const result = await run<{ status: "created" | "linked"; account: MenuAccountPublic }>("register", {
			body: {
				companySlug,
				document,
				email,
				password,
				fullName,
				phone,
				preferredBranchId: branchId || null,
			},
		});
		if (result.ok) onAuthenticated(result.data.account, result.data.status);
	};

	return (
		<div className="account-card account-card--form">
			<span className="account-card-glyph" aria-hidden>
				<UserRound size={28} strokeWidth={1.8} />
			</span>

			<div className="account-tabs" role="tablist">
				<button
					type="button"
					role="tab"
					aria-selected={view === "login"}
					className={`account-tab ${view === "login" ? "is-active" : ""}`}
					onClick={() => switchView("login")}
				>
					{t("tabs.login")}
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={view === "register"}
					className={`account-tab ${view === "register" ? "is-active" : ""}`}
					onClick={() => switchView("register")}
				>
					{t("tabs.register")}
				</button>
			</div>

			{view === "login" ? (
				<form className="account-form" onSubmit={handleLogin}>
					<label className="account-field">
						<span className="account-field-label">{t("login.documentLabel")}</span>
						<input
							className="account-input"
							value={document}
							onChange={(event) => handleDocumentChange(event.target.value)}
							placeholder={strategy.idPlaceholder}
							autoComplete="username"
							required
						/>
					</label>
					<label className="account-field">
						<span className="account-field-label">{t("login.passwordLabel")}</span>
						<input
							className="account-input"
							type="password"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							autoComplete="current-password"
							required
						/>
					</label>
					{shownError ? <p className="account-error">{errorMessage(t, shownError)}</p> : null}
					<button type="submit" className="account-submit" disabled={pending}>
						{pending ? t("login.submitting") : t("login.submit")}
					</button>
					{/* Sin correo no hay recuperación autoservicio: la resetea el negocio. */}
					<p className="account-note">{t("login.forgotHint")}</p>
				</form>
			) : (
				<form className="account-form" onSubmit={handleRegister}>
					<p className="account-card-text">{t("register.intro")}</p>
					<label className="account-field">
						<span className="account-field-label">{t("register.documentLabel")}</span>
						<input
							className="account-input"
							value={document}
							onChange={(event) => handleDocumentChange(event.target.value)}
							placeholder={strategy.idPlaceholder}
							autoComplete="off"
							required
						/>
					</label>
					<label className="account-field">
						<span className="account-field-label">{t("register.fullNameLabel")}</span>
						<input
							className="account-input"
							value={fullName}
							onChange={(event) => setFullName(event.target.value)}
							autoComplete="name"
							required
						/>
					</label>
					<label className="account-field">
						<span className="account-field-label">{t("register.emailLabel")}</span>
						<input
							className="account-input"
							type="email"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							autoComplete="email"
							required
						/>
					</label>
					<label className="account-field">
						<span className="account-field-label">{t("register.phoneLabel")}</span>
						<input
							className="account-input"
							value={phone}
							onChange={(event) => setPhone(strategy.normalizePhone(event.target.value))}
							placeholder={strategy.phonePlaceholder}
							autoComplete="tel"
							required
						/>
					</label>
					<label className="account-field">
						<span className="account-field-label">{t("register.passwordLabel")}</span>
						<input
							className="account-input"
							type="password"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							autoComplete="new-password"
							minLength={8}
							required
						/>
						<span className="account-field-hint">{t("register.passwordHint")}</span>
						<span className="account-field-hint">{t("register.existingEmailHint")}</span>
					</label>
					{branches.length > 0 ? (
						<label className="account-field">
							<span className="account-field-label">{t("register.branchLabel")}</span>
							<select
								className="account-input"
								value={branchId}
								onChange={(event) => setBranchId(event.target.value)}
							>
								<option value="">{t("register.branchPlaceholder")}</option>
								{branches.map((branch) => (
									<option key={branch.id} value={branch.id}>
										{branch.name}
									</option>
								))}
							</select>
						</label>
					) : null}
					{shownError ? <p className="account-error">{errorMessage(t, shownError)}</p> : null}
					<button type="submit" className="account-submit" disabled={pending}>
						{pending ? t("register.submitting") : t("register.submit")}
					</button>
				</form>
			)}
		</div>
	);
}

/** Traduce el código de error del servidor; cae en el genérico si no lo conoce. */
export function errorMessage(t: ReturnType<typeof useTranslations>, code: string): string {
	const known = [
		"company_not_found",
		"invalid_document",
		"blocked_document",
		"invalid_branch",
		"document_taken",
		"already_registered",
		"email_belongs_to_staff",
		"email_unavailable",
		"invalid_credentials",
		"unauthorized",
		"link_password_mismatch",
		"address_limit",
		"invalid_zone",
		"invalid_address",
		"delivery_unavailable",
		"weak_password",
		"validation_error",
		"network",
		"rate_limited",
	];
	return known.includes(code) ? t(`errors.${code}`) : t("errors.internal");
}
