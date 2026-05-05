import { NextRequest, NextResponse } from "next/server";
import { createSupabasePublicServerClient } from "@/utils/supabase/server";

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get("phone");
  if (!phone) {
    return NextResponse.json({ error: "Phone is required" }, { status: 400 });
  }

  const normalizedPhone = phone.replace(/\D/g, "");

  const supabase = createSupabasePublicServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select("client_name, client_rut")
    .eq("client_phone", normalizedPhone)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({}, { status: 404 });
  }

  return NextResponse.json({
    name: data.client_name || "",
    rut: data.client_rut || "",
  });
}
