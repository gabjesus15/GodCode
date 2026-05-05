"use client";

import { useTranslations } from "next-intl";

export function CartEmptyState({ onMenu }: { onMenu: () => void }) {
  const t = useTranslations("tenant.cart.modal");
  return (
    <div className="empty-state">
      <span className="empty-emoji">🍽️</span>
      <h3>{t("empty.title")}</h3>
      <button onClick={onMenu} className="btn btn-secondary mt-20">
        {t("actions.backToMenu")}
      </button>
    </div>
  );
}
