import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { TENANT_ADMIN_TAB_IDS } from "@/lib/super-admin/tenant-admin-tabs";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/api/errors";

const TENANT_ALLOWED_TAB_IDS = new Set<string>(TENANT_ADMIN_TAB_IDS);

export class TenantStaffService {
  static async getCeoSession() {
    const supabase = await createSupabaseServerClient("tenant");
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user?.email) {
      throw new ForbiddenError("No autenticado");
    }

    const email = user.email.trim();
    
    // 1. Intentar leer usando el cliente scoped (con RLS de usuario)
    let rows: Array<{ id: string; company_id: string | null; role: string | null }> | null = null;
    let error: { message: string } | null = null;
    try {
      const scopedRes = await supabase
        .from("users")
        .select("id,company_id,role")
        .ilike("email", email);
      rows = scopedRes.data as Array<{ id: string; company_id: string | null; role: string | null }> | null;
      error = scopedRes.error;
    } catch (err) {
      error = err instanceof Error ? err : { message: String(err) };
    }

    // Doble lectura temporal y log de advertencia
    if (error || !rows?.length) {
      console.warn(`[RLS_POLICY_WARN] getCeoSession scoped client failed: ${error?.message || "Sin datos"}. Fallback to supabaseAdmin.`);
      
      const adminRes = await supabaseAdmin
        .from("users")
        .select("id,company_id,role")
        .ilike("email", email);
        
      if (adminRes.error) throw new Error(adminRes.error.message);
      rows = adminRes.data;
    }

    if (!rows?.length) throw new NotFoundError("Usuario no encontrado en la empresa");

    const row = rows.find((r) => (r.role || "").toLowerCase() === "ceo");
    if (!row?.company_id) throw new ForbiddenError("Tu usuario no tiene rol CEO en esta empresa");

    return { companyId: row.company_id, userId: row.id };
  }

  static normalizeRole(value: unknown): string {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (normalized === "staff") return "cashier";
    return normalized;
  }

  static normalizeTabs(value: unknown): string[] | null {
    if (!Array.isArray(value)) return null;

    const normalized = value
      .filter((tab): tab is string => typeof tab === "string")
      .map((tab) => tab.trim().toLowerCase())
      .map((tab) => (tab === "drinks" ? "beverages" : tab))
      .filter((tab) => TENANT_ALLOWED_TAB_IDS.has(tab));

    return Array.from(new Set(normalized));
  }

  static async verifyBranchOwnership(branchId: string, companyId: string) {
    const supabase = await createSupabaseServerClient("tenant");
    
    // 1. Intentar leer usando el cliente scoped (con RLS de usuario)
    let branch: { id: string; company_id: string | null } | null = null;
    let branchError: { message: string } | null = null;
    try {
      const scopedRes = await supabase
        .from("branches")
        .select("id,company_id")
        .eq("id", branchId)
        .maybeSingle();
      branch = scopedRes.data as { id: string; company_id: string | null } | null;
      branchError = scopedRes.error;
    } catch (err) {
      branchError = err instanceof Error ? err : { message: String(err) };
    }

    // Doble lectura temporal
    if (branchError || !branch) {
      console.warn(`[RLS_POLICY_WARN] verifyBranchOwnership scoped client failed: ${branchError?.message || "Sin datos"}. Fallback to supabaseAdmin.`);
      
      const adminRes = await supabaseAdmin
        .from("branches")
        .select("id,company_id")
        .eq("id", branchId)
        .maybeSingle();
        
      if (adminRes.error) throw new Error(adminRes.error.message);
      branch = adminRes.data;
    }

    if (!branch || branch.company_id !== companyId) {
      throw new ValidationError("La sucursal no pertenece a tu empresa");
    }
  }
}
