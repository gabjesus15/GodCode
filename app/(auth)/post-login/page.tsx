import { redirect } from "next/navigation";

import { getCustomerMembership, getSuperAdminRoleByEmail } from "@/lib/super-admin/account-access";
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
    redirect("/cuenta");
  }

  redirect("/login?error=no-access");
}
