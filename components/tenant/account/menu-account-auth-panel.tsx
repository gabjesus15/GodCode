"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { UserRound } from "lucide-react";

import { getFormStrategy } from "@/lib/geo/country-forms";

import { AccountBusyLabel, AccountField, AccountPasswordInput, accountFieldRules } from "./account-fields";
import type { MenuAccountBranchOption, MenuAccountPublic, MenuAccountView } from "./menu-account-types";
import { useMenuAccount } from "./use-menu-account";
import { useResendCooldown } from "./use-resend-cooldown";

type MenuAccountAuthPanelProps = {
	companySlug: string;
	countryCode: string;
	branches: MenuAccountBranchOption[];
	/** `linked`: el correo ya tenía cuenta en otro negocio y se vinculó con su contraseña. */
	onAuthenticated: (account: MenuAccountPublic, how: "login" | "created" | "linked") => void;
	/** La contraseña se cambió con el código de recuperación; toca entrar con la nueva. */
	onPasswordReset: () => void;
};

type RegisterResponse =
	| { status: "verification_required" }
	| { status: "linked"; account: MenuAccountPublic };

const CODE_LENGTH = 6;

export function MenuAccountAuthPanel({
	companySlug,
	countryCode,
	branches,
	onAuthenticated,
	onPasswordReset,
}: MenuAccountAuthPanelProps) {
	const t = useTranslations("tenant.account");
	const strategy = useMemo(() => getFormStrategy(countryCode), [countryCode]);

	const { view, setView, pending, errorCode, setErrorCode, run } = useMenuAccount("login");
	const cooldown = useResendCooldown();

	const [document, setDocument] = useState("");
	const [password, setPassword] = useState("");
	const [email, setEmail] = useState("");
	const [fullName, setFullName] = useState("");
	const [phone, setPhone] = useState(strategy.phonePrefix);
	const [branchId, setBranchId] = useState("");
	const [code, setCode] = useState("");
	/** Desde dónde se llegó a confirmar el correo: decide el aviso tras entrar. */
	const [verifyOrigin, setVerifyOrigin] = useState<"login" | "created">("created");
	const [codeResent, setCodeResent] = useState(false);
	/* Los errores por campo solo aparecen tras el primer intento de enviar: mientras
	   se escribe no hay que regañar. Se recuerda por vista. */
	const [attempted, setAttempted] = useState<MenuAccountView | null>(null);
	const showFieldErrors = attempted === view;

	const shownError = errorCode;
	const showTabs = view === "login" || view === "register";

	/* Validación por campo, con las mismas reglas que "Tus datos" del carrito. */
	const fieldErrors = {
		document: accountFieldRules.document(strategy, document) ? null : t("fields.document", { idName: strategy.idName }),
		email: accountFieldRules.email(email) ? null : t("fields.email"),
		name: accountFieldRules.name(fullName) ? null : t("fields.name"),
		phone: accountFieldRules.phone(strategy, phone) ? null : t("fields.phone"),
		password: accountFieldRules.password(password) ? null : t("fields.password"),
	};
	const loginReady = !fieldErrors.document && password.length > 0;
	const registerReady = !fieldErrors.document && !fieldErrors.email && !fieldErrors.name && !fieldErrors.phone && !fieldErrors.password;
	const codeReady = code.length === CODE_LENGTH;

	/** El formato del documento es por país: RUT, Cédula/RIF o Cédula. */
	const handleDocumentChange = (value: string) => {
		setDocument(strategy.formatId ? strategy.formatId(value) : value);
	};

	const switchView = (next: MenuAccountView) => {
		setErrorCode(null);
		setCode("");
		setCodeResent(false);
		setAttempted(null);
		setView(next);
	};

	const handleLogin = async (event: FormEvent) => {
		event.preventDefault();
		if (!loginReady) {
			setAttempted("login");
			return;
		}
		const result = await run<{ account: MenuAccountPublic }>("login", {
			body: { companySlug, document, password },
		});
		if (result.ok) {
			onAuthenticated(result.data.account, "login");
		} else if (result.code === "email_not_verified") {
			// El servidor ya mandó un código nuevo al acertar la contraseña.
			setVerifyOrigin("login");
			switchView("verify");
			cooldown.start();
		}
	};

	const handleRegister = async (event: FormEvent) => {
		event.preventDefault();
		if (!registerReady) {
			setAttempted("register");
			return;
		}
		const result = await run<RegisterResponse>("register", {
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
		if (result.data.status === "linked") {
			onAuthenticated(result.data.account, "linked");
			return;
		}
		setVerifyOrigin("created");
		switchView("verify");
		cooldown.start();
	};

	const submitVerify = async () => {
		if (!codeReady || pending) return;
		const result = await run<{ account: MenuAccountPublic }>("verify", {
			body: { companySlug, document, code },
		});
		if (result.ok) onAuthenticated(result.data.account, verifyOrigin);
	};

	const handleVerify = async (event: FormEvent) => {
		event.preventDefault();
		if (!codeReady) {
			setAttempted("verify");
			return;
		}
		await submitVerify();
	};

	const handleResendCode = async () => {
		if (cooldown.active) return;
		setCodeResent(false);
		const result = await run("verify/resend", { body: { companySlug, document } });
		if (result.ok) {
			setCodeResent(true);
			cooldown.start();
		}
	};

	const handleRecoverRequest = async (event: FormEvent) => {
		event.preventDefault();
		if (fieldErrors.document) {
			setAttempted("recover");
			return;
		}
		const result = await run("recover", { body: { companySlug, document } });
		if (result.ok) {
			switchView("recover-code");
			cooldown.start();
		}
	};

	const handleRecoverConfirm = async (event: FormEvent) => {
		event.preventDefault();
		if (!codeReady || fieldErrors.password) {
			setAttempted("recover-code");
			return;
		}
		const result = await run("recover/confirm", {
			body: { companySlug, document, code, newPassword: password },
		});
		if (result.ok) {
			setPassword("");
			switchView("login");
			onPasswordReset();
		}
	};

	/* Al escribir el sexto dígito de la confirmación se envía solo: en el teléfono
	   ahorra el toque en "Confirmar" justo cuando el teclado tapa el botón. */
	const autoSubmittedRef = useRef<string | null>(null);
	useEffect(() => {
		if (view !== "verify" || !codeReady || autoSubmittedRef.current === code) return;
		autoSubmittedRef.current = code;
		void submitVerify();
		// submitVerify cambia en cada render; solo importa reaccionar al código completo.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [code, codeReady, view]);

	const codeField = (
		<AccountField label={t("code.label")} error={codeReady ? null : t("fields.code")} showError={showFieldErrors}>
			{({ id, describedBy, invalid }) => (
				<input
					id={id}
					className="account-input account-input--code"
					value={code}
					onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH))}
					inputMode="numeric"
					autoComplete="one-time-code"
					placeholder="000000"
					aria-describedby={describedBy}
					aria-invalid={invalid || undefined}
					autoFocus
				/>
			)}
		</AccountField>
	);

	const documentField = (autoComplete: string) => (
		<AccountField label={t("login.documentLabel")} error={fieldErrors.document} showError={showFieldErrors}>
			{({ id, describedBy, invalid }) => (
				<input
					id={id}
					className="account-input"
					value={document}
					onChange={(event) => handleDocumentChange(event.target.value)}
					placeholder={strategy.idPlaceholder}
					autoComplete={autoComplete}
					aria-describedby={describedBy}
					aria-invalid={invalid || undefined}
					enterKeyHint="next"
				/>
			)}
		</AccountField>
	);

	const resendButton = (
		<button
			type="button"
			className="account-link-button"
			onClick={handleResendCode}
			disabled={pending || cooldown.active}
		>
			{cooldown.active ? t("code.resendIn", { seconds: cooldown.remaining }) : t("code.resend")}
		</button>
	);

	return (
		<div className="account-card account-card--form">
			<span className="account-card-glyph" aria-hidden>
				<UserRound size={28} strokeWidth={1.8} />
			</span>

			{showTabs ? (
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
			) : null}

			{/* `key={view}`: cada vista entra con su animación al cambiar. */}
			<div className="account-view" key={view}>
				{view === "verify" ? (
					<form className="account-form" onSubmit={handleVerify} noValidate>
						<p className="account-card-text">{t("verify.intro")}</p>
						{codeField}
						{shownError ? <p className="account-error" role="alert">{errorMessage(t, shownError)}</p> : null}
						{codeResent ? <p className="account-note" role="status">{t("code.resent")}</p> : null}
						<button type="submit" className="account-submit" disabled={pending}>
							<AccountBusyLabel busy={pending} idle={t("verify.submit")} working={t("verify.submitting")} />
						</button>
						{resendButton}
						<button type="button" className="account-link-button" onClick={() => switchView("login")}>
							{t("code.back")}
						</button>
					</form>
				) : null}

				{view === "recover" ? (
					<form className="account-form" onSubmit={handleRecoverRequest} noValidate>
						<p className="account-card-text">{t("recover.intro")}</p>
						{documentField("username")}
						{shownError ? <p className="account-error" role="alert">{errorMessage(t, shownError)}</p> : null}
						<button type="submit" className="account-submit" disabled={pending}>
							<AccountBusyLabel busy={pending} idle={t("recover.send")} working={t("recover.sending")} />
						</button>
						<button type="button" className="account-link-button" onClick={() => switchView("login")}>
							{t("code.back")}
						</button>
					</form>
				) : null}

				{view === "recover-code" ? (
					<form className="account-form" onSubmit={handleRecoverConfirm} noValidate>
						<p className="account-card-text">{t("recover.codeIntro")}</p>
						{codeField}
						<AccountField
							label={t("dashboard.newPassword")}
							error={fieldErrors.password}
							showError={showFieldErrors}
							hint={t("register.passwordHint")}
						>
							{({ id, describedBy, invalid }) => (
								<AccountPasswordInput
									id={id}
									value={password}
									onChange={(event) => setPassword(event.target.value)}
									autoComplete="new-password"
									aria-describedby={describedBy}
									aria-invalid={invalid || undefined}
								/>
							)}
						</AccountField>
						{shownError ? <p className="account-error" role="alert">{errorMessage(t, shownError)}</p> : null}
						<button type="submit" className="account-submit" disabled={pending}>
							<AccountBusyLabel busy={pending} idle={t("recover.confirm")} working={t("recover.confirming")} />
						</button>
						<button
							type="button"
							className="account-link-button"
							onClick={() => switchView("recover")}
							disabled={cooldown.active}
						>
							{cooldown.active ? t("code.resendIn", { seconds: cooldown.remaining }) : t("code.resend")}
						</button>
					</form>
				) : null}

				{view === "login" ? (
					<form className="account-form" onSubmit={handleLogin} noValidate>
						{documentField("username")}
						<AccountField
							label={t("login.passwordLabel")}
							error={password.length > 0 ? null : t("fields.password")}
							showError={showFieldErrors}
						>
							{({ id, describedBy, invalid }) => (
								<AccountPasswordInput
									id={id}
									value={password}
									onChange={(event) => setPassword(event.target.value)}
									autoComplete="current-password"
									aria-describedby={describedBy}
									aria-invalid={invalid || undefined}
									enterKeyHint="go"
								/>
							)}
						</AccountField>
						{shownError ? <p className="account-error" role="alert">{errorMessage(t, shownError)}</p> : null}
						<button type="submit" className="account-submit" disabled={pending}>
							<AccountBusyLabel busy={pending} idle={t("login.submit")} working={t("login.submitting")} />
						</button>
						<button type="button" className="account-link-button" onClick={() => switchView("recover")}>
							{t("login.forgot")}
						</button>
					</form>
				) : null}

				{view === "register" ? (
					<form className="account-form" onSubmit={handleRegister} noValidate>
						<p className="account-card-text">{t("register.intro")}</p>
						{documentField("off")}
						<AccountField label={t("register.fullNameLabel")} error={fieldErrors.name} showError={showFieldErrors}>
							{({ id, describedBy, invalid }) => (
								<input
									id={id}
									className="account-input"
									value={fullName}
									onChange={(event) => setFullName(event.target.value)}
									autoComplete="name"
									aria-describedby={describedBy}
									aria-invalid={invalid || undefined}
									enterKeyHint="next"
								/>
							)}
						</AccountField>
						<AccountField label={t("register.emailLabel")} error={fieldErrors.email} showError={showFieldErrors}>
							{({ id, describedBy, invalid }) => (
								<input
									id={id}
									className="account-input"
									type="email"
									value={email}
									onChange={(event) => setEmail(event.target.value)}
									autoComplete="email"
									inputMode="email"
									autoCapitalize="none"
									aria-describedby={describedBy}
									aria-invalid={invalid || undefined}
									enterKeyHint="next"
								/>
							)}
						</AccountField>
						<AccountField label={t("register.phoneLabel")} error={fieldErrors.phone} showError={showFieldErrors}>
							{({ id, describedBy, invalid }) => (
								<input
									id={id}
									className="account-input"
									value={phone}
									onChange={(event) => setPhone(strategy.normalizePhone(event.target.value))}
									placeholder={strategy.phonePlaceholder}
									autoComplete="tel"
									inputMode="tel"
									aria-describedby={describedBy}
									aria-invalid={invalid || undefined}
									enterKeyHint="next"
								/>
							)}
						</AccountField>
						<AccountField
							label={t("register.passwordLabel")}
							error={fieldErrors.password}
							showError={showFieldErrors}
							hint={
								<>
									{t("register.passwordHint")} {t("register.existingEmailHint")}
								</>
							}
						>
							{({ id, describedBy, invalid }) => (
								<AccountPasswordInput
									id={id}
									value={password}
									onChange={(event) => setPassword(event.target.value)}
									autoComplete="new-password"
									aria-describedby={describedBy}
									aria-invalid={invalid || undefined}
								/>
							)}
						</AccountField>
						{branches.length > 1 ? (
							<AccountField label={t("register.branchLabel")}>
								{({ id }) => (
									<select id={id} className="account-input" value={branchId} onChange={(event) => setBranchId(event.target.value)}>
										<option value="">{t("register.branchPlaceholder")}</option>
										{branches.map((branch) => (
											<option key={branch.id} value={branch.id}>
												{branch.name}
											</option>
										))}
									</select>
								)}
							</AccountField>
						) : null}
						{shownError ? <p className="account-error" role="alert">{errorMessage(t, shownError)}</p> : null}
						<button type="submit" className="account-submit" disabled={pending}>
							<AccountBusyLabel busy={pending} idle={t("register.submit")} working={t("register.submitting")} />
						</button>
					</form>
				) : null}
			</div>
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
		"email_not_verified",
		"invalid_code",
		"validation_error",
		"network",
		"rate_limited",
	];
	return known.includes(code) ? t(`errors.${code}`) : t("errors.internal");
}
