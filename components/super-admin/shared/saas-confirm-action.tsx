"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { cn } from "@/utils/cn";

interface SaasConfirmActionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
  onConfirm: () => Promise<void> | void;
}

export function SaasConfirmAction({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "default",
  onConfirm,
}: SaasConfirmActionProps) {
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
      onOpenChange(false);
    }
  }

  const confirmStyles = {
    danger: "bg-red-600 text-white hover:bg-red-700",
    warning: "bg-amber-500 text-white hover:bg-amber-600",
    default: "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100",
  };

  return (
    <Modal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title={title}
      description={description}
      className="max-w-md"
    >
      <div className="flex items-start gap-3">
        {(variant === "danger" || variant === "warning") && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/30">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
        )}
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          disabled={loading}
          className="h-9 rounded-xl border border-zinc-200 bg-white px-4 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={loading}
          className={cn(
            "h-9 rounded-xl px-4 text-xs font-medium transition disabled:opacity-60",
            confirmStyles[variant],
          )}
        >
          {loading ? "Procesando..." : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
