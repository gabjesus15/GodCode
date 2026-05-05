import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AnalyticsCountryMapLazy } from "@/components/super-admin/analytics/analytics-country-map-lazy";
import { DashboardPeriodTabs } from "../../../../components/super-admin/analytics/dashboard-period-tabs";
import {
  DASHBOARD_PERIODS,
  type DashboardPeriod,
  periodStartIso,
} from "@/lib/super-admin/super-admin-metrics";
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

  let eventsQuery = supabaseAdmin
    .from("analytics_events")
    .select("created_at,page_type,visitor_id,company_id,tenant_slug,country_code,event_name")
    .gte("created_at", fromIso)
    .in("page_type", ["landing", "tenant", "saas"]);

  if (selectedCompanyId) {
    eventsQuery = eventsQuery.eq("company_id", selectedCompanyId);
  }

  const [{ data: companiesData, error: companiesError }, { data: eventsData, error: eventsError }] =
    await Promise.all([companiesQuery, eventsQuery]);

  const companies = (companiesData ?? []) as CompanyOption[];
  const events = (eventsData ?? []) as EventRow[];

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
    .slice(0, 50);

  const businessesTop = [...businessAgg.values()]
    .map((row) => ({
      companyId: row.companyId,
      slug: row.slug,
      companyName: row.companyId ? (companyNameById.get(row.companyId) ?? row.slug) : row.slug,
      views: row.views,
      uniqueVisitors: row.visitors.size,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 50);

  const eventsTop = [...eventAgg.entries()]
    .map(([eventName, count]) => ({ eventName, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver al dashboard
        </Link>
        <h2 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">Analytics global</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Tráfico de landing y negocios, con visitantes únicos, top por país y top por negocio.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/80">
        <DashboardPeriodTabs current={period} />
        <form className="flex flex-wrap items-end gap-2" method="get">
          <input type="hidden" name="period" value={period} />
          <label className="text-xs text-zinc-600 dark:text-zinc-400">
            Negocio
            <select
              name="company"
              defaultValue={selectedCompanyId}
              className="ml-2 h-9 min-w-[240px] rounded-lg border border-zinc-200 bg-white px-2 text-xs dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="">Todos</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.public_slug || c.id}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900"
          >
            Aplicar
          </button>
        </form>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {loadError}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl border border-zinc-200 bg-white/90 p-4 dark:border-zinc-700 dark:bg-zinc-900/80"><p className="text-xs text-zinc-500">Vistas totales</p><p className="mt-1 text-2xl font-bold">{totalViews}</p></div>
        <div className="rounded-2xl border border-zinc-200 bg-white/90 p-4 dark:border-zinc-700 dark:bg-zinc-900/80"><p className="text-xs text-zinc-500">Visitantes únicos</p><p className="mt-1 text-2xl font-bold">{uniqueVisitors}</p></div>
        <div className="rounded-2xl border border-zinc-200 bg-white/90 p-4 dark:border-zinc-700 dark:bg-zinc-900/80"><p className="text-xs text-zinc-500">Landing views</p><p className="mt-1 text-2xl font-bold">{landingViews}</p></div>
        <div className="rounded-2xl border border-zinc-200 bg-white/90 p-4 dark:border-zinc-700 dark:bg-zinc-900/80"><p className="text-xs text-zinc-500">Business views</p><p className="mt-1 text-2xl font-bold">{tenantViews}</p></div>
        <div className="rounded-2xl border border-zinc-200 bg-white/90 p-4 dark:border-zinc-700 dark:bg-zinc-900/80"><p className="text-xs text-zinc-500">SaaS views</p><p className="mt-1 text-2xl font-bold">{saasViews}</p></div>
      </div>

      <AnalyticsCountryMapLazy countriesTop={countriesTop} />

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white/90 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
          <div className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold dark:border-zinc-700">Top países</div>
          <table className="min-w-full text-left text-xs">
            <thead className="bg-zinc-50/80 text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
              <tr>
                <th className="px-3 py-2">País</th>
                <th className="px-3 py-2">Vistas</th>
                <th className="px-3 py-2">Visitantes únicos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {countriesTop.length === 0 ? (
                <tr><td className="px-3 py-3 text-zinc-500" colSpan={3}>Sin datos todavía.</td></tr>
              ) : countriesTop.map((row) => (
                <tr key={row.countryCode}>
                  <td className="px-3 py-2 font-medium">{row.countryCode}</td>
                  <td className="px-3 py-2">{row.views}</td>
                  <td className="px-3 py-2">{row.uniqueVisitors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white/90 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
          <div className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold dark:border-zinc-700">Top negocios por visitas</div>
          <table className="min-w-full text-left text-xs">
            <thead className="bg-zinc-50/80 text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
              <tr>
                <th className="px-3 py-2">Negocio</th>
                <th className="px-3 py-2">Slug</th>
                <th className="px-3 py-2">Vistas</th>
                <th className="px-3 py-2">Visitantes únicos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {businessesTop.length === 0 ? (
                <tr><td className="px-3 py-3 text-zinc-500" colSpan={4}>Sin datos todavía.</td></tr>
              ) : businessesTop.map((row) => (
                <tr key={`${row.companyId ?? row.slug}`}>
                  <td className="px-3 py-2 font-medium">{row.companyName}</td>
                  <td className="px-3 py-2 text-zinc-500">{row.slug}</td>
                  <td className="px-3 py-2">{row.views}</td>
                  <td className="px-3 py-2">{row.uniqueVisitors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white/90 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
        <div className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold dark:border-zinc-700">Eventos más frecuentes</div>
        <table className="min-w-full text-left text-xs">
          <thead className="bg-zinc-50/80 text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
            <tr>
              <th className="px-3 py-2">Evento</th>
              <th className="px-3 py-2">Conteo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {eventsTop.length === 0 ? (
              <tr><td className="px-3 py-3 text-zinc-500" colSpan={2}>Sin eventos todavía.</td></tr>
            ) : eventsTop.map((row) => (
              <tr key={row.eventName}>
                <td className="px-3 py-2 font-mono">{row.eventName}</td>
                <td className="px-3 py-2">{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
