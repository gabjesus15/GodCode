import { Search } from "lucide-react";
import { cn } from "@/utils/cn";

interface SaasFilterBarProps {
  children: React.ReactNode;
  className?: string;
}

export function SaasFilterBar({ children, className }: SaasFilterBarProps) {
  return (
    <div role="group" aria-label="Filtros" className={cn("flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center", className)}>
      {children}
    </div>
  );
}

interface SaasSearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  wrapperClassName?: string;
}

export function SaasSearchInput({ wrapperClassName, className, ...props }: SaasSearchInputProps) {
  return (
    <div className={cn("relative w-full min-w-0 sm:max-w-xs", wrapperClassName)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden />
      <input
        type="text"
        className={cn(
          "h-9 w-full min-w-0 rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 sm:min-w-[12rem]",
          className,
        )}
        {...props}
      />
    </div>
  );
}
