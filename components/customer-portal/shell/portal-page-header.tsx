"use client";

import type { ReactNode } from "react";

export type PortalPageHeaderProps = {
  /** Etiqueta pequeña encima del título; omitir si la sección ya está clara en la barra lateral. */
  eyebrow?: string;
  title: string;
  description?: string;
  aside?: ReactNode;
  className?: string;
};

export function PortalPageHeader({ eyebrow, title, description, aside, className = "" }: PortalPageHeaderProps) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-6 ${className}`}>
      <div className="min-w-0 max-w-2xl border-l-2 border-indigo-500 pl-4 dark:border-indigo-400">
        {eyebrow ? (
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-indigo-600/90 dark:text-indigo-400/90">
            {eyebrow}
          </p>
        ) : null}
        <h2
          className={`text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-2xl ${eyebrow ? "mt-2" : ""}`}
        >
          {title}
        </h2>
        {description ? (
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{description}</p>
        ) : null}
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </div>
  );
}
