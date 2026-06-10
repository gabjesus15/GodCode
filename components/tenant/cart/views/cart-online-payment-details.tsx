"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import type { ActiveSessionInfo, BranchInfo } from "../cart-modal-types";
import { formatCartMoney } from "../utils/format-cart-money";
import { resolvePaymentMethodLabel } from "../constants";
import { useCart } from "../use-cart";

type TransferenciaBancariaConfig = NonNullable<BranchInfo["transferencia_bancaria"]>;
type PagoMovilConfig = NonNullable<BranchInfo["pago_movil"]>;
type ZelleConfig = NonNullable<BranchInfo["zelle"]>;

interface PaymentDetailField {
  key: string;
  label: string;
  value: string;
}

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
  const [copiedAll, setCopiedAll] = useState(false);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  let methodData = activeInfo[methodKey as keyof ActiveSessionInfo];

  if (typeof methodData === "string") {
    try {
      methodData = JSON.parse(methodData) as unknown;
    } catch {
      methodData = null;
    }
  }

  const renderEmptyMsg = (msg: string) => {
    return (
      <div className="bank-info glass payment-method-bank-card" key={methodKey}>
        <h4>{t("payment.detailsTitle")}</h4>
        <p className="bank-empty-msg">{msg}</p>
      </div>
    );
  };

  if (!methodData || typeof methodData !== "object") {
    return (
      <div className="bank-info glass payment-method-bank-card" key={methodKey}>
        <h4>{t("payment.detailsTitle")}</h4>
        <p className="bank-empty-msg">
          {t("payment.noDataConfiguredFor")} {resolvePaymentMethodLabel(methodKey, t)}.
        </p>
      </div>
    );
  }

  // Early validation of configurations
  if (methodKey === "transferencia_bancaria") {
    const data = methodData as TransferenciaBancariaConfig | null | undefined;
    if (!data) return renderEmptyMsg(t("payment.noBankData"));
    const bankName = data.banco;
    const hasAccount = data.nro_cuenta || data.identificacion;
    if (!bankName && !hasAccount) return renderEmptyMsg(t("payment.noBankData"));
  }

  if (methodKey === "pago_movil") {
    const data = methodData as PagoMovilConfig | null | undefined;
    if (!data || !data.telefono || !data.banco) {
      return renderEmptyMsg(t("payment.noMobilePaymentData"));
    }
  }

  if (methodKey === "zelle") {
    const data = methodData as ZelleConfig | null | undefined;
    if (!data || !data.email) {
      return renderEmptyMsg(t("payment.noZelleData"));
    }
  }

  // Parse fields
  const fields: PaymentDetailField[] = [];

  if (methodKey === "transferencia_bancaria") {
    const data = methodData as TransferenciaBancariaConfig;
    if (data.banco) fields.push({ key: "bank", label: t("payment.configLabels.bank"), value: data.banco });
    if (data.tipo_cuenta) fields.push({ key: "accountType", label: t("payment.configLabels.accountType"), value: data.tipo_cuenta });
    if (data.nro_cuenta) fields.push({ key: "accountNumber", label: t("payment.configLabels.accountNumber"), value: data.nro_cuenta });
    if (data.identificacion) fields.push({ key: "document", label: t("payment.configLabels.document"), value: data.identificacion });
    if (data.titular) fields.push({ key: "holder", label: t("payment.configLabels.holder"), value: data.titular });
    if (data.email) fields.push({ key: "email", label: t("payment.configLabels.email"), value: data.email });
  } else if (methodKey === "pago_movil") {
    const data = methodData as PagoMovilConfig;
    if (data.banco) fields.push({ key: "bank", label: t("payment.configLabels.bank"), value: data.banco });
    if (data.telefono) fields.push({ key: "phone", label: t("payment.configLabels.phone"), value: data.telefono });
    if (data.identificacion) fields.push({ key: "idCard", label: t("payment.configLabels.idCard"), value: data.identificacion });
  } else if (methodKey === "zelle") {
    const data = methodData as ZelleConfig;
    if (data.email) fields.push({ key: "zelleEmail", label: t("payment.configLabels.zelleEmail"), value: data.email });
    if (data.name) fields.push({ key: "holder", label: t("payment.configLabels.holder"), value: data.name });
  } else {
    const CART_CONFIG_LABELS: Record<string, string> = {
      email: t("payment.configLabels.email"),
      name: t("payment.configLabels.holder"),
      banco: t("payment.configLabels.bank"),
      telefono: t("payment.configLabels.phone"),
      identificacion: t("payment.configLabels.document"),
      tipo_cuenta: t("payment.configLabels.accountType"),
      nro_cuenta: t("payment.configLabels.accountNumber"),
      titular: t("payment.configLabels.holder"),
      connected: t("payment.configLabels.connected"),
    };
    Object.entries(methodData as Record<string, unknown>).forEach(([k, v]) => {
      if (v && typeof v === "string") {
        fields.push({
          key: k,
          label: CART_CONFIG_LABELS[k] ?? k.replace(/_/g, " "),
          value: v,
        });
      }
    });
  }

  if (fields.length === 0) {
    return (
      <div className="bank-info glass payment-method-bank-card" key={methodKey}>
        <h4>{t("payment.detailsTitle")}</h4>
        <p className="bank-empty-msg">
          {t("payment.followInstructions")} {resolvePaymentMethodLabel(methodKey, t)}.
        </p>
      </div>
    );
  }

  // Calculate and format the total
  const primaryTotal = formatCartMoney(cartTotal, currency);
  let finalTotalValue = primaryTotal;
  if (exchangeRate != null && exchangeRate > 0) {
    const secondaryCurrency = currency === "USD" ? "VES" : "USD";
    const secondaryTotal = formatCartMoney(cartTotal * exchangeRate, secondaryCurrency);
    finalTotalValue = `${primaryTotal} / ${secondaryTotal}`;
  }

  const totalLabel = currency === "VES" || country === "VE" ? "Monto" : (t("summary.total") || "Total");

  fields.push({
    key: "total",
    label: totalLabel,
    value: finalTotalValue,
  });

  const handleCopyAll = () => {
    // Copy all fields formatted nicely
    const textToCopy = fields
      .map((f) => `${f.label}: ${f.value}`)
      .join("\n");
    navigator.clipboard.writeText(textToCopy);
    setCopiedAll(true);
    setTimeout(() => {
      setCopiedAll(false);
    }, 2000);
  };

  return (
    <div className="bank-info glass payment-method-bank-card" key={methodKey}>
      <h4>{t("payment.detailsTitle")}</h4>
      <ul className="bank-details-list">
        {fields.map((field) => {
          const isCopied = copiedKey === field.key;
          return (
            <li
              key={field.key}
              className="copy-row"
              onClick={() => handleCopy(field.value, field.key)}
            >
              <div className="copy-row-info">
                <span className="copy-row-label">{field.label}</span>
                <span className="copy-row-value-text">{field.value}</span>
              </div>
              <button
                type="button"
                className={`copy-row-btn ${isCopied ? "copied" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(field.value, field.key);
                }}
              >
                {isCopied ? "¡Copiado!" : "Copiar"}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="copy-all-container">
        <button
          type="button"
          className="copy-all-btn"
          onClick={handleCopyAll}
        >
          {copiedAll ? "¡Copiados!" : "Copiar todos"}
        </button>
      </div>
    </div>
  );
}
