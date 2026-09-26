import "server-only";

import type { StoreThemeConfig } from "@/components/customer-portal/shared/customer-account-types";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";

export const STOREFRONT_BRANDING_BUCKET = "menu";
export const STOREFRONT_BRANDING_SIGNED_URL_TTL = 60 * 60 * 12;

const EXTERNAL_URL = /^https?:\/\//i;
const SAFE_COMPANY_ID = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

export function isExternalStorefrontAsset(value: string | null | undefined): boolean {
  return EXTERNAL_URL.test(String(value ?? "").trim());
}

export function isCompanyStorefrontAssetPath(
  value: string | null | undefined,
  companyId: string,
): boolean {
  const path = String(value ?? "").trim();
  const company = String(companyId ?? "").trim();
  if (!path || !company || !SAFE_COMPANY_ID.test(company)) return false;
  if (EXTERNAL_URL.test(path) || path.startsWith("/") || path.includes("..") || path.includes("\\")) {
    return false;
  }
  return path.startsWith(`${company}/storefront/branding/`);
}

const BRANDING_FOLDERS = {
  logoUrl: "logo",
  backgroundImageUrl: "background",
  /** Foto propia de la portada de la página de inicio. */
  homeCover: "home-cover",
} as const;

export function buildStorefrontBrandingFolder(
  companyId: string,
  field: keyof typeof BRANDING_FOLDERS,
): string {
  if (!SAFE_COMPANY_ID.test(companyId)) {
    throw new Error("El companyId no es valido para Storage.");
  }
  return `${companyId}/storefront/branding/${BRANDING_FOLDERS[field]}`;
}

export async function createStorefrontAssetSignedUrl(
  value: string | null | undefined,
  companyId: string,
  expiresIn = STOREFRONT_BRANDING_SIGNED_URL_TTL,
): Promise<string> {
  const asset = String(value ?? "").trim();
  if (!asset) return "";

  // URLs externas (http/https o path absoluto) se usan tal cual.
  if (isExternalStorefrontAsset(asset) || asset.startsWith("/")) return asset;
  if (!isCompanyStorefrontAssetPath(asset, companyId)) return "";

  const { data, error } = await supabaseAdmin.storage
    .from(STOREFRONT_BRANDING_BUCKET)
    .createSignedUrl(asset, expiresIn);

  if (error || !data?.signedUrl) return "";
  return data.signedUrl;
}

export async function resolveStorefrontThemeAssets(
  theme: StoreThemeConfig,
  companyId: string,
): Promise<StoreThemeConfig> {
  const [logoUrl, backgroundImageUrl] = await Promise.all([
    createStorefrontAssetSignedUrl(theme.logoUrl, companyId),
    createStorefrontAssetSignedUrl(theme.backgroundImageUrl, companyId),
  ]);

  return {
    ...theme,
    logoUrl,
    backgroundImageUrl,
  };
}
