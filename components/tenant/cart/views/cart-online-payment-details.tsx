"use client";

import { useState } from "react";
import clsx from "clsx";
import { useTranslations } from "next-intl";

import { BRANCH_PAYMENT_PUBLIC_FIELDS } from "@/lib/payments/branch-payment-config";

import type { ActiveSessionInfo, BranchInfo } from "../cart-modal-types";
import { resolvePaymentMethodLabel } from "../constants";
import { useCart } from "../use-cart";
import {
	isVenezuelaCountry,
	resolvePaymentAmountCopyValue,
	resolvePaymentAmountDisplay,
} from "../utils/venezuela-payment-copy";

type TransferenciaBancariaConfig = NonNullable<BranchInfo["transferencia_bancaria"]>;
type PagoMovilConfig = NonNullable<BranchInfo["pago_movil"]>;
type ZelleConfig = NonNullable<BranchInfo["zelle"]>;

interface PaymentDetailField {
	key: string;
	label: string;
	value: string;
}

function copyToClipboard(text: string): void {
	if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
		navigator.clipboard.writeText(text).catch(() => {});
	}
}

/** Datos de cobro del método online elegido, cada uno copiable por separado o todos juntos. */
export function CartOnlinePaymentDetails({
	methodKey,
	cartTotal,
	activeInfo,
}: {
	methodKey: string;
	cartTotal: number;
	activeInfo: ActiveSessionInfo;
}) {
	const { currency, exchangeRate, country } = useCart();
	const t = useTranslations("tenant.cart.modal");
	const [copiedKey, setCopiedKey] = useState<string | null>(null);

	let methodData: unknown = activeInfo[methodKey as keyof ActiveSessionInfo];
	if (typeof methodData === "string") {
		try {
			methodData = JSON.parse(methodData) as unknown;
		} catch {
			methodData = null;
		}
	}

	const renderEmpty = (message: string) => (
		<section className="cart-step cart-bank" key={methodKey}>
			<h3 className="cart-step__title">{t("payment.detailsTitle")}</h3>
			<p className="cart-hint">{message}</p>
		</section>
	);

	if (!methodData || typeof methodData !== "object") {
		return renderEmpty(`${t("payment.noDataConfiguredFor")} ${resolvePaymentMethodLabel(methodKey, t)}.`);
	}

	if (methodKey === "transferencia_bancaria") {
		const data = methodData as TransferenciaBancariaConfig;
		if (!data.banco && !data.nro_cuenta && !data.identificacion) {
			return renderEmpty(t("payment.noBankData"));
		}
	}
	if (methodKey === "pago_movil") {
		const data = methodData as PagoMovilConfig;
		if (!data.telefono || !data.banco) return renderEmpty(t("payment.noMobilePaymentData"));
	}
	if (methodKey === "zelle") {
		const data = methodData as ZelleConfig;
		if (!data.email) return renderEmpty(t("payment.noZelleData"));
	}

	const labels = {
		bank: t("payment.configLabels.bank"),
		accountType: t("payment.configLabels.accountType"),
		accountNumber: t("payment.configLabels.accountNumber"),
		document: t("payment.configLabels.document"),
		holder: t("payment.configLabels.holder"),
		email: t("payment.configLabels.email"),
		phone: t("payment.configLabels.phone"),
		idCard: t("payment.configLabels.idCard"),
		zelleEmail: t("payment.configLabels.zelleEmail"),
		link: t("payment.configLabels.link"),
		alias: t("payment.configLabels.alias"),
	};

	const fields: PaymentDetailField[] = [];
	const push = (key: string, label: string, value: unknown) => {
		if (typeof value === "string" && value.trim()) fields.push({ key, label, value });
	};

	if (methodKey === "transferencia_bancaria") {
		const data = methodData as TransferenciaBancariaConfig;
		push("bank", labels.bank, data.banco);
		push("accountType", labels.accountType, data.tipo_cuenta);
		push("accountNumber", labels.accountNumber, data.nro_cuenta);
		push("document", labels.document, data.identificacion);
		push("holder", labels.holder, data.titular);
		push("email", labels.email, data.email);
	} else if (methodKey === "pago_movil") {
		const data = methodData as PagoMovilConfig;
		push("bank", labels.bank, data.banco);
		push("phone", labels.phone, data.telefono);
		push("idCard", labels.idCard, data.identificacion);
	} else if (methodKey === "zelle") {
		const data = methodData as ZelleConfig;
		push("zelleEmail", labels.zelleEmail, data.email);
		push("holder", labels.holder, data.name);
	} else if (methodKey === "mercadopago" || methodKey === "paypal") {
		// Solo la lista cerrada de campos públicos: nunca se pinta una clave arbitraria
		// (formularios antiguos guardaban aquí credenciales de API).
		const data = methodData as Record<string, unknown>;
		const publicLabels: Record<string, string> = {
			email: labels.email,
			link: labels.link,
			alias: labels.alias,
		};
		for (const key of BRANCH_PAYMENT_PUBLIC_FIELDS[methodKey]) {
			push(key, publicLabels[key] ?? key, data[key]);
		}
	}

	if (fields.length === 0) {
		return renderEmpty(`${t("payment.followInstructions")} ${resolvePaymentMethodLabel(methodKey, t)}.`);
	}

	const amountArgs = { cartTotal, currency, exchangeRate, country };
	fields.push({
		key: "total",
		label: isVenezuelaCountry(country) || currency === "VES" ? t("payment.amount") : t("summary.total"),
		value: resolvePaymentAmountDisplay(amountArgs),
	});
	const copyValue = (field: PaymentDetailField) =>
		field.key === "total" ? resolvePaymentAmountCopyValue({ methodKey, ...amountArgs }) : field.value;

	const flash = (key: string) => {
		setCopiedKey(key);
		window.setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 2000);
	};

	return (
		<section className="cart-step cart-bank" key={methodKey}>
			<h3 className="cart-step__title">{t("payment.detailsTitle")}</h3>
			<ul className="cart-copy-list">
				{fields.map((field) => {
					const copied = copiedKey === field.key;
					return (
						<li key={field.key}>
							<button
								type="button"
								className={clsx("cart-copy-row", copied && "is-copied")}
								onClick={() => {
									copyToClipboard(copyValue(field));
									flash(field.key);
								}}
							>
								<span className="cart-copy-row__text">
									<span className="cart-copy-row__label">{field.label}</span>
									<span className="cart-copy-row__value">{field.value}</span>
								</span>
								<span className="cart-copy-row__action">
									{copied ? t("payment.copied") : t("payment.copy")}
								</span>
							</button>
						</li>
					);
				})}
			</ul>
			<button
				type="button"
				className={clsx("cart-secondary-btn", copiedKey === "__all" && "is-copied")}
				onClick={() => {
					copyToClipboard(fields.map((field) => `${field.label}: ${copyValue(field)}`).join("\n"));
					flash("__all");
				}}
			>
				{copiedKey === "__all" ? t("payment.copiedAll") : t("payment.copyAll")}
			</button>
		</section>
	);
}
