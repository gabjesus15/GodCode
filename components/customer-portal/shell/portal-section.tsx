"use client";

import type { ReactNode } from "react";

export type PortalSectionProps = {
  children: ReactNode;
  className?: string;
};

/** Contenedor estándar de bloque en el portal: tarjeta con padding coherente. */
export function PortalSection({ children, className = "" }: PortalSectionProps) {
  return (
    <section
      className={`rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm shadow-indigo-500/[0.03] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-indigo-500/[0.04] md:p-8 ${className}`}
    >
      {children}
    </section>
  );
}
