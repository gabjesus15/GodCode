import { cn } from "@/utils/cn";

interface CompanySectionCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function CompanySectionCard({ title, description, children, className }: CompanySectionCardProps) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-zinc-200/60 bg-white p-5 shadow-sm dark:border-zinc-800/60 dark:bg-zinc-900/80 sm:p-6",
        className,
      )}
    >
      <div className="mb-5">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 sm:text-lg">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
