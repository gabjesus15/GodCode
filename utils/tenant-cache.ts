import { cache } from "react";
import { createSupabasePublicServerClient } from "./supabase/server";

export const getCachedCompany = cache(async (subdomain: string) => {
	const supabase = createSupabasePublicServerClient();
	const { data: company } = await supabase
		.from("companies")
		.select("id,name,legal_rut,email,phone,address,public_slug,custom_domain,plan_id,subscription_status,subscription_ends_at,theme_config,country,currency,created_by,created_at,updated_at")
		.eq("public_slug", subdomain)
		.maybeSingle();

	return company;
});
