"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
);

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

export function AnalyticsGlobalChart({ events, fromIso }: Props) {
  const [isDark, setIsDark] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "type">("general");

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Theme-aware colors
  const colors = useMemo(() => {
    return {
      text: isDark ? "#e4e4e7" : "#3f3f46",
      grid: isDark ? "rgba(63, 63, 70, 0.3)" : "rgba(228, 228, 231, 0.6)",
      primary: "#6366f1", // Indigo
      primaryLight: isDark ? "rgba(99, 102, 241, 0.2)" : "rgba(99, 102, 241, 0.1)",
      secondary: "#10b981", // Emerald
      secondaryLight: isDark ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.1)",
      accent: "#f59e0b", // Amber
      accentLight: isDark ? "rgba(245, 158, 11, 0.2)" : "rgba(245, 158, 11, 0.1)",
    };
  }, [isDark]);

  // Aggregate daily data
  const chartData = useMemo(() => {
    // Generate dates in range
    const datesMap = new Map<string, { views: number; visitors: Set<string>; landing: number; tenant: number; saas: number }>();
    const start = new Date(fromIso);
    const end = new Date();

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      datesMap.set(dateStr, { views: 0, visitors: new Set<string>(), landing: 0, tenant: 0, saas: 0 });
    }

    // Process events
    for (const e of events) {
      const dateStr = e.created_at.slice(0, 10);
      if (datesMap.has(dateStr)) {
        const data = datesMap.get(dateStr)!;
        data.views += 1;
        if (e.visitor_id) data.visitors.add(e.visitor_id);
        if (e.page_type === "landing") data.landing += 1;
        else if (e.page_type === "tenant") data.tenant += 1;
        else if (e.page_type === "saas") data.saas += 1;
      }
    }

    const labels = [...datesMap.keys()];
    const dailyData = [...datesMap.values()];

    return {
      labels: labels.map(l => {
        const [_, m, d] = l.split("-");
        return `${d}/${m}`;
      }),
      views: dailyData.map(d => d.views),
      visitors: dailyData.map(d => d.visitors.size),
      landing: dailyData.map(d => d.landing),
      tenant: dailyData.map(d => d.tenant),
      saas: dailyData.map(d => d.saas),
    };
  }, [events, fromIso]);

  // General chart datasets
  const generalData = {
    labels: chartData.labels,
    datasets: [
      {
        label: "Vistas Totales",
        data: chartData.views,
        borderColor: colors.primary,
        backgroundColor: colors.primaryLight,
        fill: true,
        tension: 0.3,
        pointRadius: chartData.labels.length > 30 ? 1 : 3,
      },
      {
        label: "Visitantes Únicos",
        data: chartData.visitors,
        borderColor: colors.secondary,
        backgroundColor: colors.secondaryLight,
        fill: true,
        tension: 0.3,
        pointRadius: chartData.labels.length > 30 ? 1 : 3,
      }
    ]
  };

  // Stacked chart datasets by Page Type
  const typeData = {
    labels: chartData.labels,
    datasets: [
      {
        label: "Landing Page",
        data: chartData.landing,
        backgroundColor: colors.primary,
      },
      {
        label: "Páginas de Negocios",
        data: chartData.tenant,
        backgroundColor: colors.secondary,
      },
      {
        label: "Panel SaaS (Admin)",
        data: chartData.saas,
        backgroundColor: colors.accent,
      }
    ]
  };

  // Doughnut metrics: Page Type proportion
  const doughnutTypeData = useMemo(() => {
    let landing = 0, tenant = 0, saas = 0;
    for (const e of events) {
      if (e.page_type === "landing") landing++;
      else if (e.page_type === "tenant") tenant++;
      else if (e.page_type === "saas") saas++;
    }
    return {
      labels: ["Landing", "Negocios", "SaaS Admin"],
      datasets: [{
        data: [landing, tenant, saas],
        backgroundColor: [colors.primary, colors.secondary, colors.accent],
        borderWidth: isDark ? 1 : 0,
        borderColor: isDark ? "#1f2937" : "#ffffff",
      }]
    };
  }, [events, colors, isDark]);

  // Doughnut metrics: Countries proportion
  const doughnutCountryData = useMemo(() => {
    const agg = new Map<string, number>();
    for (const e of events) {
      if (e.country_code) {
        const cc = e.country_code.toUpperCase();
        agg.set(cc, (agg.get(cc) ?? 0) + 1);
      }
    }
    const sorted = [...agg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const labels = sorted.map(([cc]) => cc);
    const data = sorted.map(([_, count]) => count);
    
    // Add others if any
    const totalTop = data.reduce((sum, n) => sum + n, 0);
    const others = events.length - totalTop;
    if (others > 0 && sorted.length > 0) {
      labels.push("Otros");
      data.push(others);
    }

    return {
      labels: labels.length > 0 ? labels : ["Sin Datos"],
      datasets: [{
        data: data.length > 0 ? data : [1],
        backgroundColor: [colors.primary, colors.secondary, colors.accent, "#f43f5e", "#8b5cf6", "#64748b"],
        borderWidth: isDark ? 1 : 0,
        borderColor: isDark ? "#1f2937" : "#ffffff",
      }]
    };
  }, [events, colors, isDark]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: colors.text, font: { family: "Outfit, sans-serif", size: 12 } }
      },
      tooltip: {
        titleFont: { family: "Outfit, sans-serif" },
        bodyFont: { family: "Outfit, sans-serif" },
      }
    },
    scales: {
      x: {
        grid: { color: colors.grid },
        ticks: { color: colors.text, font: { family: "Outfit, sans-serif" } }
      },
      y: {
        grid: { color: colors.grid },
        ticks: { color: colors.text, font: { family: "Outfit, sans-serif" } },
        beginAtZero: true
      }
    }
  };

  const stackedOptions = {
    ...chartOptions,
    scales: {
      x: { ...chartOptions.scales.x, stacked: true },
      y: { ...chartOptions.scales.y, stacked: true }
    }
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: { color: colors.text, font: { family: "Outfit, sans-serif", size: 11 } }
      }
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main trend chart */}
      <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white/95 p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80 lg:col-span-2">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Tendencia de Tráfico</h3>
            <p className="text-xs text-zinc-500">Comportamiento del tráfico global en el periodo seleccionado.</p>
          </div>
          <div className="flex rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800">
            <button
              onClick={() => setActiveTab("general")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                activeTab === "general"
                  ? "bg-white text-indigo-600 shadow-sm dark:bg-zinc-700 dark:text-indigo-400"
                  : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              General
            </button>
            <button
              onClick={() => setActiveTab("type")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                activeTab === "type"
                  ? "bg-white text-indigo-600 shadow-sm dark:bg-zinc-700 dark:text-indigo-400"
                  : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              Por Tipo de Página
            </button>
          </div>
        </div>

        <div className="h-[320px] w-full">
          {activeTab === "general" ? (
            <Line data={generalData} options={chartOptions} />
          ) : (
            <Bar data={typeData} options={stackedOptions} />
          )}
        </div>
      </div>

      {/* Doughnut distribution charts */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
        {/* Page type doughnut */}
        <div className="rounded-2xl border border-zinc-200 bg-white/95 p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Distribución por Sección</h3>
          <p className="text-xs text-zinc-500 mb-4">Páginas de procedencia.</p>
          <div className="h-[180px] w-full">
            <Doughnut data={doughnutTypeData} options={pieOptions} />
          </div>
        </div>

        {/* Country distribution doughnut */}
        <div className="rounded-2xl border border-zinc-200 bg-white/95 p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Distribución por País</h3>
          <p className="text-xs text-zinc-500 mb-4">Top orígenes de tráfico.</p>
          <div className="h-[180px] w-full">
            <Doughnut data={doughnutCountryData} options={pieOptions} />
          </div>
        </div>
      </div>
    </div>
  );
}
