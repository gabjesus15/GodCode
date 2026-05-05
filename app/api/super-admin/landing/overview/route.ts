import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { SAAS_READ_ROLES, validateAdminRolesOnServer } from "../../../../../utils/admin/server-auth";

type Status = "new" | "contacted" | "closed";

type AnalyticsEventRow = {
  created_at: string;
  page_type: "landing" | "tenant" | "saas" | "unknown";
  visitor_id: string | null;
  company_id: string | null;
  tenant_slug: string | null;
  country_code: string | null;
};

async function countRows(table: "landing_leads" | "landing_contacts", status?: Status): Promise<number> {
  let query = supabaseAdmin.from(table).select("id", { head: true, count: "exact" });
  if (status) query = query.eq("status", status);
  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

function dateKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export async function GET() {
  const access = await validateAdminRolesOnServer([...SAAS_READ_ROLES]);
  if (!access.ok) {
    return NextResponse.json({ error: access.error ?? "No autorizado" }, { status: access.status });
  }

  try {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 29);
    const fromIso = fromDate.toISOString();

    const [
      leadsTotal,
      contactsTotal,
      leadsNew,
      leadsContacted,
      leadsClosed,
      contactsNew,
      contactsContacted,
      contactsClosed,
      recentLeads,
      recentContacts,
      recentAnalytics,
    ] = await Promise.all([
      countRows("landing_leads"),
      countRows("landing_contacts"),
      countRows("landing_leads", "new"),
      countRows("landing_leads", "contacted"),
      countRows("landing_leads", "closed"),
      countRows("landing_contacts", "new"),
      countRows("landing_contacts", "contacted"),
      countRows("landing_contacts", "closed"),
      supabaseAdmin.from("landing_leads").select("created_at").gte("created_at", fromIso).order("created_at", { ascending: true }),
      supabaseAdmin.from("landing_contacts").select("created_at").gte("created_at", fromIso).order("created_at", { ascending: true }),
      supabaseAdmin
        .from("analytics_events")
        .select("created_at,page_type,visitor_id,company_id,tenant_slug,country_code")
        .gte("created_at", fromIso)
        .in("page_type", ["landing", "tenant"]),
    ]);

    if (recentLeads.error) throw new Error(recentLeads.error.message);
    if (recentContacts.error) throw new Error(recentContacts.error.message);

    const analyticsRows: AnalyticsEventRow[] = recentAnalytics?.error
      ? []
      : ((recentAnalytics?.data ?? []) as AnalyticsEventRow[]);

    const dailyMap = new Map<string, { leads: number; contacts: number; landingViews: number; tenantViews: number }>();
    for (let i = 0; i < 30; i += 1) {
      const d = new Date(fromDate);
      d.setDate(fromDate.getDate() + i);
      dailyMap.set(d.toISOString().slice(0, 10), { leads: 0, contacts: 0, landingViews: 0, tenantViews: 0 });
    }

    for (const row of recentLeads.data ?? []) {
      const key = dateKey(row.created_at);
      const bucket = dailyMap.get(key);
      if (bucket) bucket.leads += 1;
    }
    for (const row of recentContacts.data ?? []) {
      const key = dateKey(row.created_at);
      const bucket = dailyMap.get(key);
      if (bucket) bucket.contacts += 1;
    }

    const landingVisitors = new Set<string>();
    const tenantVisitors = new Set<string>();
    const tenantAgg = new Map<string, { companyId: string | null; tenantSlug: string; views: number; visitors: Set<string> }>();
    const countryAgg = new Map<string, { views: number; visitors: Set<string> }>();

    for (const row of analyticsRows) {
      const key = dateKey(row.created_at);
      const bucket = dailyMap.get(key);
      if (!bucket) continue;

      if (row.country_code) {
        const cc = row.country_code.toUpperCase();
        const agg = countryAgg.get(cc) ?? { views: 0, visitors: new Set<string>() };
        agg.views += 1;
        if (row.visitor_id) agg.visitors.add(row.visitor_id);
        countryAgg.set(cc, agg);
      }

      if (row.page_type === "landing") {
        bucket.landingViews += 1;
        if (row.visitor_id) landingVisitors.add(row.visitor_id);
        continue;
      }

      if (row.page_type === "tenant") {
        bucket.tenantViews += 1;
        if (row.visitor_id) tenantVisitors.add(row.visitor_id);

        const tenantKey = row.company_id || row.tenant_slug || "(sin-asignar)";
        const tenantSlug = row.tenant_slug || "(sin-slug)";
        const agg = tenantAgg.get(tenantKey) ?? {
          companyId: row.company_id,
          tenantSlug,
          views: 0,
          visitors: new Set<string>(),
        };
        agg.views += 1;
        if (row.visitor_id) agg.visitors.add(row.visitor_id);
        tenantAgg.set(tenantKey, agg);
      }
    }

    const companyIds = [...new Set(
      [...tenantAgg.values()].map((t) => t.companyId).filter((id): id is string => Boolean(id))
    )];
    const companyNames = new Map<string, string>();
    if (companyIds.length > 0) {
      const { data: companies } = await supabaseAdmin
        .from("companies")
        .select("id,name,public_slug")
        .in("id", companyIds);
      for (const c of companies ?? []) {
        companyNames.set(c.id, c.name || c.public_slug || c.id);
      }
    }

    const tenantTop30d = [...tenantAgg.values()]
      .map((t) => ({
        companyId: t.companyId,
        tenantSlug: t.tenantSlug,
        companyName: t.companyId ? (companyNames.get(t.companyId) ?? t.tenantSlug) : t.tenantSlug,
        views: t.views,
        uniqueVisitors: t.visitors.size,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 20);

    const countryTop30d = [...countryAgg.entries()]
      .map(([countryCode, v]) => ({
        countryCode,
        views: v.views,
        uniqueVisitors: v.visitors.size,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 20);

    const series = [...dailyMap.entries()].map(([date, values]) => ({
      date,
      leads: values.leads,
      contacts: values.contacts,
      landingViews: values.landingViews,
      tenantViews: values.tenantViews,
    }));

    return NextResponse.json({
      metrics: {
        leadsTotal,
        contactsTotal,
        inboxTotal: leadsTotal + contactsTotal,
        leadsByStatus: { new: leadsNew, contacted: leadsContacted, closed: leadsClosed },
        contactsByStatus: { new: contactsNew, contacted: contactsContacted, closed: contactsClosed },
        landingViews30d: analyticsRows.filter((r) => r.page_type === "landing").length,
        landingUniqueVisitors30d: landingVisitors.size,
        tenantViews30d: analyticsRows.filter((r) => r.page_type === "tenant").length,
        tenantUniqueVisitors30d: tenantVisitors.size,
        tenantTop30d,
        countryTop30d,
      },
      series,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No se pudo cargar métricas de landing" },
      { status: 500 },
    );
  }
}
