"use client";

import Link from "next/link";
import { cn } from "@/utils/cn";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

interface SaasMetricCardProps {
  label: string;
  value: string;
  helper?: string;
  href?: string;
  delta?: string;
  deltaType?: "increase" | "decrease" | "unchanged" | "moderateIncrease" | "moderateDecrease";
  icon?: React.ElementType;
  iconColor?: string;
}

function DeltaBadge({ delta, deltaType }: { delta: string; deltaType: SaasMetricCardProps["deltaType"] }) {
  const isPositive = deltaType === "increase" || deltaType === "moderateIncrease";
  const isNegative = deltaType === "decrease" || deltaType === "moderateDecrease";
  const Icon = isPositive ? ArrowUpRight : isNegative ? ArrowDownRight : Minus;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
        isPositive && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
        isNegative && "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
        !isPositive && !isNegative && "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {delta}
    </span>
  );
}

const CARD_CLASS =
  "flex h-full min-w-0 flex-col gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900";

/** Misma tarjeta que los KPI del Inicio: etiqueta con icono, cifra y una línea de ayuda. */
export function SaasMetricCard({
  label,
  value,
  helper,
  href,
  delta,
  deltaType = "unchanged",
  icon: Icon,
  iconColor = "text-zinc-400",
}: SaasMetricCardProps) {
  const inner = (
    <>
      <div className="flex min-w-0 items-center gap-2">
        {Icon ? <Icon className={cn("h-4 w-4 shrink-0", iconColor)} strokeWidth={1.75} aria-hidden /> : null}
        <p className="truncate text-[13px] text-zinc-500 dark:text-zinc-400">{label}</p>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <p className="truncate text-xl font-semibold tabular-nums leading-none tracking-tight text-zinc-950 dark:text-zinc-50">
          {value}
        </p>
        {delta ? <DeltaBadge delta={delta} deltaType={deltaType} /> : null}
      </div>
      {helper ? <p className="mt-auto min-w-0 text-[11px] leading-snug text-zinc-400 dark:text-zinc-500">{helper}</p> : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={`${CARD_CLASS} transition hover:border-zinc-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 dark:hover:border-zinc-700`}
      >
        {inner}
      </Link>
    );
  }

  return <div className={CARD_CLASS}>{inner}</div>;
}
