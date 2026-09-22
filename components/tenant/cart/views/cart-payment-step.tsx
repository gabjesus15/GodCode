"use client";

import type { ChangeEvent, CSSProperties, FormEvent, MouseEvent } from "react";
import { ArrowLeft, ChevronRight, Store } from "lucide-react";
import { useTranslations } from "next-intl";

import type { CountryFormStrategy } from "@/lib/geo/country-forms";
import type { ActiveSessionInfo } from "../cart-modal-types";
import { PAYMENT_METHOD_CONFIG, resolvePaymentMethodLabel } from "../constants";
import type { CheckoutFieldValidation, CheckoutFormValues } from "../hooks/use-checkout-form";
import { paymentMethodRequiresReceipt } from "../services/menu-order-payment";
import { CART_CLIENT_FORM_ID, CartClientForm } from "./cart-client-form";
import { CartMoney } from "./cart-money";
import { CartOnlinePaymentDetails } from "./cart-online-payment-details";

export type PaymentStage = "pick" | "detail" | "form";

export function resolvePaymentStage(paymentMethodKey: string | null, showForm: boolean): PaymentStage {
	if (!paymentMethodKey) return "pick";
	return showForm ? "form" : "detail";
}

export function isOnlinePaymentMethod(key: string | null): boolean {
	return Boolean(key && PAYMENT_METHOD_CONFIG[key]?.isOnline);
}

export type CartPaymentBodyProps = {
	methods: string[];
	paymentMethodKey: string | null;
	receiptRequiredMethods: ReadonlySet<string> | null;
	stage: PaymentStage;
	onPickMethod: (key: string) => void;
	activeInfo: ActiveSessionInfo;
	strategy: CountryFormStrategy;
	cartTotal: number;
	form: {
		values: CheckoutFormValues;
		validation: CheckoutFieldValidation;
		showFieldErrors: boolean;
		onInputChange: (field: "name" | "phone" | "rut", value: string) => void;
		onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
		onSubmit: (event: FormEvent<HTMLFormElement>) => void;
	};
};

export function CartPaymentBody({
	methods,
	paymentMethodKey,
	receiptRequiredMethods,
	stage,
	onPickMethod,
	activeInfo,
	strategy,
	cartTotal,
	form,
}: CartPaymentBodyProps) {
	const t = useTranslations("tenant.cart.modal");

	if (stage === "form" && paymentMethodKey) {
		return (
			<CartClientForm
				values={form.values}
				validation={form.validation}
				showFieldErrors={form.showFieldErrors}
				requiresReceipt={paymentMethodRequiresReceipt(paymentMethodKey, receiptRequiredMethods)}
				strategy={strategy}
				onInputChange={form.onInputChange}
				onFileChange={form.onFileChange}
				onSubmit={form.onSubmit}
			/>
		);
	}

	if (stage === "detail" && paymentMethodKey) {
		if (isOnlinePaymentMethod(paymentMethodKey)) {
			return (
				<CartOnlinePaymentDetails
					methodKey={paymentMethodKey}
					cartTotal={cartTotal}
					activeInfo={activeInfo}
				/>
			);
		}
		return (
			<section className="cart-step cart-store-pay">
				<span className="cart-store-pay__icon" aria-hidden>
					<Store size={24} />
				</span>
				<h3 className="cart-step__title">{resolvePaymentMethodLabel(paymentMethodKey, t)}</h3>
				<p className="cart-hint">{t("payment.payInStoreHelp")}</p>
				<p className="cart-store-pay__total">
					<span>{t("summary.total")}</span>
					<CartMoney amount={cartTotal} dual />
				</p>
			</section>
		);
	}

	return (
		<section className="cart-step">
			<h3 className="cart-step__title">{t("payment.title")}</h3>
			{methods.length === 0 ? (
				<p className="cart-hint">{t("payment.noMethodsForFulfillment")}</p>
			) : (
				<ul className="cart-methods">
					{methods.map((key) => {
						const config = PAYMENT_METHOD_CONFIG[key];
						if (!config) return null;
						const Icon = config.icon;
						const tileStyle = { "--method-color": config.color } as CSSProperties;
						const hint = !config.isOnline
							? t("payment.hints.presential")
							: paymentMethodRequiresReceipt(key, receiptRequiredMethods)
								? t("payment.hints.receipt")
								: t("payment.hints.online");
						return (
							<li key={key}>
								<button type="button" className="cart-method" onClick={() => onPickMethod(key)}>
									<span className="cart-method__icon" style={tileStyle} aria-hidden>
										{Icon ? <Icon size={22} strokeWidth={1.75} /> : <span className="cart-method__mark">{config.mark}</span>}
									</span>
									<span className="cart-method__text">
										<span className="cart-method__name">{resolvePaymentMethodLabel(key, t)}</span>
										<span className="cart-method__hint">{hint}</span>
									</span>
									<ChevronRight size={16} className="cart-method__chevron" aria-hidden />
								</button>
							</li>
						);
					})}
				</ul>
			)}
		</section>
	);
}

export type CartPaymentFootProps = {
	stage: PaymentStage;
	isOnline: boolean;
	/** El método no tiene pantalla de datos: desde el formulario se vuelve a la lista. */
	skipDetail: boolean;
	isSaving: boolean;
	isPaused: boolean;
	formReady: boolean;
	onContinueToForm: () => void;
	onChooseAnother: () => void;
	onBackFromForm: () => void;
	onCancel: () => void;
	onSubmitAttempt: (event: MouseEvent<HTMLButtonElement>) => void;
};

export function CartPaymentFoot({
	stage,
	isOnline,
	skipDetail,
	isSaving,
	isPaused,
	onContinueToForm,
	onChooseAnother,
	onBackFromForm,
	onCancel,
	onSubmitAttempt,
}: CartPaymentFootProps) {
	const t = useTranslations("tenant.cart.modal");

	if (stage === "form") {
		return (
			<>
				<button
					type="submit"
					form={CART_CLIENT_FORM_ID}
					className="cart-cta"
					disabled={isSaving || isPaused}
					aria-busy={isSaving || undefined}
					onClick={onSubmitAttempt}
				>
					{isSaving ? t("actions.sending") : isPaused ? t("intake.paused") : t("actions.confirmOrder")}
				</button>
				<button type="button" className="cart-link-btn cart-link-btn--back" onClick={onBackFromForm}>
					<ArrowLeft size={15} aria-hidden />
					<span>{skipDetail ? t("actions.chooseAnotherMethod") : t("actions.back")}</span>
				</button>
			</>
		);
	}

	if (stage === "detail") {
		return (
			<>
				<button type="button" className="cart-cta" disabled={isPaused} onClick={onContinueToForm}>
					{isPaused ? t("intake.paused") : isOnline ? t("actions.alreadyPaid") : t("actions.continue")}
				</button>
				<button type="button" className="cart-link-btn cart-link-btn--back" onClick={onChooseAnother}>
					<ArrowLeft size={15} aria-hidden />
					<span>{t("actions.chooseAnotherMethod")}</span>
				</button>
			</>
		);
	}

	return (
		<button type="button" className="cart-link-btn cart-link-btn--back" onClick={onCancel}>
			<ArrowLeft size={15} aria-hidden />
			<span>{t("actions.backToDelivery")}</span>
		</button>
	);
}
