"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { CupSoda, Minus, Plus, Trash2 } from "lucide-react";

import { type CartLineItem } from "../cart-modal-types";
import { FALLBACK_IMAGE } from "../constants";
import { formatCartMoney } from "../utils/format-cart-money";
import { getCloudinaryOptimizedUrl } from "../../utils/cloudinary";
import { isUpsellBeverageLineId } from "../cart-context";
import { useCart } from "../use-cart";

export function CartItemRow({
  item,
  unitPrice,
  onRemove,
  onAdd,
  onDecrease,
  onLineNoteChange,
}: {
  item: CartLineItem;
  unitPrice: number;
  onRemove: (id: string) => void;
  onAdd: (
    item: CartLineItem,
    options?: {
      selectedExtras?: Array<{ id: string; name: string; price: number; qty: number }>;
      selectedBeverages?: Array<{ id: string; name: string; price: number; qty: number }>;
    },
  ) => void;
  onDecrease: (id: string) => void;
  onLineNoteChange: (lineId: string, note: string) => void;
}) {
  const { currency, exchangeRate } = useCart();
  const t = useTranslations("tenant.cart.modal");
  const lineId = item.lineId ?? item.id;
  const hasNote = Boolean(item.line_note?.trim());
  const [noteOpen, setNoteOpen] = useState(false);

  const optimizedSrc = getCloudinaryOptimizedUrl(item.image_url ?? null, {
    width: 120,
    height: 120,
    crop: "fill",
    gravity: "auto",
  });
  const imageSrc =
    typeof optimizedSrc === "string" && optimizedSrc.trim().length > 0
      ? optimizedSrc
      : FALLBACK_IMAGE;
  const upsellBevOnly = isUpsellBeverageLineId(item.id);
  const extrasText = (item.selected_extras ?? []).map((ex) => `${ex.qty}x ${ex.name}`).join(", ");
  const beveragesText = upsellBevOnly
    ? ""
    : (item.selected_beverages ?? []).map((bev) => `${bev.qty}x ${bev.name}`).join(", ");
  const extrasTotal = (item.selected_extras ?? []).reduce(
    (sum, ex) => sum + (Number(ex.price) || 0) * (Number(ex.qty) || 1),
    0,
  );
  const beveragesTotal = upsellBevOnly
    ? 0
    : (item.selected_beverages ?? []).reduce(
        (sum, bev) => sum + (Number(bev.price) || 0) * (Number(bev.qty) || 1),
        0,
      );
  const lineUnitTotal = Math.max(0, unitPrice + extrasTotal + beveragesTotal);

  return (
    <div className="cart-item-shell">
      <div className="cart-item">
        {upsellBevOnly ? (
          <div className="item-thumb item-thumb--upsell-drink" aria-hidden>
            <CupSoda size={24} strokeWidth={2} />
          </div>
        ) : (
          <Image
            src={imageSrc}
            alt={`${item.name || t("item.productFallback")} - ${t("header.title")}`}
            width={65}
            height={65}
            unoptimized
            className="item-thumb"
            onError={(event) => {
              event.currentTarget.src = FALLBACK_IMAGE;
            }}
          />
        )}
        <div className="item-details item-details-tight">
          <div className="item-top">
            <h4 className="item-title">{item.name}</h4>
            <button
              onClick={() => onRemove(lineId)}
              className="btn-trash"
              aria-label={t("item.removeProduct")}
              title={t("item.removeProduct")}
            >
              <Trash2 size={16} />
            </button>
          </div>

          <div className="item-bottom item-bottom-tight">
            <div className="item-price-wrapper">
              <span className="item-price item-price-strong">
                {formatCartMoney(lineUnitTotal * item.quantity, currency)}
              </span>
              {exchangeRate != null && exchangeRate > 0 && (
                <span className="item-price-local" style={{ display: "block", fontSize: "0.78rem", opacity: 0.6, marginTop: "1px" }}>
                  {formatCartMoney(lineUnitTotal * item.quantity * exchangeRate, currency === "USD" ? "VES" : "USD")}
                </span>
              )}
            </div>
            <div className="qty-control-sm">
              <button
                onClick={() => onDecrease(lineId)}
                aria-label={t("item.decreaseQuantity")}
                title={t("item.decreaseQuantity")}
              >
                <Minus size={12} />
              </button>
              <span>{item.quantity}</span>
              <button
                onClick={() =>
                  onAdd(item, {
                    selectedExtras: item.selected_extras ?? [],
                    selectedBeverages: item.selected_beverages ?? [],
                  })
                }
                aria-label={t("item.increaseQuantity")}
                title={t("item.increaseQuantity")}
              >
                <Plus size={12} />
              </button>
            </div>
          </div>
          {extrasText ? <p className="cart-geo-hint">Extras: {extrasText}</p> : null}
          {beveragesText ? <p className="cart-geo-hint">Bebidas: {beveragesText}</p> : null}
          {item.line_summary ? <p className="cart-geo-hint">{item.line_summary}</p> : null}
          {hasNote && !noteOpen ? (
            <p className="cart-item-note-hint">{item.line_note}</p>
          ) : null}
        </div>
      </div>

      <div
        className={`cart-item-note-panel-wrap${noteOpen ? " is-open" : ""}`}
        aria-hidden={!noteOpen}
      >
        <div className="cart-item-note-panel">
          <textarea
            className="form-input cart-item-note-input"
            value={item.line_note ?? ""}
            onChange={(event) => onLineNoteChange(lineId, event.target.value)}
            placeholder={t("notes.placeholder")}
            rows={2}
            aria-label={t("notes.inputAria")}
            tabIndex={noteOpen ? 0 : -1}
          />
        </div>
      </div>

      <button
        type="button"
        className={`cart-item-note-tab${noteOpen ? " is-open" : ""}${hasNote ? " is-filled" : ""}`}
        onClick={() => setNoteOpen((open) => !open)}
        aria-expanded={noteOpen}
      >
        {hasNote ? t("notes.editTab") : t("notes.addTab")}
      </button>
    </div>
  );
}
