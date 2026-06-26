"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface SeriesConfig {
  key: string;
  label: string;
  color: string;
}

interface AppleMultiAreaChartProps {
  data: Array<Record<string, string | number>>;
  indexKey: string;
  series: SeriesConfig[];
  className?: string;
  height?: number;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/95">
      <p className="mb-1 text-xs font-medium text-zinc-500">{label}</p>
      <div className="space-y-1">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-xs text-zinc-600 dark:text-zinc-300">{entry.name}</span>
            <span className="ml-auto text-xs font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
              {Number(entry.value).toLocaleString("es-CL")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AppleMultiAreaChart({
  data,
  indexKey,
  series,
  className = "",
  height = 320,
}: AppleMultiAreaChartProps) {
  const hasData = data.some((row) => series.some((s) => Number(row[s.key] ?? 0) > 0));

  if (!hasData) {
    return (
      <div className={`flex h-[${height}px] flex-col items-center justify-center gap-2 text-zinc-400 ${className}`}>
        <p className="text-sm">Sin datos suficientes</p>
      </div>
    );
  }

  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`gradient-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={s.color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e5e5e7" />
          <XAxis
            dataKey={indexKey}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#a1a1aa", fontSize: 11, fontWeight: 500 }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#a1a1aa", fontSize: 11, fontWeight: 500 }}
            tickFormatter={(value) => Number(value).toLocaleString("es-CL")}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#d1d1d6", strokeWidth: 1 }} />
          {series.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              fill={`url(#gradient-${s.key})`}
              animationDuration={1200}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
