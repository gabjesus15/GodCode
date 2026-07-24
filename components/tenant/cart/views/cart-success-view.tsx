"use client";

import { useTranslations } from "next-intl";
import { Check, Copy } from "lucide-react";

import type { BusinessInfo } from "../cart-modal-types";
import type { CartFulfillment } from "../cart-context";

export function CartSuccessView({
  onNewOrder,
  onGoHome,
  receiptUploadFailed,
  activeInfo,
  lastOrder,
}: {
  onNewOrder: () => void;
  onGoHome: () => void;
  receiptUploadFailed: boolean;
  activeInfo: BusinessInfo;
  lastOrder: {
    id: number;
    order_number: number | null;
    handoff_code: string | null;
    fulfillment: CartFulfillment;
    paymentStatus?: string | null;
    evidenceStatus?: string | null;
  } | null;
}) {
  const t = useTranslations("tenant.cart.modal");
  const copyText = (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  };
  const showDeliveryCodes =
    lastOrder?.fulfillment === "delivery" && Boolean(lastOrder?.handoff_code);
  const orderLabel =
    lastOrder?.order_number != null
      ? `#${lastOrder.order_number}`
      : lastOrder && lastOrder.id > 0
        ? `#${lastOrder.id}`
        : null;

  return (
    <div className="cart-success-view animate-fade">
      <div className="success-icon-circle">
        <Check size={40} />
      </div>
      <h2 className="text-accent">{t("success.title")}</h2>
      <p className="success-description">{t("success.description")}</p>
      {receiptUploadFailed ? (
        <p className="cart-receipt-fallback cart-receipt-fallback-warning">
          {t("success.receiptUploadFailed")}
        </p>
      ) : null}
      {!receiptUploadFailed && lastOrder?.paymentStatus === "paid" ? (
        <p className="cart-receipt-fallback">
          Pago confirmado y registrado.
        </p>
      ) : null}
      {!receiptUploadFailed && lastOrder?.paymentStatus === "pending_verification" ? (
        <p className="cart-receipt-fallback cart-receipt-fallback-warning">
          Comprobante recibido. El pago está pendiente de verificación.
        </p>
      ) : null}
      {showDeliveryCodes ? (
        <>
          <div className="cart-success-codes-banner">
            <p>
              <strong>Guarda estos datos.</strong> Te los pediremos cuando te entreguemos el pedido en tu
              domicilio (mostralo o dictalo al repartidor).
            </p>
          </div>
          <div className="order-summary-card cart-success-codes-card">
            {orderLabel ? (
              <>
                <div className="summary-label">{t("success.yourOrder")}</div>
                <button
                  type="button"
                  className="summary-value summary-copy-row"
                  onClick={() => copyText(orderLabel.replace("#", ""))}
                  aria-label={t("success.copyOrderNumber")}
                >
                  <b>{orderLabel}</b> <Copy size={14} />
                </button>
              </>
            ) : null}
            <div className="summary-label">{t("success.deliveryCode")}</div>
            <button
              type="button"
              className="summary-value summary-mono summary-copy-row"
              onClick={() => copyText(lastOrder?.handoff_code ?? "")}
              aria-label={t("success.copyDeliveryCode")}
            >
              <b>{lastOrder?.handoff_code}</b> <Copy size={14} />
            </button>
          </div>
        </>
      ) : (
        <div className="order-summary-card">
          <div className="summary-label">{t("success.pickupAt")}</div>
          <div className="summary-value">{activeInfo?.address || t("success.addressUnavailable")}</div>
          <div className="text-xs text-muted">{activeInfo?.name || t("success.storeNameFallback")}</div>
          {orderLabel ? (
            <>
              <div className="summary-label">{t("success.orderNumber")}</div>
              <div className="summary-value">{orderLabel}</div>
            </>
          ) : null}
        </div>
      )}
      <div className="success-actions">
        <button className="btn btn-primary btn-block" onClick={onNewOrder}>
          {t("actions.newOrder")}
        </button>
        <button className="btn btn-secondary btn-block" onClick={onGoHome}>
          {t("actions.backToMenu")}
        </button>
      </div>
    </div>
  );
}
