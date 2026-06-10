"use client";

import { AlertTriangle } from "lucide-react";

interface OrderIntakePausedBannerProps {
  message?: string | null;
}

export function OrderIntakePausedBanner({ message }: OrderIntakePausedBannerProps) {
  const displayMessage = message || "Tenemos mucha demanda por el momento. Vuelve a intentar en unos minutos.";

  return (
    <div className="w-full bg-amber-50 border-b border-amber-200 px-4 py-3 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center gap-x-4">
        <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-amber-100">
          <AlertTriangle className="h-6 w-6 text-amber-600" aria-hidden="true" />
        </div>
        <div className="flex-auto">
          <p className="text-sm font-medium leading-6 text-amber-900">
            <strong className="font-semibold text-amber-900 mr-2">Pedidos Pausados.</strong>
            {displayMessage}
          </p>
        </div>
      </div>
    </div>
  );
}
