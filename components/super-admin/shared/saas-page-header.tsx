import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface SaasPageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ElementType;
  backHref?: string;
  backLabel?: string;
  action?: React.ReactNode;
}

export function SaasPageHeader({
  title,
  description,
  icon: Icon,
  backHref,
  backLabel = "Volver",
  action,
}: SaasPageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between" data-saas-page-header>
      <div className="min-w-0 flex-1">
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {backLabel}
          </Link>
        )}
        <div className="mt-1.5 flex min-w-0 items-center gap-3">
          {Icon && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
              <Icon className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
              {title}
            </h1>
            {description && (
              <p className="mt-0.5 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
            )}
          </div>
        </div>
      </div>
      {action && <div className="w-full shrink-0 sm:w-auto">{action}</div>}
    </div>
  );
}
