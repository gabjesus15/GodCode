import { Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/utils/cn";

interface SaasFilterBarProps {
  children: React.ReactNode;
  className?: string;
}

export function SaasFilterBar({ children, className }: SaasFilterBarProps) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-zinc-200/60 bg-white p-4 shadow-sm dark:border-zinc-800/60 dark:bg-zinc-900/80",
        className,
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
            <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
          </div>
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Filtros</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      </div>
    </div>
  );
}

interface SaasSearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  wrapperClassName?: string;
}

export function SaasSearchInput({ wrapperClassName, className, ...props }: SaasSearchInputProps) {
  return (
    <div className={cn("relative", wrapperClassName)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
      <input
        type="text"
        className={cn(
          "h-9 w-full min-w-[200px] rounded-xl border border-zinc-200/60 bg-zinc-50 py-1 pl-9 pr-3 text-xs font-medium text-zinc-700 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
          className,
        )}
        {...props}
      />
    </div>
  );
}
