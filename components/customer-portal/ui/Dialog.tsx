"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

export type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Ancho máximo del diálogo. Por defecto "md" (~448px). */
  size?: "sm" | "md" | "lg" | "xl";
  /** Muestra el botón X para cerrar en la esquina. Por defecto true. */
  showClose?: boolean;
};

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
};

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  size = "md",
  showClose = true,
}: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        {/* Alto máximo con scroll propio: en móvil los diálogos largos (pago, cambio de plan)
            dejaban el botón de confirmar fuera de la pantalla. */}
        <RadixDialog.Content
          {...(description ? {} : { "aria-describedby": undefined })}
          className={`fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-2xl border border-[#e5e5ea] bg-white p-5 shadow-xl shadow-black/10 focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:p-6 ${sizeClasses[size]}`}
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <RadixDialog.Title className="text-base font-semibold text-[#1d1d1f]">
                {title}
              </RadixDialog.Title>
              {description && (
                <RadixDialog.Description className="mt-1 text-sm text-[#6e6e73]">
                  {description}
                </RadixDialog.Description>
              )}
            </div>
            {showClose && (
              <RadixDialog.Close
                aria-label="Cerrar"
                className="shrink-0 rounded-lg p-1.5 text-[#a1a1a6] transition hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
              >
                <X className="h-4 w-4" />
              </RadixDialog.Close>
            )}
          </div>
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

/** Pie de diálogo con botones alineados a la derecha; en móvil, a lo ancho. */
export function DialogFooter({ children }: { children: ReactNode }) {
  return (
    <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3 [&>button]:justify-center">
      {children}
    </div>
  );
}
