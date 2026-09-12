"use client";

import { ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * El vacio del carrito se dibujaba con el emoji 🍽️ a 3.5rem. Un emoji lo pinta
 * el sistema operativo, no la pagina: cambia de dibujo y de color en cada
 * plataforma —en Windows sale un plato lila, en Android otro distinto— asi que
 * era el unico elemento del menu que no respondia ni al tema del tenant ni a la
 * tipografia. Aqui va el mismo icono que la pestaña de carrito de la barra
 * inferior, que ademas ata visualmente las dos cosas: pulsaste ahi, esto es lo
 * que hay.
 *
 * Y llevaba solo un titulo, sin decir que hacer. La segunda linea es la que
 * convierte un aviso en una salida.
 */
export function CartEmptyState({ onMenu }: { onMenu: () => void }) {
  const t = useTranslations("tenant.cart.modal");
  return (
    <div className="empty-state">
      <span className="empty-state__icon" aria-hidden>
        <ShoppingBag size={30} strokeWidth={1.6} />
      </span>
      <h3>{t("empty.title")}</h3>
      <p className="empty-state__hint">{t("empty.subtitle")}</p>
      <button onClick={onMenu} className="btn btn-secondary mt-20">
        {t("actions.backToMenu")}
      </button>
    </div>
  );
}
