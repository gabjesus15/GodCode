"use client";

import { motion } from "framer-motion";
import { cn } from "@/utils/cn";

interface Tab {
  id: string;
  label: string;
  badge?: number;
}

interface SaasSegmentedTabsProps {
  tabs: Tab[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}

export function SaasSegmentedTabs({ tabs, value, onChange, className }: SaasSegmentedTabsProps) {
  return (
    <div
      className={cn(
        "inline-flex rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800",
        className,
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "relative rounded-lg px-3 py-1.5 text-xs font-medium transition",
            value === tab.id
              ? "text-zinc-900 dark:text-zinc-100"
              : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200",
          )}
        >
          {value === tab.id && (
            <motion.div
              layoutId="saas-segmented-tab"
              className="absolute inset-0 rounded-lg bg-white shadow-sm dark:bg-zinc-700"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="rounded-full bg-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-600 dark:text-zinc-200">
                {tab.badge > 99 ? "99+" : tab.badge}
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}
