"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Globe2, PieChart } from "lucide-react";

import { AppleAreaChart } from "@/components/super-admin/analytics/apple-area-chart";
import { AppleBarChart } from "@/components/super-admin/analytics/apple-bar-chart";
import { AppleDonutChart } from "@/components/super-admin/analytics/apple-donut-chart";
import { eachUtcDayKeys, utcDateKey } from "@/lib/analytics/date-buckets";
import { cn } from "@/utils/cn";

type EventRow = {
  created_at: string;
  page_type: "landing" | "tenant" | "saas" | "unknown";
  visitor_id: string | null;
  company_id: string | null;
  tenant_slug: string | null;
  country_code: string | null;
  event_name: string | null;
};

type Props = {
  events: EventRow[];
  fromIso: string;
};

const IOS_COLORS = [
  "#007AFF", // Blue
  "#34C759", // Green
  "#FF9500", // Orange
  "#FF2D55", // Pink
  "#AF52DE", // Purple
  "#5856D6", // Indigo
  "#FF3B30", // Red
  "#5AC8FA", // Teal
];

function AppleCard({
  children,
  className,
  title,
  description,
  icon: Icon,
  action,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-zinc-200/60 bg-white p-5 shadow-sm dark:border-zinc-800/60 dark:bg-zinc-900/80 sm:p-6",
        className,
      )}
    >
      {(title || description || action) && (
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {Icon && (
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-50 dark:bg-zinc-800">
                <Icon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
              </div>
            )}
            <div>
              {title && (
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
              )}
              {description && <p className="text-xs text-zinc-500">{description}</p>}
            </div>
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

function SegmentedTabs({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="inline-flex rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={cn(
            "relative rounded-lg px-3 py-1.5 text-xs font-medium transition",
            value === opt.id
              ? "text-zinc-900 dark:text-zinc-100"
              : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200",
          )}
        >
          {value === opt.id && (
            <motion.div
              layoutId="chart-tab"
              className="absolute inset-0 rounded-lg bg-white shadow-sm dark:bg-zinc-700"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

export function AnalyticsGlobalChart({ events, fromIso }: Props) {
  const [activeTab, setActiveTab] = useState<"general" | "type">("general");

  const chartData = useMemo(() => {
    const datesMap = new Map<
      string,
      { views: number; visitors: Set<string>; landing: number; tenant: number; saas: number }
    >();

    for (const dateStr of eachUtcDayKeys(fromIso)) {
      datesMap.set(dateStr, { views: 0, visitors: new Set(), landing: 0, tenant: 0, saas: 0 });
    }

    for (const e of events) {
      const dateStr = utcDateKey(e.created_at);
      if (datesMap.has(dateStr)) {
        const data = datesMap.get(dateStr)!;
        data.views += 1;
        if (e.visitor_id) data.visitors.add(e.visitor_id);
        if (e.page_type === "landing") data.landing += 1;
        else if (e.page_type === "tenant") data.tenant += 1;
        else if (e.page_type === "saas") data.saas += 1;
      }
    }

    return [...datesMap.entries()].map(([date, row]) => {
      const [, m, d] = date.split("-");
      return {
        date: `${d}/${m}`,
        views: row.views,
        visitors: row.visitors.size,
        landing: row.landing,
        tenant: row.tenant,
        saas: row.saas,
      };
    });
  }, [events, fromIso]);

  const pageTypeData = useMemo(() => {
    let landing = 0;
    let tenant = 0;
    let saas = 0;
    for (const e of events) {
      if (e.page_type === "landing") landing++;
      else if (e.page_type === "tenant") tenant++;
      else if (e.page_type === "saas") saas++;
    }
    return [
      { name: "Landing", value: landing, color: IOS_COLORS[0] },
      { name: "Negocios", value: tenant, color: IOS_COLORS[1] },
      { name: "SaaS Admin", value: saas, color: IOS_COLORS[2] },
    ].filter((d) => d.value > 0);
  }, [events]);

  const countryData = useMemo(() => {
    const agg = new Map<string, number>();
    let withCountry = 0;
    for (const e of events) {
      if (!e.country_code) continue;
      withCountry += 1;
      const cc = e.country_code.toUpperCase();
      agg.set(cc, (agg.get(cc) ?? 0) + 1);
    }
    const sorted = [...agg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const totalTop = sorted.reduce((sum, [, n]) => sum + n, 0);
    const others = Math.max(0, withCountry - totalTop);
    const rows = sorted.map(([name, value], idx) => ({
      name,
      value,
      color: IOS_COLORS[idx % IOS_COLORS.length],
    }));
    if (others > 0 && sorted.length > 0) {
      rows.push({ name: "Otros", value: others, color: "#c7c7cc" });
    }
    return rows;
  }, [events]);

  const totals = useMemo(() => {
    const landing = events.filter((e) => e.page_type === "landing").length;
    const tenant = events.filter((e) => e.page_type === "tenant").length;
    const saas = events.filter((e) => e.page_type === "saas").length;
    return { landing, tenant, saas };
  }, [events]);

  const hasData = events.length > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Main trend chart */}
      <AppleCard
        className="lg:col-span-8"
        title="Tendencia de tráfico"
        description="Vistas y visitantes únicos en el periodo."
        icon={Activity}
        action={
          <SegmentedTabs
            options={[
              { id: "general", label: "General" },
              { id: "type", label: "Por tipo" },
            ]}
            value={activeTab}
            onChange={(id) => setActiveTab(id as "general" | "type")}
          />
        }
      >
        <div className="h-[320px] sm:h-[360px]">
          {activeTab === "general" ? (
            <AppleAreaChart data={chartData} className="h-full w-full" />
          ) : (
            <AppleBarChart data={chartData} className="h-full w-full" />
          )}
        </div>

        {hasData && (
          <div className="mt-5 grid grid-cols-3 gap-3 border-t border-zinc-100 pt-5 dark:border-zinc-800">
            <StatPill label="Landing" value={totals.landing} color="#007AFF" />
            <StatPill label="Negocios" value={totals.tenant} color="#34C759" />
            <StatPill label="SaaS Admin" value={totals.saas} color="#FF9500" />
          </div>
        )}
      </AppleCard>

      {/* Distribution donuts */}
      <div className="flex flex-col gap-6 lg:col-span-4">
        <AppleCard
          title="Distribución por sección"
          description="Procedencia del tráfico."
          icon={PieChart}
          className="flex-1"
        >
          <AppleDonutChart
            data={pageTypeData.length ? pageTypeData : [{ name: "Sin datos", value: 1, color: "#e5e5ea" }]}
            size={170}
            strokeWidth={20}
            className="mx-auto"
            centerLabel="Total"
            centerValue={events.length.toLocaleString("es-CL")}
          />
        </AppleCard>

        <AppleCard
          title="Distribución por país"
          description={
            countryData.length
              ? "Top orígenes de tráfico."
              : "Sin país detectado aún (el VPS no envía geo; se resuelve por IP en nuevos eventos)."
          }
          icon={Globe2}
          className="flex-1"
        >
          <AppleDonutChart
            data={countryData.length ? countryData : [{ name: "Sin datos", value: 1, color: "#e5e5ea" }]}
            size={170}
            strokeWidth={20}
            className="mx-auto"
            centerLabel="Visitas"
            centerValue={countryData
              .reduce((sum, d) => sum + d.value, 0)
              .toLocaleString("es-CL")}
          />
        </AppleCard>
      </div>
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-zinc-50 px-3 py-3 dark:bg-zinc-800/50">
      <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
      <span
        className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight"
        style={{ color }}
      >
        {value.toLocaleString("es-CL")}
      </span>
    </div>
  );
}
