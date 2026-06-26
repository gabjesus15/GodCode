"use client";

import { useState } from "react";
import { SaasSegmentedTabs } from "@/components/super-admin/shared/saas-segmented-tabs";

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
  const [activeId, setActiveId] = useState(initialId ?? (tabs[0] ? tabs[0].id : ""));

  return (
    <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
      <SaasSegmentedTabs
        tabs={tabs.map((tab) => ({ id: tab.id, label: tab.label }))}
        value={activeId}
        onChange={setActiveId}
      />

      <div className="min-w-0">
        {tabs.map((tab) => (
          <div key={tab.id} className={activeId === tab.id ? "block" : "hidden"}>
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  );
}
