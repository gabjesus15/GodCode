"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/utils/cn";

interface Tab {
  id: string;
  label: string;
}

interface SaasChartCardProps {
  title: string;
  description?: string;
  tabs?: Tab[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function SaasChartCard({
  title,
  description,
  tabs,
  activeTab,
  onTabChange,
  children,
  className,
}: SaasChartCardProps) {
  return (
    <Card
      className={cn(
        "rounded-3xl border-zinc-200/60 bg-white p-5 shadow-sm dark:border-zinc-800/60 dark:bg-zinc-900/80 sm:p-6",
        className,
      )}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
          {description ? <p className="text-sm text-zinc-500 dark:text-zinc-400">{description}</p> : null}
        </div>
        {tabs && tabs.length > 0 ? (
          <div className="flex rounded-xl bg-zinc-100 p-0.5 dark:bg-zinc-800">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange?.(tab.id)}
                className={cn(
                  "rounded-lg px-3 py-1 text-xs font-medium transition",
                  activeTab === tab.id
                    ? "bg-white text-indigo-600 shadow-sm dark:bg-zinc-700 dark:text-indigo-400"
                    : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {children}
    </Card>
  );
}
