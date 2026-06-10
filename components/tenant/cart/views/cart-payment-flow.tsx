"use client";

import type React from "react";
import Image from "next/image";
import { ArrowLeft, CheckCircle2, MessageCircle, Store, Upload } from "lucide-react";
import { useTranslations } from "next-intl";

import type { CountryFormStrategy } from "@/lib/geo/country-forms";
import type { ActiveSessionInfo, CartModalViewState } from "../cart-modal-types";
import { PAYMENT_METHOD_CONFIG, resolvePaymentMethodLabel } from "../constants";
import { formatCartMoney } from "../utils/format-cart-money";
import { CartOnlinePaymentDetails } from "./cart-online-payment-details";
import { useCart } from "../use-cart";

export function CartPaymentFlow({
  paymentMethodKey,
  setPaymentMethodKey,
  paymentMethodsForCheckout,
  showForm,
  setShowForm,
  formData,
  onInputChange,
  onFileChange,
  onSubmit,
  isSaving,
  validation,
  showFieldErrors,
  setShowFieldErrors,
  cartTotal,
  onBack,
  activeInfo,
  setViewState,
  strategy,
  isOrderIntakePaused = false,
}: {
  paymentMethodKey: string | null;
  setPaymentMethodKey: (value: string | null) => void;
  paymentMethodsForCheckout: string[];
  showForm: boolean;
  setShowForm: (value: boolean) => void;
  formData: {
    name: string;
    phone: string;
    rut: string;
    receiptFile: File | null;
    receiptPreview: string | null;
  };
  onInputChange: (field: string, value: string) => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: React.FormEvent) => void;
  isSaving: boolean;
  validation: { rut: boolean; phone: boolean; name: boolean; receipt: boolean; isReady: boolean };
  showFieldErrors: boolean;
  setShowFieldErrors: (value: boolean) => void;
  cartTotal: number;
  onBack: () => void;
  activeInfo: ActiveSessionInfo;
  setViewState: React.Dispatch<React.SetStateAction<CartModalViewState>>;
  strategy: CountryFormStrategy;
  isOrderIntakePaused?: boolean;
}) {
  const { currency } = useCart();
  const t = useTranslations("tenant.cart.modal");
  const isOnline = paymentMethodKey && PAYMENT_METHOD_CONFIG[paymentMethodKey]?.isOnline;
  const requiresReceipt = Boolean(
    paymentMethodKey && PAYMENT_METHOD_CONFIG[paymentMethodKey]?.isOnline,
  );
  const showNameError = showFieldErrors && !validation.name;
  const showRutError = showFieldErrors && !validation.rut;
  const showPhoneError = showFieldErrors && !validation.phone;
  const showReceiptError = showFieldErrors && requiresReceipt && !validation.receipt;
  const topValidationMessage = showFieldErrors
    ? [
        showNameError ? t("validationItems.validName") : null,
        showRutError ? t("validationItems.validRut") : null,
        showPhoneError ? t("validationItems.validPhone") : null,
        showReceiptError ? t("validationItems.transferReceipt") : null,
      ]
        .filter(Boolean)
        .join(", ")
    : "";

  if (paymentMethodKey && showForm) {
    return (
      <div className="payment-flow">
        <form
          key={`form-${paymentMethodKey}`}
          onSubmit={onSubmit}
          className="checkout-form payment-flow-surface payment-flow-surface--form"
        >
          <h4 className="form-title">
            <MessageCircle size={18} /> {t("payment.clientData")}
          </h4>
          {topValidationMessage ? (
            <div className="checkout-validation-banner">
              {t("validation.reviewFields")}: {topValidationMessage}.
            </div>
          ) : null}

          <div className="form-group">
            <label>{t("payment.fields.name")}</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(event) => onInputChange("name", event.target.value)}
              className={`form-input ${showNameError ? "input-error" : ""}`}
              placeholder={t("payment.fields.namePlaceholder")}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>
                {strategy.idName}{" "}
                {validation.rut ? <CheckCircle2 size={14} color="#25d366" /> : null}
              </label>
              <input
                type="text"
                required
                value={formData.rut}
                onChange={(event) => onInputChange("rut", event.target.value)}
                className={`form-input ${showRutError ? "input-error" : ""}`}
                placeholder={strategy.idPlaceholder}
              />
            </div>

            <div className="form-group">
              <label>
                {t("payment.fields.phone")}{" "}
                {validation.phone ? <CheckCircle2 size={14} color="#25d366" /> : null}
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(event) => onInputChange("phone", event.target.value)}
                className={`form-input ${showPhoneError ? "input-error" : ""}`}
                placeholder={strategy.phonePlaceholder}
              />
            </div>
          </div>

          {requiresReceipt ? (
            <div className="form-group">
              <label>
                {t("payment.fields.receipt")}{" "}
                {validation.receipt ? (
                  <CheckCircle2 size={14} color="#25d366" />
                ) : (
                  <span className="text-accent">*</span>
                )}
              </label>
              <div
                className="upload-box"
                onClick={() => document.getElementById("receipt-upload")?.click()}
                data-has-preview={formData.receiptPreview ? "true" : "false"}
              >
                <input
                  type="file"
                  id="receipt-upload"
                  accept="image/*"
                  hidden
                  onChange={onFileChange}
                  aria-label={t("payment.fields.uploadReceipt")}
                  title={t("payment.fields.uploadReceipt")}
                />
                {formData.receiptPreview ? (
                  <div className="file-preview-row">
                    <Image
                      src={formData.receiptPreview}
                      alt={t("payment.fields.receipt")}
                      width={40}
                      height={40}
                      unoptimized
                    />
                    <span>{t("payment.fields.imageLoaded")}</span>
                  </div>
                ) : (
                  <div className="upload-placeholder">
                    <Upload size={20} /> <span>{t("payment.fields.uploadCapture")}</span>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <div className="form-actions-col mt-20">
            <button
              type="submit"
              disabled={isSaving || !validation.isReady || isOrderIntakePaused}
              className="btn btn-primary btn-block"
              onClick={() => {
                if (isOrderIntakePaused) return;
                if (!validation.isReady) {
                  setShowFieldErrors(true);
                  let errorMsg = `${t("validation.completeCorrectly")}:`;
                  const errors = [];
                  if (!validation.name) errors.push(t("validationItems.name"));
                  if (!validation.rut) errors.push(strategy.idName);
                  if (!validation.phone) errors.push(t("validationItems.phone"));
                  if (!validation.receipt && requiresReceipt) errors.push(t("validationItems.receipt"));
                  if (errors.length > 0) errorMsg += " " + errors.join(", ");
                  setViewState((prev) => ({ ...prev, error: errorMsg }));
                }
              }}
            >
              {isSaving ? t("actions.sending") : isOrderIntakePaused ? "Pedidos pausados" : t("actions.confirmOrder")}
            </button>
            <button type="button" className="btn btn-text btn-block" onClick={() => setShowForm(false)}>
              <ArrowLeft size={16} className="mr-5" /> {t("actions.back")}
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (paymentMethodKey) {
    return (
      <div className="payment-flow">
        <div
          key={`detail-${paymentMethodKey}`}
          className="payment-details payment-flow-surface payment-flow-surface--detail"
        >
          {isOnline ? (
            <CartOnlinePaymentDetails
              methodKey={paymentMethodKey}
              cartTotal={cartTotal}
              activeInfo={activeInfo}
            />
          ) : (
            <div key={paymentMethodKey} className="store-pay-info glass mb-20 payment-method-store-card">
              <Store size={32} className="text-accent" />
              <div>
                <h4>{resolvePaymentMethodLabel(paymentMethodKey, t)}</h4>
                <p className="text-muted">{t("payment.payInStoreHelp")}</p>
              </div>
              <div className="pay-total">
                {t("summary.total")}: {formatCartMoney(cartTotal, currency)}
              </div>
            </div>
          )}

          <button onClick={() => setShowForm(true)} disabled={isOrderIntakePaused} className="btn btn-primary btn-block mt-4">
            {isOrderIntakePaused ? "Pedidos pausados" : isOnline ? t("actions.alreadyPaid") : t("actions.continue")}
          </button>

          <button onClick={() => setPaymentMethodKey(null)} className="btn btn-text btn-block mt-2">
            <ArrowLeft size={16} className="mr-5" /> {t("actions.chooseAnotherMethod")}
          </button>
        </div>
      </div>
    );
  }

  const activeMethods = paymentMethodsForCheckout;

  return (
    <div className="payment-flow">
      <div key="pick" className="payment-options payment-flow-surface payment-flow-surface--pick">
        <h4 className="text-center mb-15 text-white">{t("payment.title")}</h4>
        {activeMethods.length === 0 ? (
          <div className="text-center text-sm text-gray-400 py-4">{t("payment.noMethodsForFulfillment")}</div>
        ) : (
          activeMethods.map((methodKey, idx) => {
            const config = PAYMENT_METHOD_CONFIG[methodKey];
            if (!config) return null;
            const Icon = config.icon;
            return (
              <button
                key={methodKey}
                type="button"
                className={`btn btn-secondary btn-block payment-opt payment-opt--delay-${Math.min(idx, 10)}`}
                onClick={() => setPaymentMethodKey(methodKey)}
              >
                {Icon && <Icon size={20} className="mr-5" />} {resolvePaymentMethodLabel(methodKey, t)}
              </button>
            );
          })
        )}
        <button onClick={onBack} className="btn btn-text btn-block mt-2">
          {t("actions.cancel")}
        </button>
      </div>
    </div>
  );
}
