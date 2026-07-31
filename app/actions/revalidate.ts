import { revalidateTag } from "next/cache";

import { createSupabaseServerClient } from "@/utils/supabase/server";
import { getSuperAdminRoleByEmail, getCustomerMembership } from "@/lib/super-admin/account-access";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";

/**
 * Revalidates the public menu + company slug caches for a given company.
 */
export async function revalidateMenuCache(companyId: string, publicSlug?: string | null) {
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
    const isSuperAdmin = superAdminRole === "super_admin" || superAdminRole === "support";

    if (!isSuperAdmin) {
      const membership = await getCustomerMembership({ authUserId: user.id, email });
      if (!membership || membership.companyId !== companyId) {
        return { success: false, error: "Forbidden" };
      }
    }

    let slug = String(publicSlug ?? "").trim();
    if (!slug) {
      const { data } = await supabaseAdmin
        .from("companies")
        .select("public_slug")
        .eq("id", companyId)
        .maybeSingle();
      slug = String(data?.public_slug ?? "").trim();
    }

    revalidateTag(`menu:${companyId}`, "max");
    if (slug) {
      revalidateTag(`company-slug:${slug}`, "max");
    }

    console.warn(
      `[revalidateMenuCache] ${isSuperAdmin ? "Super-admin" : `Customer ${user.id}`} revalidated menu:${companyId}${slug ? ` company-slug:${slug}` : ""}`,
    );
    return { success: true };
  } catch (err) {
    console.error("Error in revalidateMenuCache:", err);
    return { success: false, error: String(err) };
  }
}
