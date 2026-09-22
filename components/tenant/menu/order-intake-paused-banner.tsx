"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

interface OrderIntakePausedBannerProps {
  message?: string | null;
}

export function OrderIntakePausedBanner({ message }: OrderIntakePausedBannerProps) {
  const t = useTranslations("tenant.menu");
  const displayMessage = message || t("paused.fallback");

  return (
    <div className="w-full bg-amber-50 border-b border-amber-200 px-4 py-3 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center gap-x-4">
        <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-amber-100">
          <AlertTriangle className="h-6 w-6 text-amber-600" aria-hidden="true" />
        </div>
        <div className="flex-auto">
          <p className="text-sm font-medium leading-6 text-amber-900">
            <strong className="font-semibold text-amber-900 mr-2">{t("paused.title")}</strong>
            {displayMessage}
          </p>
        </div>
      </div>
    </div>
  );
}
