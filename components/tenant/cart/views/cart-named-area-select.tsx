"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

import type { DeliveryNamedArea } from "@/lib/delivery/delivery-settings";

/** Listbox temático: el `<select>` nativo no permite teñir el highlight del OS (azul). */
export function CartNamedAreaSelect({
  areas,
  value,
  onPick,
  formatMoney,
  currency = "CLP",
}: {
  areas: DeliveryNamedArea[];
  value: string | null;
  onPick: (id: string | null) => void;
  formatMoney: (n: number, c?: string) => string;
  currency?: string;
}) {
  const t = useTranslations("tenant.cart.modal");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const selected = value ? areas.find((a) => a.id === value) : undefined;

  return (
    <div className={`cart-named-area-select${open ? " is-open" : ""}`} ref={rootRef}>
      <button
        type="button"
        className={`cart-named-area-select-trigger form-input ${open ? "is-open" : ""}`}
        aria-labelledby="cart-named-area-label"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="cart-named-area-select-value">
          {selected
            ? `${selected.name} — ${formatMoney(selected.feeFlat, currency)}`
            : t("delivery.pickNamedArea")}
        </span>
        <ChevronDown size={18} className="cart-named-area-select-chevron" aria-hidden />
      </button>
      {open ? (
        <ul className="cart-named-area-select-list" aria-label={t("delivery.selectAreaAria")}>
          <li>
            <button
              type="button"
              className={`cart-named-area-select-option ${!value ? "is-active" : ""}`}
              onClick={() => {
                onPick(null);
                setOpen(false);
              }}
            >
              {t("delivery.pickNamedArea")}
            </button>
          </li>
          {areas.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                className={`cart-named-area-select-option ${value === a.id ? "is-active" : ""}`}
                onClick={() => {
                  onPick(a.id);
                  setOpen(false);
                }}
              >
                {a.name} — {formatMoney(a.feeFlat, currency)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
