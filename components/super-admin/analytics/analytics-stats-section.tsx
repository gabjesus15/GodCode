"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Eye,
  Users,
  Globe,
  Store,
  LayoutDashboard,
} from "lucide-react";

import { SaasDataTable } from "@/components/super-admin/shared/saas-data-table";
import { useSaasListAnimate } from "@/components/super-admin/shared/use-saas-list-animate";
import { cn } from "@/utils/cn";

interface BusinessRow {
  companyId: string | null;
  slug: string;
  companyName: string;
  views: number;
  uniqueVisitors: number;
}

interface EventRow {
  eventName: string;
  count: number;
}

interface AnalyticsStatsProps {
  totalViews: number;
  uniqueVisitors: number;
  landingViews: number;
  tenantViews: number;
  saasViews: number;
  businessesTop: BusinessRow[];
  eventsTop: EventRow[];
}

const KPI_ITEMS = [
  { key: "totalViews", label: "Vistas", icon: Eye, color: "#007AFF", bg: "bg-blue-50 dark:bg-blue-950/30" },
  { key: "uniqueVisitors", label: "Únicos", icon: Users, color: "#34C759", bg: "bg-green-50 dark:bg-green-950/30" },
  { key: "landingViews", label: "Landing", icon: Globe, color: "#5856D6", bg: "bg-indigo-50 dark:bg-indigo-950/30" },
  { key: "tenantViews", label: "Negocios", icon: Store, color: "#FF9500", bg: "bg-orange-50 dark:bg-orange-950/30" },
  { key: "saasViews", label: "SaaS", icon: LayoutDashboard, color: "#FF2D55", bg: "bg-rose-50 dark:bg-rose-950/30" },
];

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(1, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
  delay = 0,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
      className="flex items-center gap-3 rounded-2xl border border-zinc-200/60 bg-white p-3 shadow-sm dark:border-zinc-800/60 dark:bg-zinc-900/80"
    >
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", bg)}>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">{label}</p>
        <p className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          {value}
        </p>
      </div>
    </motion.div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
        <Icon className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
      </div>
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
    </div>
  );
}

export function AnalyticsStatsSection({
  totalViews,
  uniqueVisitors,
  landingViews,
  tenantViews,
  saasViews,
  businessesTop,
  eventsTop,
}: AnalyticsStatsProps) {
  const [businessRef] = useSaasListAnimate<HTMLDivElement>();
  const [eventsRef] = useSaasListAnimate<HTMLDivElement>();

  const kpiValues: Record<string, string> = {
    totalViews: totalViews.toLocaleString("es-CL"),
    uniqueVisitors: uniqueVisitors.toLocaleString("es-CL"),
    landingViews: landingViews.toLocaleString("es-CL"),
    tenantViews: tenantViews.toLocaleString("es-CL"),
    saasViews: saasViews.toLocaleString("es-CL"),
  };

  const maxBusinessViews = businessesTop[0]?.views ?? 0;
  const maxEventCount = eventsTop[0]?.count ?? 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {KPI_ITEMS.map((item, idx) => (
          <KpiCard
            key={item.key}
            label={item.label}
            value={kpiValues[item.key]}
            icon={item.icon}
            color={item.color}
            bg={item.bg}
            delay={idx * 0.04}
          />
        ))}
      </div>

      {/* Tables */}
      <div className="grid gap-6 xl:grid-cols-2">
        <div ref={businessRef}>
          <SectionTitle icon={Store} title="Top negocios" />
          <div className="rounded-3xl border border-zinc-200/60 bg-white p-1 shadow-sm dark:border-zinc-800/60 dark:bg-zinc-900/80">
            <SaasDataTable
              data={businessesTop}
              rowKey={(r) => `${r.companyId ?? r.slug}`}
              emptyMessage="Sin datos de negocio todavía."
              variant="apple"
              columns={[
                {
                  key: "rank",
                  header: "#",
                  className: "w-10 text-center text-zinc-400",
                  render: (_, index) => <span className="text-xs font-semibold text-zinc-400">#{index + 1}</span>,
                },
                {
                  key: "name",
                  header: "Negocio",
                  render: (r) => (
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {r.companyName.charAt(0).toUpperCase()}
                      </div>
                      <Link
                        href={r.companyId ? `/companies/${r.companyId}` : `#`}
                        className={cn(
                          "truncate text-sm font-medium",
                          r.companyId
                            ? "text-zinc-900 hover:text-indigo-600 dark:text-zinc-100 dark:hover:text-indigo-400"
                            : "text-zinc-500",
                        )}
                      >
                        {r.companyName}
                      </Link>
                    </div>
                  ),
                },
                {
                  key: "views",
                  header: "Vistas",
                  className: "w-28",
                  render: (r) => (
                    <div className="space-y-1">
                      <span className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        {r.views.toLocaleString("es-CL")}
                      </span>
                      <ProgressBar value={r.views} max={maxBusinessViews} color="#34C759" />
                    </div>
                  ),
                },
                {
                  key: "visitors",
                  header: "Únicos",
                  className: "w-20 text-right",
                  render: (r) => (
                    <span className="text-xs text-zinc-500">{r.uniqueVisitors.toLocaleString("es-CL")}</span>
                  ),
                },
              ]}
            />
          </div>
        </div>

        <div ref={eventsRef}>
          <SectionTitle icon={LayoutDashboard} title="Eventos" />
          <div className="rounded-3xl border border-zinc-200/60 bg-white p-1 shadow-sm dark:border-zinc-800/60 dark:bg-zinc-900/80">
            <SaasDataTable
              data={eventsTop}
              rowKey={(r) => r.eventName}
              emptyMessage="Sin eventos todavía."
              variant="apple"
              columns={[
                {
                  key: "rank",
                  header: "#",
                  className: "w-10 text-center text-zinc-400",
                  render: (_, index) => <span className="text-xs font-semibold text-zinc-400">#{index + 1}</span>,
                },
                {
                  key: "event",
                  header: "Evento",
                  render: (r) => (
                    <span className="inline-flex items-center rounded-lg bg-zinc-100 px-2.5 py-1 font-mono text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {r.eventName}
                    </span>
                  ),
                },
                {
                  key: "count",
                  header: "Conteo",
                  className: "w-40",
                  render: (r) => (
                    <div className="space-y-1">
                      <span className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        {r.count.toLocaleString("es-CL")}
                      </span>
                      <ProgressBar value={r.count} max={maxEventCount} color="#FF9500" />
                    </div>
                  ),
                },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
