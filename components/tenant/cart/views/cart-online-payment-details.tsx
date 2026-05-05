"use client";

import { useTranslations } from "next-intl";
import { Copy } from "lucide-react";

import type { ActiveSessionInfo, BranchInfo } from "../cart-modal-types";
import { formatCartMoney } from "../utils/format-cart-money";
import { resolvePaymentMethodLabel } from "../constants";

export function CartOnlinePaymentDetails({
  methodKey,
  cartTotal,
  activeInfo,
}: {
  methodKey: string;
  cartTotal: number;
  activeInfo: ActiveSessionInfo;
}) {
  const t = useTranslations("tenant.cart.modal");
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const renderRow = (label: string, value: string | undefined | null) => {
    if (!value) return null;
    return (
      <li className="copy-row" onClick={() => copyToClipboard(value)}>
        <span className="copy-row-label">{label}:</span>{" "}
        <div className="copy-row-value">
          <b>{value}</b> <Copy size={14} />
        </div>
      </li>
    );
  };

  const renderDetails = () => {
    let methodData = activeInfo[methodKey as keyof ActiveSessionInfo];

    if (typeof methodData === "string") {
      try {
        methodData = JSON.parse(methodData);
      } catch {
        methodData = null;
      }
    }

    if (!methodData || typeof methodData !== "object") {
      return (
        <p className="bank-empty-msg">
          {t("payment.noDataConfiguredFor")} {resolvePaymentMethodLabel(methodKey, t)}.
        </p>
      );
    }

    if (methodKey === "transferencia_bancaria") {
      const data = methodData as BranchInfo["transferencia_bancaria"] | null | undefined;
      if (!data) return <p className="bank-empty-msg">{t("payment.noBankData")}</p>;
      const bankName = data.banco;
      const hasAccount = data.nro_cuenta || data.identificacion;
      if (!bankName && !hasAccount) return <p className="bank-empty-msg">{t("payment.noBankData")}</p>;
      return (
        <ul className="bank-details-list">
          {bankName && (
            <li>
              <span>{t("payment.configLabels.bank")}:</span> <b>{bankName}</b>
            </li>
          )}
          {data.tipo_cuenta && (
            <li>
              <span>{t("payment.configLabels.accountType")}:</span> <b>{data.tipo_cuenta}</b>
            </li>
          )}
          {renderRow(t("payment.configLabels.accountNumber"), data.nro_cuenta)}
          {renderRow(t("payment.configLabels.document"), data.identificacion)}
          {data.titular && (
            <li>
              <span>{t("payment.configLabels.holder")}:</span> <b>{data.titular}</b>
            </li>
          )}
          {renderRow(t("payment.configLabels.email"), data.email)}
        </ul>
      );
    }

    if (methodKey === "pago_movil") {
      const data = methodData as BranchInfo["pago_movil"] | null | undefined;
      if (!data || !data.telefono || !data.banco)
        return <p className="bank-empty-msg">{t("payment.noMobilePaymentData")}</p>;
      return (
        <ul className="bank-details-list">
          {data.banco && (
            <li>
              <span>{t("payment.configLabels.bank")}:</span> <b>{data.banco}</b>
            </li>
          )}
          {renderRow(t("payment.configLabels.phone"), data.telefono)}
          {renderRow(t("payment.configLabels.idCard"), data.identificacion)}
        </ul>
      );
    }

    if (methodKey === "zelle") {
      const data = methodData as BranchInfo["zelle"] | null | undefined;
      if (!data || !data.email) return <p className="bank-empty-msg">{t("payment.noZelleData")}</p>;
      return (
        <ul className="bank-details-list">
          {renderRow(t("payment.configLabels.zelleEmail"), data.email)}
          {data.name && (
            <li>
              <span>{t("payment.configLabels.holder")}:</span> <b>{data.name}</b>
            </li>
          )}
        </ul>
      );
    }

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
    const entries = Object.entries(methodData as Record<string, unknown>).filter(
      ([, v]) => v && typeof v === "string",
    );
    if (entries.length > 0) {
      return (
        <ul className="bank-details-list">
          {entries.map(([k, v]) => (
            <li key={k} className="copy-row" onClick={() => copyToClipboard(v as string)}>
              <span className="copy-row-label">{CART_CONFIG_LABELS[k] ?? k.replace(/_/g, " ")}:</span>{" "}
              <div className="copy-row-value">
                <b>{v as string}</b> <Copy size={14} />
              </div>
            </li>
          ))}
        </ul>
      );
    }

    return (
      <p className="bank-empty-msg">
        {t("payment.followInstructions")} {resolvePaymentMethodLabel(methodKey, t)}.
      </p>
    );
  };

  return (
    <div className="bank-info glass payment-method-bank-card" key={methodKey}>
      <h4>{t("payment.detailsTitle")}</h4>
      {renderDetails()}
      <div className="pay-total">
        {t("summary.total")}: {formatCartMoney(cartTotal)}
      </div>
    </div>
  );
}
