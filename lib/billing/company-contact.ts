import type { SupabaseClient } from "@supabase/supabase-js";

export type CompanyContact = {
	email: string;
	responsibleName: string;
	businessName: string;
	/** País del negocio: con él se eligen la zona horaria y el precio regional. */
	country: string | null;
};

/** A quién escribirle por la cuenta: el correo del alta y, si no hay, el de la empresa. */
export async function resolveCompanyContact(supabaseAdmin: SupabaseClient, companyId: string): Promise<CompanyContact> {
	const [{ data: app }, { data: company }] = await Promise.all([
		supabaseAdmin
			.from("onboarding_applications")
			.select("email,responsible_name,business_name")
			.eq("company_id", companyId)
			.order("created_at", { ascending: false })
			.limit(1)
			.maybeSingle(),
		supabaseAdmin.from("companies").select("name,email,country").eq("id", companyId).maybeSingle(),
	]);

	return {
		email: String(app?.email ?? company?.email ?? "").trim(),
		responsibleName: String(app?.responsible_name ?? "").trim(),
		businessName: String(company?.name ?? app?.business_name ?? "Tu negocio"),
		country: (company?.country as string | null | undefined) ?? null,
	};
}
