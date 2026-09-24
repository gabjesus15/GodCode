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

import { AppleChartTooltip } from "./apple-chart-tooltip";

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
          <Tooltip content={<AppleChartTooltip />} cursor={{ fill: "#f4f4f5" }} />
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
