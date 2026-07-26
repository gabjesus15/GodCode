import Link from "next/link";
import { ArrowLeft, BarChart3, Building2, SlidersHorizontal } from "lucide-react";

import { AnalyticsCountryMap } from "@/components/super-admin/analytics/analytics-country-map";
import { AnalyticsStatsSection } from "@/components/super-admin/analytics/analytics-stats-section";
import { TopCountriesSection } from "@/components/super-admin/analytics/top-countries-section";
import { DashboardPeriodTabs } from "@/components/super-admin/analytics/dashboard-period-tabs";
import { AnalyticsGlobalChart } from "@/components/super-admin/analytics/analytics-global-chart";
import {
  DASHBOARD_PERIODS,
  type DashboardPeriod,
  periodStartIso,
} from "@/lib/super-admin/super-admin-metrics";
import { fetchAnalyticsEventsPaged } from "@/lib/analytics/fetch-analytics-events";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";

export const dynamic = "force-dynamic";

type EventRow = {
  created_at: string;
  page_type: "landing" | "tenant" | "saas" | "unknown";
  visitor_id: string | null;
  company_id: string | null;
  tenant_slug: string | null;
  country_code: string | null;
  event_name: string | null;
};

type CompanyOption = {
  id: string;
  name: string | null;
  public_slug: string | null;
};

function parsePeriod(raw: string | undefined): DashboardPeriod {
  const allowed = new Set(DASHBOARD_PERIODS.map((p) => p.value));
  if (raw && allowed.has(raw as DashboardPeriod)) return raw as DashboardPeriod;
  return "30";
}

function getDefaultChartFromIso(events: EventRow[]): string {
  if (events.length > 0) {
    return events.reduce((earliest, e) => (e.created_at < earliest ? e.created_at : earliest), events[0].created_at);
  }
  return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
}

export default async function AnalyticsGlobalPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string | string[]; company?: string | string[] }>;
}) {
  const sp = await searchParams;
  const periodRaw = Array.isArray(sp.period) ? sp.period[0] : sp.period;
  const companyRaw = Array.isArray(sp.company) ? sp.company[0] : sp.company;
  const period = parsePeriod(periodRaw);
  const fromIso = periodStartIso(period);
  const selectedCompanyId = companyRaw && companyRaw.trim() ? companyRaw.trim() : "";

  const companiesQuery = supabaseAdmin
    .from("companies")
    .select("id,name,public_slug")
    .order("name", { ascending: true })
    .limit(500);

  const { rows: fetchedEvents, error: eventsFetchError } = await fetchAnalyticsEventsPaged({
    fromIso,
    pageTypes: ["landing", "tenant", "saas"],
    companyId: selectedCompanyId || null,
    columns: "created_at,page_type,visitor_id,company_id,tenant_slug,country_code,event_name",
  });
  const events = fetchedEvents as EventRow[];
  const eventsError = eventsFetchError ? { message: eventsFetchError } : null;

  const { data: companiesData, error: companiesError } = await companiesQuery;
  const companies = (companiesData ?? []) as CompanyOption[];

  const companyNameById = new Map<string, string>();
  for (const c of companies) {
    companyNameById.set(c.id, c.name || c.public_slug || c.id);
  }

  const loadError = companiesError?.message || eventsError?.message || null;

  const totalViews = events.length;
  const uniqueVisitors = new Set(events.map((e) => e.visitor_id).filter((v): v is string => Boolean(v))).size;
  const landingViews = events.filter((e) => e.page_type === "landing").length;
  const tenantViews = events.filter((e) => e.page_type === "tenant").length;
  const saasViews = events.filter((e) => e.page_type === "saas").length;

  const countryAgg = new Map<string, { views: number; visitors: Set<string> }>();
  const businessAgg = new Map<string, { companyId: string | null; slug: string; views: number; visitors: Set<string> }>();
  const eventAgg = new Map<string, number>();

  for (const e of events) {
    if (e.country_code) {
      const cc = e.country_code.toUpperCase();
      const c = countryAgg.get(cc) ?? { views: 0, visitors: new Set<string>() };
      c.views += 1;
      if (e.visitor_id) c.visitors.add(e.visitor_id);
      countryAgg.set(cc, c);
    }

    if (e.page_type === "tenant") {
      const key = e.company_id || e.tenant_slug || "(sin-negocio)";
      const b = businessAgg.get(key) ?? {
        companyId: e.company_id,
        slug: e.tenant_slug || "(sin-slug)",
        views: 0,
        visitors: new Set<string>(),
      };
      b.views += 1;
      if (e.visitor_id) b.visitors.add(e.visitor_id);
      businessAgg.set(key, b);
    }

    const eventName = (e.event_name || "page_view").trim() || "page_view";
    eventAgg.set(eventName, (eventAgg.get(eventName) ?? 0) + 1);
  }

  const countriesTop = [...countryAgg.entries()]
    .map(([countryCode, row]) => ({
      countryCode,
      views: row.views,
      uniqueVisitors: row.visitors.size,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 20);

  const businessesTop = [...businessAgg.values()]
    .map((row) => ({
      companyId: row.companyId,
      slug: row.slug,
      companyName: row.companyId ? (companyNameById.get(row.companyId) ?? row.slug) : row.slug,
      views: row.views,
      uniqueVisitors: row.visitors.size,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  const eventsTop = [...eventAgg.entries()]
    .map(([eventName, count]) => ({ eventName, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const chartFromIso = fromIso || getDefaultChartFromIso(events);

  return (
    <div className="min-w-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Volver al dashboard
          </Link>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            Analytics
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Tráfico global, visitantes únicos y comportamiento por país y negocio.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start rounded-full border border-zinc-200/60 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 shadow-sm dark:border-zinc-800/60 dark:bg-zinc-900/80 dark:text-zinc-300">
          <BarChart3 className="h-3.5 w-3.5" />
          <span>{DASHBOARD_PERIODS.find((p) => p.value === period)?.label ?? period}</span>
        </div>
      </div>

      {/* Filter panel */}
      <div className="rounded-3xl border border-zinc-200/60 bg-white p-4 shadow-sm dark:border-zinc-800/60 dark:bg-zinc-900/80">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
              <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
            </div>
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Filtros</span>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <DashboardPeriodTabs current={period} />
            <form className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center" method="get">
              <input type="hidden" name="period" value={period} />
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                <select
                  name="company"
                  defaultValue={selectedCompanyId}
                  className="h-9 w-full min-w-0 appearance-none rounded-xl border border-zinc-200/60 bg-zinc-50 py-1 pl-9 pr-8 text-xs font-medium text-zinc-700 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 sm:min-w-[12rem] sm:w-auto"
                >
                  <option value="">Todos los negocios</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || c.public_slug || c.id}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="h-9 rounded-xl bg-zinc-900 px-4 text-xs font-medium text-white transition hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
              >
                Aplicar
              </button>
            </form>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {loadError}
        </div>
      )}

      {/* KPIs + top negocios/eventos */}
      <AnalyticsStatsSection
        totalViews={totalViews}
        uniqueVisitors={uniqueVisitors}
        landingViews={landingViews}
        tenantViews={tenantViews}
        saasViews={saasViews}
        businessesTop={businessesTop}
        eventsTop={eventsTop}
      />

      {/* Charts */}
      <AnalyticsGlobalChart events={events} fromIso={chartFromIso} />

      {/* Map */}
      <AnalyticsCountryMap countriesTop={countriesTop} />

      {/* Top countries — final */}
      <TopCountriesSection countriesTop={countriesTop} />
    </div>
  );
}
