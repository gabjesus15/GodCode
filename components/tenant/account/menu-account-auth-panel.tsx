"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { MailCheck, UserRound } from "lucide-react";

import { getFormStrategy } from "@/lib/geo/country-forms";

import type { MenuAccountBranchOption, MenuAccountPublic, MenuAccountView } from "./menu-account-types";
import { useMenuAccount } from "./use-menu-account";

type MenuAccountAuthPanelProps = {
	companySlug: string;
	countryCode: string;
	branches: MenuAccountBranchOption[];
	initialView: MenuAccountView;
	initialErrorCode: string | null;
	onAuthenticated: (account: MenuAccountPublic) => void;
};

export function MenuAccountAuthPanel({
	companySlug,
	countryCode,
	branches,
	initialView,
	initialErrorCode,
	onAuthenticated,
}: MenuAccountAuthPanelProps) {
	const t = useTranslations("tenant.account");
	const strategy = useMemo(() => getFormStrategy(countryCode), [countryCode]);

	const { view, setView, pending, errorCode, setErrorCode, run } = useMenuAccount(initialView);
	const [initialError, setInitialError] = useState<string | null>(initialErrorCode);

	const [document, setDocument] = useState("");
	const [password, setPassword] = useState("");
	const [email, setEmail] = useState("");
	const [fullName, setFullName] = useState("");
	const [phone, setPhone] = useState(strategy.phonePrefix);
	const [branchId, setBranchId] = useState("");

	const shownError = errorCode ?? initialError;

	/** El formato del documento es por país: RUT, Cédula/RIF o Cédula. */
	const handleDocumentChange = (value: string) => {
		setDocument(strategy.formatId ? strategy.formatId(value) : value);
	};

	const switchView = (next: MenuAccountView) => {
		setErrorCode(null);
		setInitialError(null);
		setView(next);
	};

	const handleLogin = async (event: React.FormEvent) => {
		event.preventDefault();
		setInitialError(null);
		const result = await run<{ account: MenuAccountPublic }>("login", {
			body: { companySlug, document, password },
		});
		if (result.ok) onAuthenticated(result.data.account);
	};

	const handleRegister = async (event: React.FormEvent) => {
		event.preventDefault();
		setInitialError(null);
		const result = await run<{ status: string; account?: MenuAccountPublic }>("register", {
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
		if (!result.ok) return;
		// El correo ya tenía cuenta: se vincula por correo, no aquí.
		if (result.data.status === "link_email_sent") {
			setView("link-sent");
			return;
		}
		if (result.data.account) onAuthenticated(result.data.account);
	};

	const handleRecover = async (event: React.FormEvent) => {
		event.preventDefault();
		setInitialError(null);
		const result = await run("recover", { body: { companySlug, document } });
		// Respuesta siempre igual, exista o no la cuenta.
		if (result.ok) setView("recover-sent");
	};

	if (view === "link-sent" || view === "recover-sent") {
		const isLink = view === "link-sent";
		return (
			<div className="account-card">
				<span className="account-card-glyph" aria-hidden>
					<MailCheck size={30} strokeWidth={1.8} />
				</span>
				<h2 className="account-card-title">
					{isLink ? t("linkSent.title") : t("recover.sentTitle")}
				</h2>
				<p className="account-card-text">
					{isLink ? t("linkSent.description") : t("recover.sentDescription")}
				</p>
				{isLink ? <p className="account-note">{t("linkSent.note")}</p> : null}
				<button type="button" className="account-link-button" onClick={() => switchView("login")}>
					{t("recover.back")}
				</button>
			</div>
		);
	}

	if (view === "recover") {
		return (
			<div className="account-card">
				<h2 className="account-card-title">{t("recover.title")}</h2>
				<p className="account-card-text">{t("recover.description")}</p>
				<form className="account-form" onSubmit={handleRecover}>
					<label className="account-field">
						<span className="account-field-label">{t("recover.documentLabel")}</span>
						<input
							className="account-input"
							value={document}
							onChange={(event) => handleDocumentChange(event.target.value)}
							placeholder={strategy.idPlaceholder}
							autoComplete="off"
							required
						/>
					</label>
					{shownError ? <p className="account-error">{errorMessage(t, shownError)}</p> : null}
					<button type="submit" className="account-submit" disabled={pending}>
						{pending ? t("recover.submitting") : t("recover.submit")}
					</button>
				</form>
				<button type="button" className="account-link-button" onClick={() => switchView("login")}>
					{t("recover.back")}
				</button>
			</div>
		);
	}

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
					<button
						type="button"
						className="account-link-button"
						onClick={() => switchView("recover")}
					>
						{t("login.forgot")}
					</button>
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
		"link_invalid",
		"reset_required",
		"weak_password",
		"validation_error",
		"network",
	];
	return known.includes(code) ? t(`errors.${code}`) : t("errors.internal");
}
