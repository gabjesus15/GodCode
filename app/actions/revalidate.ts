"use server";

import { revalidateTag } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { getSuperAdminRoleByEmail, getCustomerMembership } from "@/lib/super-admin/account-access";

/**
 * Revalidates the public menu cache for a given company.
 * Secures the call by verifying the user's session and membership or super-admin status.
 */
export async function revalidateMenuCache(companyId: string) {
  try {
    if (!companyId) {
      return { success: false, error: "Missing companyId" };
    }

    const supabase = await createSupabaseServerClient("super-admin");
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user?.email) {
      return { success: false, error: "Unauthorized" };
    }

    const email = user.email.trim().toLowerCase();
    const superAdminRole = await getSuperAdminRoleByEmail(email);

    // If it's a super-admin, allow revalidating any company
    if (superAdminRole === "super_admin" || superAdminRole === "support") {
      revalidateTag(`menu:${companyId}`, "max");
      console.warn(`[revalidateMenuCache] Super-admin revalidated menu:${companyId}`);
      return { success: true };
    }

    // Otherwise, check if the user is a member of the target company
    const membership = await getCustomerMembership({ authUserId: user.id, email });
    if (!membership || membership.companyId !== companyId) {
      return { success: false, error: "Forbidden" };
    }

    revalidateTag(`menu:${companyId}`, "max");
    console.warn(`[revalidateMenuCache] Customer ${user.id} revalidated menu:${companyId}`);
    return { success: true };
  } catch (err) {
    console.error("Error in revalidateMenuCache:", err);
    return { success: false, error: String(err) };
  }
}
