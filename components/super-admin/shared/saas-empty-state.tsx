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
        "flex flex-col items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-6 py-14 text-center dark:border-zinc-800 dark:bg-zinc-900",
        className,
      )}
    >
      <Icon className="h-6 w-6 text-zinc-300 dark:text-zinc-600" aria-hidden />
      <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{title}</h3>
      {description && (
        <p className="max-w-xs text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
