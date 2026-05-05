import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { SAAS_READ_ROLES, validateAdminRolesOnServer } from "../../../../../utils/admin/server-auth";

type ExportType = "leads" | "contacts";

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escapeCell = (value: unknown): string => {
    const text = value == null ? "" : String(value);
    const escaped = text.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCell(row[h])).join(","));
  }
  return lines.join("\n");
}

export async function GET(req: NextRequest) {
  const access = await validateAdminRolesOnServer([...SAAS_READ_ROLES]);
  if (!access.ok) {
    return NextResponse.json({ error: access.error ?? "No autorizado" }, { status: access.status });
  }

  const sp = req.nextUrl.searchParams;
  const typeRaw = String(sp.get("type") ?? "leads").trim().toLowerCase();
  const type: ExportType = typeRaw === "contacts" ? "contacts" : "leads";
  const status = String(sp.get("status") ?? "all").trim().toLowerCase();

  if (type === "leads") {
    let query = supabaseAdmin
      .from("landing_leads")
      .select("id,email,status,source,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(10000);
    if (status !== "all") query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const rows = (data ?? []) as Array<{
      id: string;
      email: string;
      status: string;
      source: string;
      created_at: string;
      updated_at: string;
    }>;

    const csv = toCsv(rows.map((row) => ({
      id: row.id,
      email: row.email,
      status: row.status,
      source: row.source,
      created_at: row.created_at,
      updated_at: row.updated_at,
    })));

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="landing_leads_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  let query = supabaseAdmin
    .from("landing_contacts")
    .select("id,name,email,message,status,source,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(10000);
  if (status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const rows = (data ?? []) as Array<{
    id: string;
    name: string | null;
    email: string | null;
    message: string;
    status: string;
    source: string;
    created_at: string;
    updated_at: string;
  }>;

  const csv = toCsv(rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    message: row.message,
    status: row.status,
    source: row.source,
    created_at: row.created_at,
    updated_at: row.updated_at,
  })));

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="landing_contacts_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
