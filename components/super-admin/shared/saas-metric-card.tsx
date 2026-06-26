"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
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
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold",
        isPositive && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
        isNegative && "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300",
        !isPositive && !isNegative && "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
      )}
    >
      <Icon className="h-3 w-3" />
      {delta}
    </span>
  );
}

export function SaasMetricCard({
  label,
  value,
  helper,
  href,
  delta,
  deltaType = "unchanged",
  icon: Icon,
  iconColor = "text-zinc-500 dark:text-zinc-400",
}: SaasMetricCardProps) {
  const inner = (
    <Card
      className={cn(
        "flex h-full min-h-0 min-w-0 flex-col gap-2 rounded-3xl border-zinc-200/60 bg-white p-4 shadow-sm dark:border-zinc-800/60 dark:bg-zinc-900/80 sm:gap-3 sm:p-5",
        href && "transition hover:border-zinc-300 hover:shadow-md dark:hover:border-zinc-700",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</span>
        {Icon ? (
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
            <Icon className={cn("h-3.5 w-3.5", iconColor)} />
          </div>
        ) : null}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="truncate text-2xl font-semibold text-zinc-900 dark:text-zinc-100 sm:text-3xl">{value}</span>
        {delta ? <DeltaBadge delta={delta} deltaType={deltaType} /> : null}
      </div>
      {helper ? <p className="mt-auto min-w-0 text-sm leading-snug text-zinc-500 dark:text-zinc-400">{helper}</p> : null}
    </Card>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block h-full min-w-0 rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
      >
        {inner}
      </Link>
    );
  }

  return inner;
}
