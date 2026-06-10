import "server-only";
import { unstable_cache } from "next/cache";
import { createSupabasePublicServerClient } from "@/utils/supabase/server";

// ==========================================
// CACHED MENU DATA FETCHING
// Enterprise-grade caching layer for tenant menu pages.
//
// Cache strategy:
//  - branches + business_info → CACHED (stable config data)
//  - cash_shifts              → NOT cached (volatile: changes with register open/close)
//  - menu RPC + hero_banners  → CACHED (per-branch, stable catalog data)
//
// Tags: `menu:${companyId}` — selective per-tenant invalidation via:
//   1. POST /api/revalidate-menu (Supabase Webhook for product/category/branch changes)
//   2. store-theme/publish route (when tenant publishes theme changes)
//
// Revalidate: 60 seconds as time-based fallback
// ==========================================

// ---- Types ----

export interface CachedBranch {
  id: string;
  name: string | null;
  address: string | null;
  phone: string | null;
  /** Stored as string (JSON) in DB */
  schedule: string | null;
  company_id: string | null;
  country: string | null;
  currency: string | null;
  /** Array of payment method slugs; null when none configured */
  payment_methods: string[] | null;
  /** Payment config fields — stored as serialized strings in DB */
  pago_movil: string | null;
  zelle: string | null;
  transferencia_bancaria: string | null;
  stripe: string | null;
  mercadopago: string | null;
  paypal: string | null;
  efectivo: string | null;
  tarjeta: string | null;
  delivery_settings: unknown;
  origin_lat: number | null;
  origin_lng: number | null;
  order_intake_paused: boolean | null;
  order_intake_pause_message: string | null;
  order_intake_paused_at: string | null;
}

export interface CachedBusinessInfo {
  id: string;
  name: string | null;
  phone: string | null;
  address: string | null;
  instagram: string | null;
  /** JSONB in DB — typed as string to match MenuClientProps.businessInfo */
  schedule: string | null;
  country: string | null;
  currency: string | null;
  bank_name: string | null;
  account_type: string | null;
  account_number: string | null;
  account_rut: string | null;
  account_email: string | null;
  bank_details: unknown;
  account_holder: string | null;
  company_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CachedMenuStaticData {
  branches: CachedBranch[];
  businessInfo: CachedBusinessInfo | null;
}

export interface CachedMenuRpcData {
  menuData: unknown | null;
  heroBannerRows: { id: string; image_url: string }[];
  menuError: { message: string; code?: string } | null;
}

// ==========================================
// 1. getCachedMenuStaticData
//    Caches: branches + business_info
//    Does NOT cache: cash_shifts (kept fresh in page.tsx)
// ==========================================

export const getCachedMenuStaticData = async (
  companyId: string,
  companySlug: string,
): Promise<CachedMenuStaticData> => {
  const fetcher = unstable_cache(
    async (cId: string) => {
      const supabase = createSupabasePublicServerClient();

      const [
        { data: branchesRaw },
        { data: businessInfoRaw },
      ] = await Promise.all([
        supabase
          .from("branches")
          .select(
            "id,name,address,phone,schedule,company_id,payment_methods,pago_movil,zelle,transferencia_bancaria,stripe,mercadopago,paypal,efectivo,tarjeta,delivery_settings,origin_lat,origin_lng,order_intake_paused,order_intake_pause_message,order_intake_paused_at,country,currency",
          )
          .eq("company_id", cId)
          .order("name"),
        supabase
          .from("business_info")
          .select(
            "id,name,phone,address,instagram,schedule,country,currency,bank_name,account_type,account_number,account_rut,account_email,bank_details,account_holder,company_id,created_at,updated_at",
          )
          .eq("company_id", cId)
          .maybeSingle(),
      ]);

      return {
        branches: (branchesRaw ?? []) as CachedBranch[],
        businessInfo: (businessInfoRaw ?? null) as CachedBusinessInfo | null,
      };
    },
    ["menu-static", companySlug, companyId],
    {
      tags: [`menu:${companyId}`],
      revalidate: 60,
    },
  );

  return fetcher(companyId);
};

// ==========================================
// 2. getCachedMenuRpcData
//    Caches: menu RPC (get_public_menu) + hero_banners
//    Cache key includes branchId for per-branch granularity.
//    Tag uses companyId so one revalidateTag() clears both caches.
// ==========================================

export const getCachedMenuRpcData = async (
  companyId: string,
  companySlug: string,
  branchId: string,
): Promise<CachedMenuRpcData> => {
  const fetcher = unstable_cache(
    async (slug: string, bId: string) => {
      const supabase = createSupabasePublicServerClient();

      const [menuResult, bannersResult] = await Promise.all([
        supabase.rpc("get_public_menu", {
          p_company_slug: slug,
          p_branch_id: bId,
        }),
        supabase
          .from("hero_banners")
          .select("id, image_url")
          .eq("branch_id", bId)
          .eq("is_active", true)
          .gt("expires_at", new Date().toISOString())
          .order("sort_order"),
      ]);

      return {
        menuData: menuResult.data ?? null,
        heroBannerRows: (
          (bannersResult.data ?? []) as { id: string; image_url: string }[]
        ).filter(
          (r) => typeof r.image_url === "string" && r.image_url.trim().length > 0,
        ),
        menuError: menuResult.error
          ? { message: menuResult.error.message, code: menuResult.error.code }
          : null,
      };
    },
    ["menu-rpc", companySlug, branchId],
    {
      // Same tag as static data → one revalidateTag(`menu:${companyId}`) clears everything
      tags: [`menu:${companyId}`],
      revalidate: 60,
    },
  );

  return fetcher(companySlug, branchId);
};
