import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Illustrated404 } from "@/components/brand/illustrated-404";
import { createSupabasePublicServerClient } from "../../../utils/supabase/server";
import { MenuClient } from "../../../components/tenant/menu/menu-client";
import type { HeroBanner } from "../../../components/tenant/home/hero-carousel";
import { isMainDomain } from "@/lib/tenant/main-domain-host";
import { parseThemeLogoUrl, tenantBrandingIconVersionSeed } from "@/lib/tenant/tenant-favicon-utils";
import { getCachedMenuStaticData, getCachedMenuRpcData } from "@/lib/tenant/cached-menu";
import { getCachedCompany } from "@/utils/tenant-cache";
import { normalizeStoreThemeConfig } from "@/lib/store-theme/theme-config";
import {
	extractMenuSettingsFromIntegration,
	resolveOnlineOrderingEnabled,
} from "@/lib/tenant/menu-settings";

// ISR: re-generate at most every 60 s. Menu updates (product edits, theme publish)
// are pushed instantly via revalidateTag(`menu:${companyId}`) from:
//   • store-theme/publish API route
//   • Supabase Webhook → /api/revalidate-menu
export const revalidate = 60;

// ==========================================
// 1. INTERFACES DE PROPS Y OUTPUT CLIENTE
// ==========================================

interface TenantMenuPageProps {
  params: Promise<{ subdomain: string }>;
  searchParams?: Promise<{ branch?: string; debug?: string }>;
}

function formatBusinessNameFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ subdomain: string }>;
}): Promise<Metadata> {
  const hdrs = await headers();
	const resolvedParams = await params;
  const host =
    hdrs.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    hdrs.get("host") ??
    `${resolvedParams.subdomain}.godcode.me`;
  const protocol = hdrs.get("x-forwarded-proto") ?? "https";

  const pathPrefix = isMainDomain(host) ? `/${resolvedParams.subdomain}` : "";
	const company = await getCachedCompany(resolvedParams.subdomain);

  const rawThemeConfig = company?.theme_config;
  const parsedThemeConfig =
    typeof rawThemeConfig === "string"
      ? (() => {
          try {
            return JSON.parse(rawThemeConfig) as Record<string, unknown>;
          } catch {
            return null;
          }
        })()
      : (rawThemeConfig as Record<string, unknown> | null);
  const rawDisplayName = parsedThemeConfig?.displayName;
  const slugFallback = formatBusinessNameFromSlug(resolvedParams.subdomain);
  const displayName =
    (typeof rawDisplayName === "string" && rawDisplayName.trim().length > 0
      ? rawDisplayName.trim()
      : company?.name?.trim()) || slugFallback || "Menú";
  const iconVersionSeed = company ? tenantBrandingIconVersionSeed(company) : resolvedParams.subdomain;
  const icon = `/tenant-favicon?tenant=${encodeURIComponent(resolvedParams.subdomain)}&v=${encodeURIComponent(String(iconVersionSeed))}`;
  const baseOrigin = `${protocol}://${host}`;
  const resolvedMetadataBase = new URL(baseOrigin);
  const canonical = `${baseOrigin}${pathPrefix}/menu`;

	return {
    metadataBase: resolvedMetadataBase,
    title: { absolute: displayName },
		description: `Explora el menú de ${displayName}. Pide online y recibe en tu puerta.`,
    alternates: {
      canonical,
    },
    manifest: `${pathPrefix}/menu/manifest.webmanifest`,
    icons: {
      icon,
      shortcut: icon,
      apple: icon,
    },
    openGraph: {
      title: displayName,
      description: `Explora el menú de ${displayName}. Pide online y recibe en tu puerta.`,
      url: canonical,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: displayName,
      description: `Explora el menú de ${displayName}. Pide online y recibe en tu puerta.`,
    },
		appleWebApp: {
			capable: true,
			statusBarStyle: "default",
			title: displayName,
		},
    robots: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
	};
}


interface MenuProduct {
  id: string;
  name: string | null;
  description: string | null;
  image_url: string | null;
  category_id: string | null;
  price: number;
  has_discount: boolean;
  discount_price: number | null;
  is_special: boolean;
}

// ==========================================
// 2. INTERFACES CRUDAS (Para tipar el RPC)
// ==========================================

interface RawRPCCategory {
  id: string;
  name: string;
  order: number | null;
}

interface RawRPCProduct {
  id: string;
  name: string | null;
  description: string | null;
  image_url: string | null;
  category_id: string | null;
  is_active?: boolean | null;
}

interface RawRPCPrice {
  product_id: string;
  price: number | string | null; // SQL a veces devuelve los Numeric/Decimal como strings
  has_discount: boolean;
  discount_price: number | string | null;
}

interface RawRPCStatus {
  product_id: string;
  is_active: boolean;
  is_special: boolean;
  category_id: string | null;
}
interface MenuDataResponse {
  categories?: RawRPCCategory[];
  products?: RawRPCProduct[];
  product_prices?: RawRPCPrice[];
  product_branch?: RawRPCStatus[];
}

