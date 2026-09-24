import { Building2 } from "lucide-react";

import { AnalyticsCountryMap } from "@/components/super-admin/analytics/analytics-country-map";
import { AnalyticsStatsSection } from "@/components/super-admin/analytics/analytics-stats-section";
import { TopCountriesSection } from "@/components/super-admin/analytics/top-countries-section";
import { HomePeriodSelect } from "@/components/super-admin/home/home-period-select";
import { AnalyticsGlobalChart } from "@/components/super-admin/analytics/analytics-global-chart";
import { type DashboardPeriod, periodStartIso } from "@/lib/super-admin/super-admin-dashboard-shared";
import { fetchAnalyticsEventsPaged } from "@/lib/analytics/fetch-analytics-events";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";

/** @service-role layout-guard */

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

function getDefaultChartFromIso(events: EventRow[]): string {
  if (events.length > 0) {
    return events.reduce((earliest, e) => (e.created_at < earliest ? e.created_at : earliest), events[0].created_at);
  }
  return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
}

/** Pestaña Tráfico de "Landing y tráfico": visitas de la landing, los menús y el sitio. */
export async function TrafficView({ period, companyId }: { period: DashboardPeriod; companyId: string }) {
  const fromIso = periodStartIso(period);
  const selectedCompanyId = companyId;

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
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <HomePeriodSelect current={period} />
        <form className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center" method="get">
          <input type="hidden" name="period" value={period} />
          <input type="hidden" name="tab" value="trafico" />
          <label htmlFor="traffic-company" className="sr-only">
            Negocio
          </label>
          <div className="relative">
            <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden />
            <select
              id="traffic-company"
              name="company"
              defaultValue={selectedCompanyId}
              className="h-9 w-full min-w-0 rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm text-zinc-700 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 sm:w-auto sm:min-w-[12rem]"
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
            className="inline-flex h-9 items-center justify-center rounded-lg bg-zinc-900 px-3 text-xs font-medium text-white transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Aplicar
          </button>
        </form>
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
