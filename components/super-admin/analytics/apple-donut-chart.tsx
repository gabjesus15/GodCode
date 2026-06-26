"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/utils/cn";

export interface DonutSegment {
  name: string;
  value: number;
  color: string;
}

interface AppleDonutChartProps {
  data: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  gap?: number;
  className?: string;
  showLegend?: boolean;
  centerLabel?: string;
  centerValue?: string;
}

export function AppleDonutChart({
  data,
  size = 180,
  strokeWidth = 22,
  gap = 3,
  className,
  showLegend = true,
  centerLabel,
  centerValue,
}: AppleDonutChartProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const segments = useMemo(() => {
    return data.reduce<
      Array<DonutSegment & { pct: number; length: number; drawLength: number; offset: number }>
    >((acc, segment) => {
      const pct = total > 0 ? segment.value / total : 0;
      const length = pct * circumference;
      const drawLength = Math.max(0, length - (data.length > 1 ? gap : 0));
      const offset = acc.reduce((sum, s) => sum + s.length, 0);
      acc.push({ ...segment, pct, length, drawLength, offset });
      return acc;
    }, []);
  }, [data, total, circumference, gap]);

  const displayValue = centerValue ?? total.toLocaleString("es-CL");
  const displayLabel = centerLabel ?? (total === 1 ? "evento" : "vistas");

  if (data.length === 0 || total === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center text-zinc-400",
          className,
        )}
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
          />
        </svg>
        <p className="mt-2 text-xs">Sin datos</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="relative mx-auto" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90 transform"
        >
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#f4f4f5"
            strokeWidth={strokeWidth}
          />
          {segments.map((segment) => (
            <motion.circle
              key={segment.name}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={hovered === segment.name ? strokeWidth + 2 : strokeWidth}
              strokeDasharray={`${segment.drawLength} ${circumference - segment.drawLength}`}
              strokeDashoffset={-segment.offset}
              strokeLinecap={data.length > 1 ? "round" : "butt"}
              initial={{ strokeDasharray: `0 ${circumference}` }}
              animate={{
                strokeDasharray: `${segment.drawLength} ${circumference - segment.drawLength}`,
              }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="cursor-pointer"
              style={{
                opacity: hovered && hovered !== segment.name ? 0.35 : 1,
                filter: hovered === segment.name ? "brightness(1.05)" : "none",
              }}
              onMouseEnter={() => setHovered(segment.name)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-2xl">
            {displayValue}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
            {displayLabel}
          </span>
        </div>
      </div>

      {showLegend && (
        <div className="mt-5 space-y-2">
          {segments.map((segment) => (
            <button
              key={segment.name}
              type="button"
              onMouseEnter={() => setHovered(segment.name)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(segment.name)}
              onBlur={() => setHovered(null)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left transition",
                hovered === segment.name ? "bg-zinc-50 dark:bg-zinc-800/60" : "",
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: segment.color }}
                />
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  {segment.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                  {segment.value.toLocaleString("es-CL")}
                </span>
                <span className="text-[10px] tabular-nums text-zinc-400">
                  {Math.round(segment.pct * 100)}%
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
