"use client";

import type { ChangeEvent, FormEvent } from "react";
import Image from "next/image";
import clsx from "clsx";
import { Check, Upload } from "lucide-react";
import { useTranslations } from "next-intl";

import type { CountryFormStrategy } from "@/lib/geo/country-forms";
import { shouldUnoptimizeImageSrc } from "@/lib/tenant/images/should-unoptimize-image";
import type { CheckoutFieldValidation, CheckoutFormValues } from "../hooks/use-checkout-form";

export const CART_CLIENT_FORM_ID = "cart-client-form";

export type CartClientFormProps = {
	values: CheckoutFormValues;
	validation: CheckoutFieldValidation;
	showFieldErrors: boolean;
	requiresReceipt: boolean;
	strategy: CountryFormStrategy;
	onInputChange: (field: "name" | "phone" | "rut", value: string) => void;
	onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

/** Datos del cliente. El botón de envío vive en el pie del panel y apunta a este `id`. */
export function CartClientForm({
	values,
	validation,
	showFieldErrors,
	requiresReceipt,
	strategy,
	onInputChange,
	onFileChange,
	onSubmit,
}: CartClientFormProps) {
	const t = useTranslations("tenant.cart.modal");
	const nameError = showFieldErrors && !validation.name;
	const idError = showFieldErrors && !validation.rut;
	const phoneError = showFieldErrors && !validation.phone;
	const receiptError = showFieldErrors && requiresReceipt && !validation.receipt;
	const pending = [
		nameError ? t("validationItems.validName") : null,
		idError ? t("validationItems.validId", { id: strategy.idName }) : null,
		phoneError ? t("validationItems.validPhone", { prefix: strategy.phonePrefix.trim() }) : null,
		receiptError ? t("validationItems.transferReceipt") : null,
	].filter(Boolean);

	return (
		<form id={CART_CLIENT_FORM_ID} className="cart-step cart-form" onSubmit={onSubmit} noValidate>
			<h3 className="cart-step__title">{t("payment.clientData")}</h3>
			{pending.length > 0 ? (
				<p className="cart-warn" role="alert">
					{t("validation.reviewFields")}: {pending.join(", ")}.
				</p>
			) : null}

			<div className="cart-fields">
				<div className="cart-fields__group">
					<label className="cart-label" htmlFor="cart-client-name">
						{t("payment.fields.name")}
					</label>
					<input
						id="cart-client-name"
						type="text"
						className="cart-field"
						value={values.name}
						onChange={(event) => onInputChange("name", event.target.value)}
						placeholder={t("payment.fields.namePlaceholder")}
						autoComplete="name"
						autoCapitalize="words"
						enterKeyHint="next"
						aria-invalid={nameError || undefined}
					/>
				</div>

				<div className="cart-fields__row">
					<div className="cart-fields__group cart-fields__group--grow">
						<label className="cart-label" htmlFor="cart-client-id">
							{strategy.idName}
							{validation.rut ? <Check size={13} className="cart-label__ok" aria-hidden /> : null}
						</label>
						<input
							id="cart-client-id"
							type="text"
							className="cart-field"
							value={values.rut}
							onChange={(event) => onInputChange("rut", event.target.value)}
							placeholder={strategy.idPlaceholder}
							enterKeyHint="next"
							aria-invalid={idError || undefined}
						/>
					</div>
					<div className="cart-fields__group cart-fields__group--grow">
						<label className="cart-label" htmlFor="cart-client-phone">
							{t("payment.fields.phone")}
							{validation.phone ? <Check size={13} className="cart-label__ok" aria-hidden /> : null}
						</label>
						<input
							id="cart-client-phone"
							type="tel"
							className="cart-field"
							value={values.phone}
							onChange={(event) => onInputChange("phone", event.target.value)}
							placeholder={strategy.phonePlaceholder}
							autoComplete="tel"
							enterKeyHint="done"
							aria-invalid={phoneError || undefined}
						/>
					</div>
				</div>

				{requiresReceipt ? (
					<div className="cart-fields__group">
						<span className="cart-label">
							{t("payment.fields.receipt")}
							{validation.receipt ? (
								<Check size={13} className="cart-label__ok" aria-hidden />
							) : (
								<span className="cart-label__required" aria-hidden>
									*
								</span>
							)}
						</span>
						<label className={clsx("cart-upload", values.receiptPreview && "has-preview", receiptError && "is-invalid")}>
							<input
								type="file"
								accept="image/*"
								className="cart-upload__input"
								onChange={onFileChange}
								aria-label={t("payment.fields.uploadReceipt")}
							/>
							{values.receiptPreview ? (
								<>
									<Image
										src={values.receiptPreview}
										alt=""
										width={40}
										height={40}
										className="cart-upload__thumb"
										unoptimized={shouldUnoptimizeImageSrc(values.receiptPreview)}
									/>
									<span>{t("payment.fields.imageLoaded")}</span>
								</>
							) : (
								<>
									<Upload size={18} aria-hidden />
									<span>{t("payment.fields.uploadCapture")}</span>
								</>
							)}
						</label>
					</div>
				) : null}
			</div>
		</form>
	);
}