export default async function TenantMenuPage({ params, searchParams }: TenantMenuPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const supabase = createSupabasePublicServerClient();

  // --- A. Obtener la empresa primero (Filtro base cacheado) ---
  const company = await getCachedCompany(resolvedParams.subdomain);

  if (!company) {
    if (resolvedSearchParams?.debug === "1") {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          No se pudo cargar la empresa para este subdominio.
        </div>
      );
    }
    return (
      <Illustrated404
        oops="Tienda no encontrada"
        title="Tienda no disponible"
        subtitle="Esta tienda no existe… o se mudó sin avisar."
        primaryCta={{ label: "Crear mi propia tienda", href: "/onboarding" }}
        secondaryCta={{ label: "Conocer GodCode", href: "/" }}
      />
    );
  }

  const planFeatures = (company.plans as { features?: unknown } | null)?.features ?? null;
  const menuSettings = extractMenuSettingsFromIntegration(company.integration_settings);
  const onlineOrderingEnabled = resolveOnlineOrderingEnabled(planFeatures, menuSettings);
  const orderChannel = menuSettings.orderChannel;

  const status = company.subscription_status?.toLowerCase();
  if (status === "suspended" || status === "cancelled") {
    notFound();
  }

  // --- B. Datos cacheados (branches + business_info) + cash_shifts en tiempo real ---
  // cash_shifts se mantiene FUERA del cache porque cambia con apertura/cierre de caja.
  const [staticData, { data: openShifts, error: openShiftsError }] = await Promise.all([
    getCachedMenuStaticData(company.id, resolvedParams.subdomain),
    supabase
      .from("cash_shifts")
      .select("branch_id")
      .eq("company_id", company.id)
      .eq("status", "open"),
  ]);

  const branches = staticData.branches;
  const businessInfoRaw = staticData.businessInfo;

  if (openShiftsError) {
    if (resolvedSearchParams?.debug === "1") {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          No se pudo cargar el estado de turnos.
          <pre className="debug-pre">
            {JSON.stringify({ subdomain: resolvedParams.subdomain, openShiftsError: openShiftsError?.message ?? null }, null, 2)}
          </pre>
        </div>
      );
    }
    notFound();
  }

    const openBranchIds = (openShifts ?? [])
      .map((shift) => String(shift.branch_id))
      .filter(Boolean);
    const openBranchIdSet = new Set(openBranchIds);

    // --- C. Selección segura de la sucursal ---
    // Cast through unknown: the DB fields (pago_movil, zelle, etc.) are stored as JSON strings
    // and match BranchInfo's object types at runtime. TypeScript cannot verify cross-boundary
    // JSON shapes statically, so we assert the type here at the server→client data boundary.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const safeBranches = (branches ?? []) as unknown as Array<any>;
    if (safeBranches.length === 0) {
      notFound();
    }

    const hasOpenBranches = openBranchIds.length > 0;
    const requestedBranchId = resolvedSearchParams?.branch;
    const requestedBranch = requestedBranchId
      ? safeBranches.find((branch) => branch.id === requestedBranchId) ?? null
      : null;
    const selectedBranch =
      requestedBranch && (!hasOpenBranches || openBranchIdSet.has(String(requestedBranch.id)))
        ? requestedBranch
        : null;
    const menuBranch =
      selectedBranch ??
      (hasOpenBranches
        ? safeBranches.find((branch) => openBranchIdSet.has(String(branch.id))) ?? null
        : safeBranches[0] ?? null);

    let menuData: MenuDataResponse | null = null;
    let heroBannerRows: HeroBanner[] = [];

    if (menuBranch) {
      // --- D. Obtener Menú + Banners desde caché ---
      const rpcData = await getCachedMenuRpcData(
        company.id,
        resolvedParams.subdomain,
        menuBranch.id,
      );

      if (rpcData.menuError) {
        if (resolvedSearchParams?.debug === "1") {
          return (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
              No se pudo cargar el menu de la sucursal seleccionada.
              <pre className="debug-pre">
                {JSON.stringify(
                  {
                    subdomain: resolvedParams.subdomain,
                    branchId: menuBranch.id,
                    error: rpcData.menuError.message ?? null,
                    code: rpcData.menuError.code ?? null,
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          );
        }
        notFound();
      }

      menuData = Array.isArray(rpcData.menuData) && rpcData.menuData.length > 0
        ? rpcData.menuData[0]
        : rpcData.menuData;
      heroBannerRows = rpcData.heroBannerRows;
    }

    // --- E. Asignación de tipos fuertes (¡Adiós 'any'!) ---
    const categoriesRaw = (menuData?.categories ?? []) as RawRPCCategory[];
    const productsRaw = (menuData?.products ?? []) as RawRPCProduct[];
    const branchPrices = (menuData?.product_prices ?? []) as RawRPCPrice[];
    const branchStatuses = (menuData?.product_branch ?? []) as RawRPCStatus[];

    const categories = [...categoriesRaw].sort(
      (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)
    );

    const priceByProductId = new Map(
      branchPrices.map((price) => [price.product_id, price] as const),
    );
    const statusByProductId = new Map(
      branchStatuses.map((status) => [status.product_id, status] as const),
    );

    // --- F. Mapeo ultra-seguro y validado ---
    const products: MenuProduct[] = productsRaw
      .map((product) => {
        const priceData = priceByProductId.get(product.id);
        const statusData = statusByProductId.get(product.id);

        if (!statusData || statusData.is_active !== true || product.is_active !== true) {
          return null;
        }

        const price = Number(priceData?.price ?? 0);
        if (!Number.isFinite(price) || price <= 0) {
          return null;
        }

        return {
          id: product.id,
          name: product.name ?? null,
          description: product.description ?? null,
          image_url: product.image_url ?? null,
          category_id: statusData.category_id ?? product.category_id ?? null,
          price,
          has_discount: Boolean(priceData?.has_discount),
          discount_price: priceData?.discount_price ? Number(priceData.discount_price) : null,
          is_special: Boolean(statusData?.is_special),
        };
      })
      .filter((p): p is MenuProduct => p !== null);

    const productsByCategoryId = new Map<string, MenuProduct[]>();
    for (const product of products) {
      const categoryId = product.category_id ?? "";
      const list = productsByCategoryId.get(categoryId);
      if (list) {
        list.push(product);
      } else {
        productsByCategoryId.set(categoryId, [product]);
      }
    }

    const heroBanners = heroBannerRows.map((row) => ({
      id: row.id,
      image_url: row.image_url.trim(),
    }));

    // --- G. Casteo seguro de JSONB (Evita warnings silenciosos) ---
    const theme = normalizeStoreThemeConfig(company.theme_config, company.name ?? "GodCode");
    const name = theme.displayName || company.name || "GodCode";
    const logoUrl = theme.logoUrl?.trim() || parseThemeLogoUrl(company?.theme_config) || null;
    const navbarType = theme.navbarType;
    const navigationMode = theme.navigationMode;
    const productCardStyle = theme.productCardStyle;
    const productDetailsMode = theme.productDetailsMode;
    const businessInfo = {
      name,
      phone: company.phone ?? null,
      address: company.address ?? null,
      schedule: businessInfoRaw?.schedule ?? null,
    };

    // --- H. JSON-LD: BreadcrumbList + Menu schema para rich results ---
    const hdrs = await headers();
    const host =
      hdrs.get("x-forwarded-host")?.split(",")[0]?.trim() ??
      hdrs.get("host") ??
      `${resolvedParams.subdomain}.godcode.me`;
    const protocol = hdrs.get("x-forwarded-proto") ?? "https";
    const pathPrefix = isMainDomain(host) ? `/${resolvedParams.subdomain}` : "";
    const tenantBaseUrl = `${protocol}://${host}${pathPrefix}`;

    const categoriesWithProducts = categories.map((cat) => {
      const catProducts = productsByCategoryId.get(cat.id) ?? [];
      return {
        "@type": "MenuSection",
        "name": cat.name,
        "hasMenuItem": catProducts.map((prod) => ({
          "@type": "MenuItem",
          "name": prod.name,
          "description": prod.description || undefined,
          "image": prod.image_url || undefined,
          "offers": {
            "@type": "Offer",
            "price": prod.discount_price ?? prod.price,
            "priceCurrency": company.currency ?? "CLP"
          }
        }))
      };
    }).filter((section) => section.hasMenuItem.length > 0);

    const isMain = isMainDomain(host);
    const menuJsonLd = [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": isMain
          ? [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "GodCode",
                "item": "https://www.godcode.me"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": name,
                "item": tenantBaseUrl
              },
              {
                "@type": "ListItem",
                "position": 3,
                "name": "Menú",
                "item": `${tenantBaseUrl}/menu`
              }
            ]
          : [
              {
                "@type": "ListItem",
                "position": 1,
                "name": name,
                "item": tenantBaseUrl
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Menú",
                "item": `${tenantBaseUrl}/menu`
              }
            ]
      },
      {
        "@context": "https://schema.org",
        "@type": "Menu",
        "name": `Menú de ${name}`,
        "url": `${tenantBaseUrl}/menu`,
        "inLanguage": "es",
        "description": `Menú digital de ${name}. Pide online con delivery o retiro en tienda.`,
        "hasMenuSection": categoriesWithProducts,
      }
    ];

    return (
      <>
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: structured data JSON-LD must be inline for Googlebot
          dangerouslySetInnerHTML={{ __html: JSON.stringify(menuJsonLd) }}
        />
        <MenuClient
          name={name}
          logoUrl={logoUrl}
          businessInfo={businessInfo}
          branches={safeBranches}
          openBranchIds={openBranchIds}
          categories={categories}
          products={products}
          selectedBranchId={selectedBranch?.id ?? null}
          banners={heroBanners}
          country={company.country ?? "CL"}
          currency={company.currency ?? "CLP"}
          navbarType={navbarType}
          navigationMode={navigationMode}
          productCardStyle={productCardStyle}
          productDetailsMode={productDetailsMode}
          onlineOrderingEnabled={onlineOrderingEnabled}
          orderChannel={orderChannel}
        />
      </>
    );
}

