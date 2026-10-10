import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createSupabasePublicServerClient } from "./supabase/server";
import { companyHasPublicMenu } from "@/lib/plans/plan-product-mode";

/**
 * Negocio de las páginas públicas (`/{slug}`, menú, mi cuenta, íconos, llms.txt…).
 * Con el plan «solo panel CEO» no hay nada público: se trata como si no existiera.
 */
export const getCachedCompany = cache(async (subdomain: string) => {
	const company = await loadCachedCompany(subdomain);
	return company && companyHasPublicMenu(company) ? company : null;
});

const loadCachedCompany = (subdomain: string) =>
	unstable_cache(
		async () => {
			const supabase = createSupabasePublicServerClient();
			const { data: company, error } = await supabase
				.from("companies")
				.select("id,name,legal_rut,email,phone,address,public_slug,custom_domain,plan_id,subscription_status,subscription_ends_at,theme_config,integration_settings,country,currency,created_by,created_at,updated_at,plans:plans(features)")
				.eq("public_slug", subdomain)
				.maybeSingle();

			// Un fallo de la base se lanza: `unstable_cache` no guarda lo que lanzó y, si ya tenía la
			// fila, la sigue sirviendo. Devolver `null` dejaba cacheado 5 minutos «Tienda no disponible,
			// crea la tuya» para todos los clientes de un local que existe.
			if (error) {
				throw new Error(`tenant_company_unavailable: ${error.message}`, { cause: error });
			}

			return company;
		},
		[`company-slug:${subdomain}`],
		{
			tags: [`company-slug:${subdomain}`],
			revalidate: 300, // 5 minutes cache
		}
	)();

