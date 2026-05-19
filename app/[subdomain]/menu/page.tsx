import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { createSupabasePublicServerClient } from "../../../utils/supabase/server";
import { MenuClient } from "../../../components/tenant/menu/menu-client";
import type { HeroBanner } from "../../../components/tenant/home/hero-carousel";
import { isMainDomain } from "@/lib/tenant/main-domain-host";
import { tenantBrandingIconVersionSeed } from "@/lib/tenant/tenant-favicon-utils";

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
  const metadataBase = new URL(`${protocol}://${host}`);
  const pathPrefix = isMainDomain(host) ? `/${resolvedParams.subdomain}` : "";
	const supabase = createSupabasePublicServerClient();
	const { data: company } = await supabase
		.from("companies")
    .select("id,updated_at,name,theme_config,custom_domain")
		.eq("public_slug", resolvedParams.subdomain)
		.maybeSingle();

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
  const icon = `/tenant-favicon?v=${encodeURIComponent(String(iconVersionSeed))}`;
  const canonical = `${metadataBase.origin}${pathPrefix}/menu`;

	return {
    metadataBase,
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

  // --- A. Obtener la empresa primero (Filtro base) ---
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id,name,public_slug,theme_config,subscription_status,phone,address,country,currency")
    .eq("public_slug", resolvedParams.subdomain)
    .maybeSingle();

  if (companyError || !company) {
    if (resolvedSearchParams?.debug === "1") {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          No se pudo cargar la empresa para este subdominio.
          <pre className="debug-pre">
            {JSON.stringify(
              {
                subdomain: resolvedParams.subdomain,
                error: companyError?.message ?? null,
                status: companyError?.code ?? null,
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

  const status = company.subscription_status?.toLowerCase();
  if (status === "suspended" || status === "cancelled") {
    notFound();
  }

  // --- B. Ejecutar consultas secundarias en PARALELO para máximo rendimiento ---
  const [
      { data: branches, error: branchesError },
      { data: openShifts, error: openShiftsError },
      { data: businessInfoRaw, error: businessInfoError },
    ] = await Promise.all([
      supabase
        .from("branches")
        .select("id,name,address,phone,schedule,company_id,payment_methods,pago_movil,zelle,transferencia_bancaria,stripe,mercadopago,paypal,efectivo,tarjeta,delivery_settings,origin_lat,origin_lng")
        .eq("company_id", company.id)
        .order("name"),
      supabase
        .from("cash_shifts")
        .select("branch_id")
        .eq("company_id", company.id)
        .eq("status", "open"),
      supabase
        .from("business_info")
        .select("id,name,phone,address,instagram,schedule,country,currency,bank_name,account_type,account_number,account_rut,account_email,bank_details,account_holder,company_id,created_at,updated_at")
        .eq("company_id", company.id)
        .maybeSingle(),
    ]);

    if (branchesError || openShiftsError || businessInfoError) {
      if (resolvedSearchParams?.debug === "1") {
        return (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            No se pudo cargar la informacion base del menu.
            <pre className="debug-pre">
              {JSON.stringify(
                {
                  subdomain: resolvedParams.subdomain,
                  branchesError: branchesError?.message ?? null,
                  openShiftsError: openShiftsError?.message ?? null,
                  businessInfoError: businessInfoError?.message ?? null,
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

    const openBranchIds = (openShifts ?? [])
      .map((shift) => String(shift.branch_id))
      .filter(Boolean);
    const openBranchIdSet = new Set(openBranchIds);

    // --- C. Selección segura de la sucursal ---
    const safeBranches = branches ?? [];
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
      // --- D. Obtener Menú + Banners en paralelo ---
      const [menuResult, bannersResult] = await Promise.all([
        supabase.rpc("get_public_menu", {
          p_company_slug: resolvedParams.subdomain,
          p_branch_id: menuBranch.id,
        }),
        supabase
          .from("hero_banners")
          .select("id, image_url")
          .eq("branch_id", menuBranch.id)
          .eq("is_active", true)
          .gt("expires_at", new Date().toISOString())
          .order("sort_order"),
      ]);

      if (menuResult.error) {
        if (resolvedSearchParams?.debug === "1") {
          return (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
              No se pudo cargar el menu de la sucursal seleccionada.
              <pre className="debug-pre">
                {JSON.stringify(
                  {
                    subdomain: resolvedParams.subdomain,
                    branchId: menuBranch.id,
                    error: menuResult.error.message ?? null,
                    code: menuResult.error.code ?? null,
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

      menuData = Array.isArray(menuResult.data) && menuResult.data.length > 0
        ? menuResult.data[0]
        : menuResult.data;
      heroBannerRows = ((bannersResult.data ?? []) as { id: string; image_url: string }[]).filter(
        (r) => typeof r.image_url === "string" && r.image_url.trim().length > 0
      );
    }

    // --- E. Asignación de tipos fuertes (¡Adiós 'any'!) ---
    const categoriesRaw = (menuData?.categories ?? []) as RawRPCCategory[];
    const productsRaw = (menuData?.products ?? []) as RawRPCProduct[];
    const branchPrices = (menuData?.product_prices ?? []) as RawRPCPrice[];
    const branchStatuses = (menuData?.product_branch ?? []) as RawRPCStatus[];

    const categories = [...categoriesRaw].sort(
      (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)
    );

    // --- F. Mapeo ultra-seguro y validado ---
    const products: MenuProduct[] = productsRaw
      .map((product) => {
        const priceData = branchPrices.find(
          (price) => price.product_id === product.id
        );
        const statusData = branchStatuses.find(
          (status) => status.product_id === product.id
        );

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

    const heroBanners = heroBannerRows.map((row) => ({
      id: row.id,
      image_url: row.image_url.trim(),
    }));

    // --- G. Casteo seguro de JSONB (Evita warnings silenciosos) ---
    const themeConfig = company.theme_config as Record<string, unknown> | null;
    const name = (themeConfig?.displayName as string) ?? company.name ?? "GodCode";
    const logoUrl = (themeConfig?.logoUrl as string) ?? null;
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

    const menuJsonLd = [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
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
      },
      {
        "@context": "https://schema.org",
        "@type": "Menu",
        "name": `Menú de ${name}`,
        "url": `${tenantBaseUrl}/menu`,
        "inLanguage": "es",
        "description": `Menú digital de ${name}. Pide online con delivery o retiro en tienda.`,
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
        />
      </>
    );
}

