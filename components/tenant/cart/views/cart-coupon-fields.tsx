"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { useCart } from "../use-cart";
import { useTenantCartStore } from "../provider/cart-provider";
import { formatCartMoney } from "../utils/format-cart-money";

export function CartCouponFields({
  branchId,
  cartSubtotal,
  clientPhone,
  currency,
  variant = "panel",
}: {
  branchId: string | null;
  cartSubtotal: number;
  clientPhone?: string | null;
  currency: string;
  variant?: "panel";
}) {
  const t = useTranslations("tenant.cart.modal");
  const {
    appliedCouponCode,
    appliedCouponDiscount,
    setAppliedCoupon,
    clearAppliedCoupon,
  } = useCart();

  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!appliedCouponCode || !branchId) return;
    const ctrl = new AbortController();
    const tid = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch("/api/geo/discount-coupon-preview", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              branchId,
              code: appliedCouponCode,
              subtotal: Math.round(cartSubtotal),
              ...(clientPhone?.trim() ? { clientPhone: clientPhone.trim() } : {}),
            }),
            signal: ctrl.signal,
          });
          const j = (await res.json()) as {
            ok?: boolean;
            discountAmount?: number;
            normalizedCode?: string;
            error?: string;
          };
          if (!res.ok || !j.ok) {
            clearAppliedCoupon();
            return;
          }
          const nextDisc = Math.round(Number(j.discountAmount) || 0);
          const codeNorm = String(j.normalizedCode ?? appliedCouponCode)
            .trim()
            .toUpperCase();
          const st = useTenantCartStore.getState();
          if (st.appliedCouponDiscount !== nextDisc || st.appliedCouponCode !== codeNorm) {
            setAppliedCoupon(codeNorm, nextDisc);
          }
        } catch {
          if (!ctrl.signal.aborted) clearAppliedCoupon();
        }
      })();
    }, 480);
    return () => {
      ctrl.abort();
      window.clearTimeout(tid);
    };
  }, [branchId, cartSubtotal, appliedCouponCode, clientPhone, clearAppliedCoupon, setAppliedCoupon]);

  const resolveCouponErrorMessage = (errKey: string | undefined, minSubtotal?: number): string => {
    const key = errKey ?? "server";
    if (key === "coupon_min_subtotal" && typeof minSubtotal === "number") {
      return t("coupon.errors.coupon_min_subtotal", {
        amount: formatCartMoney(minSubtotal, currency),
      });
    }
    if (key === "invalid_coupon") return t("coupon.errors.invalid_coupon");
    if (key === "coupon_expired") return t("coupon.errors.coupon_expired");
    if (key === "coupon_phone_required") return t("coupon.errors.coupon_phone_required");
    if (key === "coupon_wrong_client") return t("coupon.errors.coupon_wrong_client");
    if (key === "coupon_usage_exhausted") return t("coupon.errors.coupon_usage_exhausted");
    if (key === "coupon_usage_exhausted_client") return t("coupon.errors.coupon_usage_exhausted_client");
    if (key === "branch_not_found") return t("coupon.errors.branch_not_found");
    if (key === "bad_request") return t("coupon.errors.bad_request");
    return t("coupon.errors.server");
  };

  const onApply = async () => {
    if (!branchId) return;
    const code = draft.trim();
    if (!code) {
      setLocalError(t("coupon.errors.empty"));
      return;
    }
    setBusy(true);
    setLocalError(null);
    try {
      const res = await fetch("/api/geo/discount-coupon-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId,
          code,
          subtotal: Math.round(cartSubtotal),
          ...(clientPhone?.trim() ? { clientPhone: clientPhone.trim() } : {}),
        }),
      });
      const j = (await res.json()) as {
        ok?: boolean;
        discountAmount?: number;
        normalizedCode?: string;
        error?: string;
        minSubtotal?: number;
      };
      setBusy(false);
      if (!res.ok || !j.ok) {
        setLocalError(resolveCouponErrorMessage(j.error, j.minSubtotal));
        return;
      }
      const disc = Math.round(Number(j.discountAmount) || 0);
      setAppliedCoupon(String(j.normalizedCode ?? code).trim().toUpperCase(), disc);
      setDraft("");
    } catch {
      setBusy(false);
      setLocalError(t("coupon.errors.server"));
    }
  };

  if (!branchId) return null;

  const rootClassName =
    variant === "panel"
      ? "cart-enhance-panel glass cart-enhance-panel--in-footer cart-coupon-panel"
      : "cart-coupon-block";

  return (
    <div className={rootClassName}>
      {appliedCouponCode && appliedCouponDiscount > 0 ? (
        <div className="cart-coupon-applied">
          <span className="cart-coupon-applied-text">
            {t("coupon.applied", { code: appliedCouponCode })}
          </span>
          <button
            type="button"
            className="cart-enhance-seg cart-coupon-remove-seg"
            onClick={() => {
              clearAppliedCoupon();
              setLocalError(null);
            }}
          >
            {t("coupon.remove")}
          </button>
        </div>
      ) : (
        <div className="cart-coupon-row">
          <input
            type="text"
            className="form-input cart-coupon-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("coupon.placeholder")}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            aria-label={t("coupon.inputAria")}
            disabled={busy}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void onApply();
              }
            }}
          />
          <button
            type="button"
            className="cart-enhance-seg cart-coupon-apply-seg"
            disabled={busy}
            onClick={() => void onApply()}
          >
            {busy ? <Loader2 className="cart-coupon-spinner" size={17} aria-hidden /> : null}
            <span>{t("coupon.apply")}</span>
          </button>
        </div>
      )}
      {localError ? (
        <p className="cart-coupon-error" role="alert">
          {localError}
        </p>
      ) : null}
    </div>
  );
}
