"use client";

import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import type { CountryFormStrategy } from "@/lib/geo/country-forms";

/* -------------------------------------------------------------------------- */
/* Reglas de validación: las mismas que "Tus datos" del carrito, para que un   */
/* dato que vale al pedir valga al registrarse y viceversa.                    */
/* -------------------------------------------------------------------------- */

export type AccountFieldKey = "document" | "email" | "name" | "phone" | "password";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const accountFieldRules = {
	document: (strategy: CountryFormStrategy, value: string) => strategy.validateId(value.trim()),
	email: (value: string) => EMAIL_PATTERN.test(value.trim()) && value.trim().length <= 160,
	name: (value: string) => {
		const name = value.trim();
		return name.length > 2 && name.length <= 80 && /^[\p{L} .'-]+$/u.test(name);
	},
	phone: (strategy: CountryFormStrategy, value: string) => strategy.validatePhone(value),
	/** 8–72: el tope es el de bcrypt, que Supabase trunca en silencio. */
	password: (value: string) => value.length >= 8 && value.length <= 72,
};

/* -------------------------------------------------------------------------- */
/* Campo con etiqueta, ayuda y error accesible.                                */
/* -------------------------------------------------------------------------- */

export type AccountFieldProps = {
	label: string;
	/** Texto de error; solo se pinta cuando `showError` es true. */
	error?: string | null;
	showError?: boolean;
	hint?: ReactNode;
	children: (props: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
};

export function AccountField({ label, error, showError = false, hint, children }: AccountFieldProps) {
	const id = useId();
	const invalid = Boolean(showError && error);
	const errorId = `${id}-error`;
	const hintId = `${id}-hint`;
	const describedBy = [invalid ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;
	return (
		<div className="account-field">
			<label className="account-field-label" htmlFor={id}>
				{label}
			</label>
			{children({ id, describedBy, invalid })}
			{invalid ? (
				<span id={errorId} className="account-field-error" role="alert">
					{error}
				</span>
			) : null}
			{hint ? (
				<span id={hintId} className="account-field-hint">
					{hint}
				</span>
			) : null}
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/* Contraseña con botón de ver/ocultar.                                         */
/* -------------------------------------------------------------------------- */

export function AccountPasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
	const t = useTranslations("tenant.account.password");
	const [visible, setVisible] = useState(false);
	return (
		<div className="account-password">
			<input {...props} type={visible ? "text" : "password"} className={`account-input ${props.className ?? ""}`} />
			<button
				type="button"
				className="account-password__toggle"
				onClick={() => setVisible((open) => !open)}
				aria-label={visible ? t("hide") : t("show")}
				aria-pressed={visible}
				tabIndex={-1}
			>
				{visible ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
			</button>
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/* Texto de un botón mientras trabaja: spinner + etiqueta.                     */
/* -------------------------------------------------------------------------- */

export function AccountBusyLabel({ busy, idle, working }: { busy: boolean; idle: ReactNode; working: ReactNode }) {
	if (!busy) return <>{idle}</>;
	return (
		<>
			<Loader2 className="account-spin" size={16} aria-hidden />
			<span>{working}</span>
		</>
	);
}
