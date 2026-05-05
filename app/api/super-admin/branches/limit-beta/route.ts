import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";

export async function GET(req: NextRequest) {
  const company_id = req.nextUrl.searchParams.get("company_id");
  if (!company_id) {
    return NextResponse.json({ allowed: false, error: "Missing company_id" }, { status: 400 });
  }
  // Get company plan
  const { data: company, error: companyError } = await supabaseAdmin
    .from("companies")
    .select("plan_id")
    .eq("id", company_id)
    .maybeSingle();
  if (companyError || !company) {
    return NextResponse.json({ allowed: false, error: "Company not found" }, { status: 404 });
  }
  // Get beta plan id
  const { data: betaPlan } = await supabaseAdmin
    .from("plans")
    .select("id")
    .ilike("name", "%beta%")
    .maybeSingle();
  if (!betaPlan) {
    return NextResponse.json({ allowed: true }); // If no beta plan, allow
  }
  // If company has beta plan, check branch count
  if (company.plan_id === betaPlan.id) {
    const { count } = await supabaseAdmin
      .from("branches")
      .select("id", { count: "exact" })
      .eq("company_id", company_id);
    if (typeof count === "number" && count >= 2) {
      return NextResponse.json({ allowed: false, reason: "Beta plan only allows 2 branches" });
    }
  }
  return NextResponse.json({ allowed: true });
}
