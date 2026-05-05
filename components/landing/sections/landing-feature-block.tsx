import type { ReactNode } from "react";
import { Check } from "lucide-react";

import { cn } from "@/utils/cn";
import { LandingReveal } from "../widgets/landing-reveal";

export function LandingFeatureBlock({
  eyebrow,
  title,
  description,
  bullets,
  visual,
  reversed = false,
  delay = 0,
}: {
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  visual: ReactNode;
  reversed?: boolean;
  delay?: number;
}) {
  return (
    <div className={cn(
      "mx-auto grid max-w-7xl items-center gap-8 px-5 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8",
      reversed && "lg:[&>*:first-child]:order-2",
    )}>
      <LandingReveal delay={delay} direction={reversed ? "right" : "left"}>
        <div className="relative">
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-indigo-50/80 to-violet-50/40 blur-xl dark:from-indigo-950/30 dark:to-violet-950/20" />
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-xl shadow-indigo-500/5 dark:border-zinc-800 dark:bg-zinc-900/80">
            {visual}
          </div>
        </div>
      </LandingReveal>

      <LandingReveal delay={delay + 0.1} direction={reversed ? "left" : "right"}>
        <div className="lg:max-w-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
            {eyebrow}
          </p>
          <h3 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            {title}
          </h3>
          <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base dark:text-zinc-400">
            {description}
          </p>
          <ul className="mt-6 space-y-3">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-3 text-sm text-slate-700 sm:text-base dark:text-zinc-300">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950/60">
                  <Check className="h-3 w-3 text-indigo-600 dark:text-indigo-400" aria-hidden />
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>
      </LandingReveal>
    </div>
  );
}
