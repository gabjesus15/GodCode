import { cn } from "@/utils/cn";

interface SaasEmptyStateProps {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function SaasEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: SaasEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-3xl border border-zinc-200/60 bg-white px-6 py-12 text-center shadow-sm dark:border-zinc-800/60 dark:bg-zinc-900/80",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
        <Icon className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
      {description && (
        <p className="mt-1 max-w-xs text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
