import "server-only";

import { supabaseAdmin } from "../infra/supabase-admin";

type CustomerMembership = {
  userId: string;
  companyId: string;
  role: string;
};

type TenantUserRow = {
  id: string;
  company_id: string | null;
  role: string | null;
  is_active: boolean | null;
};

export async function getSuperAdminRoleByEmail(email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .select("role")
    .ilike("email", normalized)
    .maybeSingle();

  if (error) return null;
  const role = String(data?.role ?? "").trim().toLowerCase();
  return role || null;
}

function pickBestMembership(rows: TenantUserRow[] | null): CustomerMembership | null {
  if (!rows || rows.length === 0) return null;

  const activeRows = rows.filter((row) => row.is_active !== false && row.company_id);
  if (activeRows.length === 0) return null;

  const ceo = activeRows.find((row) => String(row.role ?? "").toLowerCase() === "ceo");
  const chosen = ceo ?? activeRows[0];
  if (!chosen || !chosen.company_id) return null;

  return {
    userId: chosen.id,
    companyId: chosen.company_id,
    role: String(chosen.role ?? "").toLowerCase(),
  };
}

export async function getCustomerMembership(params: {
  authUserId?: string | null;
  email?: string | null;
}): Promise<CustomerMembership | null> {
  const authUserId = params.authUserId?.trim();
  const email = params.email?.trim().toLowerCase();

  if (authUserId) {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id,company_id,role,is_active")
      .eq("auth_user_id", authUserId)
      .limit(5);

    if (!error) {
      const selected = pickBestMembership((data as TenantUserRow[] | null) ?? null);
      if (selected) return selected;
    }
  }

  if (email) {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id,company_id,role,is_active")
      .ilike("email", email)
      .limit(5);

    if (!error) {
      return pickBestMembership((data as TenantUserRow[] | null) ?? null);
    }
  }

  return null;
}
