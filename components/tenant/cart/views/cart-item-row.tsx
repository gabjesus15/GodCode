"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { CupSoda, Minus, Plus, Trash2 } from "lucide-react";

import { type CartLineItem } from "../cart-modal-types";
import { FALLBACK_IMAGE } from "../constants";
import { formatCartMoney } from "../utils/format-cart-money";
import { getCloudinaryOptimizedUrl } from "../../utils/cloudinary";
import { isUpsellBeverageLineId } from "../cart-context";

export function CartItemRow({
  item,
  unitPrice,
  onRemove,
  onAdd,
  onDecrease,
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
}) {
  const t = useTranslations("tenant.cart.modal");
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
    <div className="cart-item">
      {upsellBevOnly ? (
        <div className="item-thumb item-thumb--upsell-drink" aria-hidden>
          <CupSoda size={24} strokeWidth={2} />
        </div>
      ) : (
        <Image
          src={imageSrc}
          alt={item.name ?? t("item.productFallback")}
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
            onClick={() => onRemove(item.lineId ?? item.id)}
            className="btn-trash"
            aria-label={t("item.removeProduct")}
            title={t("item.removeProduct")}
          >
            <Trash2 size={16} />
          </button>
        </div>

        <div className="item-bottom item-bottom-tight">
          <span className="item-price item-price-strong">
            {formatCartMoney(lineUnitTotal * item.quantity)}
          </span>
          <div className="qty-control-sm">
            <button
              onClick={() => onDecrease(item.lineId ?? item.id)}
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
      </div>
    </div>
  );
}
