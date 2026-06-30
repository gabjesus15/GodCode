import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { enforceRateLimit } from "@/lib/infra/api-guard";
import { createSupabaseServerClient } from "../../../../utils/supabase/server";

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "auth_signout", 30, 60_000);
  if (limited) return limited;

  try {
    const superAdmin = await createSupabaseServerClient("super-admin");
    const tenant = await createSupabaseServerClient("tenant");

    await Promise.allSettled([superAdmin.auth.signOut(), tenant.auth.signOut()]);
  } catch {
    // No romper logout por fallas transitorias de sesión.
  }

  return NextResponse.redirect(new URL("/login", request.url), 303);
}
