"use client";

import { useEffect } from "react";
import type { PortalTab } from "../shared/customer-account-types";
import type { UseConfirmDialogReturn } from "../ui/ConfirmDialog";

/** Pestañas con editor propio y lo que se pierde al salir sin guardar. */
const UNSAVED_COPY: Partial<Record<PortalTab, string>> = {
  tienda: "Tienes cambios sin guardar en el editor de tienda. Si sales ahora los perderás.",
  perfil: "Tienes cambios sin guardar en tu página de inicio. Si sales ahora los perderás.",
};

/**
 * Pide confirmación al salir (cambio de pestaña o cierre del navegador) si la
 * pestaña activa tiene cambios sin guardar.
 */
export function useUnsavedGuard(
  activeTab: PortalTab,
  dirtyTabs: Partial<Record<PortalTab, boolean>>,
  confirmDialog: UseConfirmDialogReturn,
): {
  guardedTabChange: (nextTab: PortalTab, onNavigate: (t: PortalTab) => void) => Promise<void>;
} {
  const { confirm } = confirmDialog;
  const activeDirty = Boolean(dirtyTabs[activeTab]);

  useEffect(() => {
    if (!activeDirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [activeDirty]);

  const guardedTabChange = async (nextTab: PortalTab, onNavigate: (t: PortalTab) => void) => {
    if (nextTab !== activeTab && activeDirty) {
      const ok = await confirm({
        title:        "Cambios sin guardar",
        description:  UNSAVED_COPY[activeTab] ?? "Tienes cambios sin guardar. Si sales ahora los perderás.",
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
