"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/utils/cn";
import { useSaasBreakpoint } from "./use-saas-breakpoint";

interface MasterDetailLayoutProps<T> {
  items: T[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  renderListItem: (item: T, selected: boolean) => React.ReactNode;
  renderDetail: (item: T, onClose: () => void) => React.ReactNode;
  listKey: (item: T) => string;
  emptyState?: React.ReactNode;
  listClassName?: string;
  detailClassName?: string;
  className?: string;
}

export function MasterDetailLayout<T>({
  items,
  selectedId,
  onSelect,
  renderListItem,
  renderDetail,
  listKey,
  emptyState,
  listClassName,
  detailClassName,
  className,
}: MasterDetailLayoutProps<T>) {
  const { isDesktop } = useSaasBreakpoint(1024);
  const selectedItem = items.find((item) => listKey(item) === selectedId);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  function handleSelect(id: string) {
    onSelect(id);
    if (!isDesktop) {
      setMobileDetailOpen(true);
    }
  }

  function handleClose() {
    onSelect(null);
    setMobileDetailOpen(false);
  }

  return (
    <div className={cn("grid gap-0 overflow-hidden rounded-3xl border border-zinc-200/60 bg-white shadow-sm dark:border-zinc-800/60 dark:bg-zinc-900/80 lg:grid-cols-[minmax(280px,380px)_1fr]", className)}>
      {/* List */}
      <div
        className={cn(
          "min-h-[320px] border-b border-zinc-100 dark:border-zinc-800",
          isDesktop ? "border-b-0 border-r" : "",
          listClassName,
        )}
      >
        {items.length === 0 && emptyState ? (
          <div className="p-6">{emptyState}</div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {items.map((item) => (
              <button
                key={listKey(item)}
                type="button"
                onClick={() => handleSelect(listKey(item))}
                className="w-full text-left"
              >
                {renderListItem(item, listKey(item) === selectedId)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Desktop detail */}
      {isDesktop && (
        <div className={cn("min-h-[320px] bg-zinc-50/30 dark:bg-zinc-950/20", detailClassName)}>
          {selectedItem ? (
            renderDetail(selectedItem, handleClose)
          ) : (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 text-zinc-400">
              <p className="text-sm">Selecciona un elemento para ver el detalle</p>
            </div>
          )}
        </div>
      )}

      {/* Mobile drawer-like detail */}
      {!isDesktop && mobileDetailOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-zinc-950">
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Detalle</span>
            <button
              type="button"
              onClick={handleClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800"
            >
              <X className="h-4 w-4 text-zinc-500" />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4">{renderDetail(selectedItem, handleClose)}</div>
        </div>
      )}
    </div>
  );
}
