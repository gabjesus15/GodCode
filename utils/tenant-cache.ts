import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createSupabasePublicServerClient } from "./supabase/server";

export const getCachedCompany = cache(async (subdomain: string) => {
	return unstable_cache(
		async () => {
			const supabase = createSupabasePublicServerClient();
			const { data: company } = await supabase
				.from("companies")
				.select("id,name,legal_rut,email,phone,address,public_slug,custom_domain,plan_id,subscription_status,subscription_ends_at,theme_config,country,currency,created_by,created_at,updated_at,plans:plans(features)")
				.eq("public_slug", subdomain)
				.maybeSingle();

			return company;
		},
		[`company-slug:${subdomain}`],
		{
			tags: [`company-slug:${subdomain}`],
			revalidate: 300, // 5 minutes cache
		}
	)();
});

