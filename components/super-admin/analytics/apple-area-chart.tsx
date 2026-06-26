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

interface ChartRow {
  date: string;
  views: number;
  visitors: number;
}

interface AppleAreaChartProps {
  data: ChartRow[];
  className?: string;
}

function CustomTooltip({ active, payload, label }: {
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
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-zinc-600 dark:text-zinc-300">{entry.name}</span>
            <span className="ml-auto text-xs font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
              {entry.value.toLocaleString("es-CL")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AppleAreaChart({ data, className }: AppleAreaChartProps) {
  const hasData = data.some((d) => d.views > 0 || d.visitors > 0);

  if (!hasData) {
    return (
      <div className={`flex h-full flex-col items-center justify-center gap-2 text-zinc-400 ${className}`}>
        <p className="text-sm">Sin datos suficientes</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#007AFF" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#007AFF" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#34C759" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#34C759" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="4 4"
            vertical={false}
            stroke="#e5e5e7"
          />
          <XAxis
            dataKey="date"
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
          <Area
            type="monotone"
            dataKey="views"
            name="Vistas totales"
            stroke="#007AFF"
            strokeWidth={2.5}
            fill="url(#colorViews)"
            animationDuration={1200}
          />
          <Area
            type="monotone"
            dataKey="visitors"
            name="Visitantes únicos"
            stroke="#34C759"
            strokeWidth={2.5}
            fill="url(#colorVisitors)"
            animationDuration={1200}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
