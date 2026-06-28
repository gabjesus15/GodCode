import { redirect } from "next/navigation";

import { getCustomerMembership, getSuperAdminRoleByEmail } from "@/lib/super-admin/account-access";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { resolveTenantPanelLoginUrl } from "@/lib/tenant/panel-url";
import { createSupabaseServerClient } from "../../../utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function PostLoginPage() {
  const supabase = await createSupabaseServerClient("super-admin");
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    redirect("/login");
  }

  const email = user.email.trim().toLowerCase();
  const superAdminRole = await getSuperAdminRoleByEmail(email);

  if (superAdminRole === "super_admin" || superAdminRole === "support") {
    redirect("/dashboard");
  }

  const membership = await getCustomerMembership({ authUserId: user.id, email });

  if (membership) {
    if (membership.role === "ceo") {
      redirect("/cuenta");
    }

    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("public_slug")
      .eq("id", membership.companyId)
      .maybeSingle();

    redirect(resolveTenantPanelLoginUrl((company?.public_slug as string | null) ?? null));
  }

  redirect("/login?error=no-access");
}
