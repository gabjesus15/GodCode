"use client";

import { useEffect } from "react";
import type { PortalTab } from "../shared/customer-account-types";
import type { UseConfirmDialogReturn } from "../ui/ConfirmDialog";

/**
 * Bloquea la navegación del browser si hay cambios sin guardar en la tab de Tienda.
 * Reemplaza los dos `window.confirm` que existían en CustomerAccountClient.tsx.
 */
export function useUnsavedGuard(
  activeTab:    PortalTab,
  hasUnsaved:   boolean,
  confirmDialog: UseConfirmDialogReturn,
): {
  guardedTabChange: (nextTab: PortalTab, onNavigate: (t: PortalTab) => void) => Promise<void>;
} {
  const { confirm } = confirmDialog;

  // Browser unload guard
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (activeTab !== "tienda" || !hasUnsaved) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [activeTab, hasUnsaved]);

  const guardedTabChange = async (nextTab: PortalTab, onNavigate: (t: PortalTab) => void) => {
    if (activeTab === "tienda" && nextTab !== "tienda" && hasUnsaved) {
      const ok = await confirm({
        title:        "Cambios sin guardar",
        description:  "Tienes cambios sin guardar en el editor de tienda. Si sales ahora los perderaas.",
        confirmLabel: "Salir de todos modos",
        cancelLabel:  "Quedarme",
        tone:         "danger",
      });
      if (!ok) return;
    }
    onNavigate(nextTab);
  };

  return { guardedTabChange };
}
