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
          ? "rounded-2xl"
          : "rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900",
        className,
      )}
    >
      <table className={cn("w-full text-left", compact ? "text-[13px]" : "text-sm")}>
        <thead>
          <tr
            className={cn(
              "border-b dark:border-zinc-800",
              isApple
                ? "border-zinc-100 bg-transparent"
                : "border-zinc-100",
            )}
          >
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400",
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
                    : "border-zinc-100 text-zinc-700 hover:bg-zinc-50/70 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800/40",
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
