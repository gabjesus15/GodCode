import "server-only";

import { sessionNeedsMfa } from "@/lib/auth/mfa-server";
import { createSupabaseServerClient } from "../../utils/supabase/server";
import { getCustomerMembership, getSuperAdminRoleByEmail } from "../super-admin/account-access";

export type CustomerAccountContext = {
  authUserId: string;
  email: string;
  companyId: string;
  userId: string;
  role: string;
};

export async function getCustomerAccountContext(): Promise<CustomerAccountContext | null> {
  const supabase = await createSupabaseServerClient("super-admin");
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) return null;
  if (await sessionNeedsMfa(supabase)) return null;

  const email = user.email.trim().toLowerCase();
  const superAdminRole = await getSuperAdminRoleByEmail(email);
  if (superAdminRole === "super_admin" || superAdminRole === "support") {
    return null;
  }

  const membership = await getCustomerMembership({ authUserId: user.id, email });
  if (!membership || membership.role !== "ceo") return null;

  return {
    authUserId: user.id,
    email,
    companyId: membership.companyId,
    userId: membership.userId,
    role: membership.role,
  };
}
