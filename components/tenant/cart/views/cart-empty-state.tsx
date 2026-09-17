"use client";

import { useEffect, useState } from "react";
import { RotateCcw, ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";

import type { MenuAccountOrder } from "../../account/menu-account-types";
import { repeatableItems, useRepeatOrder } from "../../account/use-repeat-order";

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
 *
 * `companyId` llega solo cuando hay sesion de cuenta: es lo que habilita el
 * atajo de repetir el ultimo pedido, debajo de volver al menu.
 */
export function CartEmptyState({
  onMenu,
  companyId,
}: {
  onMenu: () => void;
  companyId?: string | null;
}) {
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
      {companyId ? <RepeatLastOrderButton companyId={companyId} /> : null}
    </div>
  );
}

/**
 * Solo se dibuja si hay algo que repetir: sin pedidos, o con un ultimo pedido de
 * lineas manuales del POS (sin producto del catalogo), no aparece nada. Mientras
 * carga tampoco, para que el vacio no de un salto al abrir el carrito.
 */
function RepeatLastOrderButton({ companyId }: { companyId: string }) {
  const t = useTranslations("tenant.cart.modal");
  const { repeatOrder } = useRepeatOrder();
  const [order, setOrder] = useState<MenuAccountOrder | null>(null);
  const [repeating, setRepeating] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/menu-account/last-order?companyId=${encodeURIComponent(companyId)}`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as { order?: MenuAccountOrder | null };
        setOrder(payload.order ?? null);
      })
      // El fallo no se anuncia: es un atajo, y el carrito vacio ya tiene su salida.
      .catch(() => undefined);
    return () => controller.abort();
  }, [companyId]);

  if (!order || repeatableItems(order).length === 0) return null;

  return (
    <button
      type="button"
      className="btn btn-primary empty-state__repeat"
      disabled={repeating}
      onClick={() => {
        // Queda deshabilitado hasta que navegue: `repeatOrder` reescribe el carrito y
        // empuja la ruta, y un segundo clic duplicaria ese trabajo.
        setRepeating(true);
        void repeatOrder(order).then((ok) => {
          if (!ok) setRepeating(false);
        });
      }}
    >
      <RotateCcw size={16} aria-hidden />
      {t("actions.repeatLastOrder")}
    </button>
  );
}
