"use client";

import { useState } from "react";

import { cn } from "@/utils/cn";
import {
	adminSegmentedTabActive,
	adminSegmentedTabBase,
	adminSegmentedTabInactive,
} from "@/components/super-admin/shell/admin-tab-styles";

interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface CompanyTabsProps {
  tabs: TabItem[];
  initialId?: string;
}

export function CompanyTabs({ tabs, initialId }: CompanyTabsProps) {
  const [activeId, setActiveId] = useState(
    initialId ?? (tabs[0] ? tabs[0].id : "")
  );

  return (
    <div className="flex min-w-0 flex-col gap-4 sm:gap-8">
      <div className="flex min-w-0 overflow-x-auto rounded-2xl border border-zinc-200 bg-white/80 p-2 shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/80 sm:flex-wrap sm:overflow-visible sm:p-3">
        <div className="flex gap-2 sm:flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveId(tab.id)}
              className={cn(
                adminSegmentedTabBase,
                activeId === tab.id ? adminSegmentedTabActive : adminSegmentedTabInactive
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-w-0 space-y-4 sm:space-y-6">
        {tabs.map((tab) => (
          <div key={tab.id} className={activeId === tab.id ? "block" : "hidden"}>
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  );
}
