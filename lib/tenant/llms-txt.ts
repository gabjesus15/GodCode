import { headers } from "next/headers";
import { getCachedCompany } from "@/utils/tenant-cache";
import { getCachedMenuRpcData } from "@/lib/tenant/cached-menu";
import { createSupabasePublicServerClient } from "@/utils/supabase/server";
import { isMainDomain } from "@/lib/tenant/main-domain-host";
import { formatLlmsTxtLink } from "@/lib/seo/llms-txt-format";

interface MenuCategory {
  id: string;
  name: string;
  order?: number | null;
}

interface MenuProduct {
  id: string;
  name: string;
  description?: string | null;
  category_id?: string | null;
  is_active?: boolean;
}

interface ProductPrice {
  product_id: string;
  price: number | string;
  has_discount?: boolean;
  discount_price?: number | string | null;
}

interface ProductBranchStatus {
  product_id: string;
  category_id?: string | null;
  is_active?: boolean;
}

interface MenuData {
  categories?: MenuCategory[];
  products?: MenuProduct[];
  product_prices?: ProductPrice[];
  product_branch?: ProductBranchStatus[];
}

export async function getLlmsTxtData(subdomain: string, isFullVersion = false) {
  const company = await getCachedCompany(subdomain);

  if (!company) {
    return null;
  }

  const status = company.subscription_status?.toLowerCase();
  if (status === "suspended" || status === "cancelled") {
    return null;
  }

  const supabase = createSupabasePublicServerClient();

  // Fetch branches directly to include contact URLs (whatsapp_url, instagram_url, map_url)
  const { data: branches } = await supabase
    .from("branches")
    .select("id, name, address, phone, whatsapp_url, instagram_url, map_url")
    .eq("company_id", company.id)
    .eq("is_active", true)
    .order("name");

  const activeBranches = branches || [];

  // Fetch menu products and categories from the first active branch (if any)
  let categories: MenuCategory[] = [];
  let products: (MenuProduct & { price?: number; has_discount?: boolean; discount_price?: number | null })[] = [];

  const firstBranch = activeBranches[0];
  if (firstBranch) {
    try {
      const rpcData = await getCachedMenuRpcData(company.id, subdomain, firstBranch.id);
      const menuData: MenuData | null = Array.isArray(rpcData.menuData) && rpcData.menuData.length > 0
        ? rpcData.menuData[0]
        : rpcData.menuData;

      if (menuData) {
        const categoriesRaw = menuData.categories ?? [];
        const productsRaw = menuData.products ?? [];
        const branchPrices = menuData.product_prices ?? [];
        const branchStatuses = menuData.product_branch ?? [];

        categories = [...categoriesRaw].sort(
          (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)
        );

        products = productsRaw
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
              name: product.name,
              description: product.description,
              category_id: statusData.category_id ?? product.category_id,
              price,
              has_discount: Boolean(priceData?.has_discount),
              discount_price: priceData?.discount_price ? Number(priceData.discount_price) : null,
            };
          })
          .filter(Boolean) as typeof products;
      }
    } catch (e) {
      console.error("Error generating LLMs.txt catalog:", e);
    }
  }

  // Construct absolute canonical URLs
  const hdrs = await headers();
  const host =
    hdrs.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    hdrs.get("host") ??
    `${subdomain}.godcode.me`;
  const protocol = hdrs.get("x-forwarded-proto") ?? "https";
  const pathPrefix = isMainDomain(host) ? `/${subdomain}` : "";
  const baseUrl = `${protocol}://${host}${pathPrefix}`;

  const themeConfig = company.theme_config as Record<string, unknown> | null;
  const displayName = (themeConfig?.displayName as string) ?? company.name ?? "GodCode";
  const businessDescription = `Menú digital y pedidos online de ${displayName}. Pide online con delivery o retiro a domicilio.`;
  const currency = company.currency ?? "CLP";

  // Build Markdown
  let markdown = "";
  if (isFullVersion) {
    markdown += `# ${displayName} - Catálogo de Productos Completo\n\n`;
    markdown += `> ${businessDescription}\n\n`;
    markdown += `Este es el archivo detallado de información para modelos de lenguaje (LLMs) y buscadores de inteligencia artificial. Contiene la lista completa de platos, descripciones, precios y detalles de contacto de ${displayName}.\n\n`;

    markdown += `## Enlaces principales\n`;
    markdown += `${formatLlmsTxtLink("Sitio web principal", baseUrl, "Página de inicio del negocio")}\n`;
    markdown += `${formatLlmsTxtLink("Menú digital y pedidos", `${baseUrl}/menu`, "Carta online y checkout")}\n`;
    markdown += `${formatLlmsTxtLink("Resumen IA (llms.txt)", `${baseUrl}/llms.txt`, "Versión resumida para LLMs")}\n\n`;
  } else {
    markdown += `# ${displayName}\n\n`;
    markdown += `> ${businessDescription}\n\n`;
    markdown += `Este es el archivo resumido de información optimizado para modelos de lenguaje (LLMs) y buscadores de inteligencia artificial (GEO). Ofrece una vista rápida de ${displayName}, sus sucursales y sus secciones de menú.\n\n`;

    markdown += `## Enlaces principales\n`;
    markdown += `${formatLlmsTxtLink("Sitio web principal", baseUrl, "Página de inicio del negocio")}\n`;
    markdown += `${formatLlmsTxtLink("Menú digital y pedidos", `${baseUrl}/menu`, "Carta online y checkout")}\n`;
    markdown += `${formatLlmsTxtLink("Catálogo completo para IA (llms-full.txt)", `${baseUrl}/llms-full.txt`, "Productos y precios para LLMs")}\n\n`;
  }

  // Add branches info
  if (activeBranches.length > 0) {
    markdown += `## Sucursales y contacto\n`;
    for (const b of activeBranches) {
      const branchName = b.name ?? "Principal";
      if (b.whatsapp_url) {
        markdown += `${formatLlmsTxtLink(`WhatsApp ${branchName}`, b.whatsapp_url, "Pedidos y contacto")}\n`;
      }
      if (b.instagram_url) {
        markdown += `${formatLlmsTxtLink(`Instagram ${branchName}`, b.instagram_url, "Red social")}\n`;
      }
      if (b.map_url) {
        markdown += `${formatLlmsTxtLink(`Ubicación ${branchName}`, b.map_url, "Google Maps")}\n`;
      }
      const details: string[] = [];
      if (b.address) details.push(`Dirección: ${b.address}`);
      if (b.phone) details.push(`Teléfono: ${b.phone}`);
      if (details.length > 0) {
        markdown += `${details.join(" · ")}\n`;
      }
      markdown += `\n`;
    }
  }

  // Add categories & menu items
  if (categories.length > 0) {
    if (isFullVersion) {
      markdown += `## Carta y Productos por Categoría\n\n`;
      for (const cat of categories) {
        const catProducts = products.filter((p) => p.category_id === cat.id);
        if (catProducts.length === 0) continue;

        markdown += `### ${cat.name}\n\n`;
        for (const prod of catProducts) {
          const priceStr = prod.has_discount && prod.discount_price
            ? `${prod.discount_price} ${currency} (Precio especial, antes ${prod.price} ${currency})`
            : `${prod.price} ${currency}`;

          markdown += `- **${prod.name}** - ${priceStr}\n`;
          if (prod.description) {
            markdown += `  _${prod.description.trim()}_\n`;
          }
          markdown += `\n`;
        }
      }
    } else {
      markdown += `## Categorías de la Carta\n`;
      markdown += `Ofrecemos las siguientes secciones en nuestro menú:\n`;
      for (const cat of categories) {
        const catProducts = products.filter((p) => p.category_id === cat.id);
        if (catProducts.length === 0) continue;
        markdown += `- **${cat.name}** (${catProducts.length} productos disponibles)\n`;
      }
      markdown += `\nConsulta el menú en ${formatLlmsTxtLink("menú digital", `${baseUrl}/menu`)} o el ${formatLlmsTxtLink("catálogo IA completo", `${baseUrl}/llms-full.txt`)}.\n`;
    }
  }

  return markdown;
}
