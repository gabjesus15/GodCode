"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ChartRow {
  date: string;
  landing: number;
  tenant: number;
  saas: number;
}

interface AppleBarChartProps {
  data: ChartRow[];
  className?: string;
}

const COLORS = {
  landing: "#007AFF",
  tenant: "#34C759",
  saas: "#FF9500",
};

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

export function AppleBarChart({ data, className }: AppleBarChartProps) {
  const hasData = data.some((d) => d.landing > 0 || d.tenant > 0 || d.saas > 0);

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
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
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
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f4f4f5" }} />
          <Bar
            dataKey="landing"
            name="Landing"
            stackId="a"
            fill={COLORS.landing}
            radius={[0, 0, 0, 0]}
            animationDuration={1200}
          />
          <Bar
            dataKey="tenant"
            name="Negocios"
            stackId="a"
            fill={COLORS.tenant}
            radius={[0, 0, 0, 0]}
            animationDuration={1200}
          />
          <Bar
            dataKey="saas"
            name="SaaS Admin"
            stackId="a"
            fill={COLORS.saas}
            radius={[4, 4, 0, 0]}
            animationDuration={1200}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
