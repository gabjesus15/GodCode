"use client";

import { cn } from "@/utils/cn";

interface Column<T> {
  key: string;
  header: string;
  className?: string;
  render: (row: T, index: number) => React.ReactNode;
}

interface SaasDataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
  className?: string;
  compact?: boolean;
  variant?: "default" | "apple";
}

export function SaasDataTable<T>({
  columns,
  data,
  rowKey,
  emptyMessage = "Sin datos.",
  className,
  compact = true,
  variant = "default",
}: SaasDataTableProps<T>) {
  const isApple = variant === "apple";

  return (
    <div
      className={cn(
        "overflow-x-auto",
        isApple
          ? "rounded-3xl"
          : "rounded-2xl border border-zinc-200 bg-white/90 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80",
        className,
      )}
    >
      <table className={cn("w-full", compact ? "text-xs" : "text-sm")}>
        <thead>
          <tr
            className={cn(
              "border-b dark:border-zinc-800",
              isApple
                ? "border-zinc-100 bg-transparent"
                : "border-zinc-200 bg-zinc-50/80 dark:border-zinc-700 dark:bg-zinc-800/50",
            )}
          >
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-4 py-3 text-left font-medium text-zinc-400 dark:text-zinc-500",
                  !isApple && "font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400",
                  col.className,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-zinc-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={rowKey(row)}
                className={cn(
                  "border-b transition last:border-b-0",
                  isApple
                    ? "border-zinc-50 hover:bg-zinc-50/50 dark:border-zinc-900 dark:hover:bg-zinc-800/30"
                    : "border-zinc-100 text-zinc-800 dark:border-zinc-800 dark:text-zinc-200",
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn("px-4 py-3", col.className)}>
                    {col.render(row, rowIndex)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
