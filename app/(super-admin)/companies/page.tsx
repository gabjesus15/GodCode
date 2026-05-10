import { CompaniesView } from "../../../components/super-admin/companies/companies-view";
import { createSupabaseServerClient } from "../../../utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: companies, error } = await supabase
      .from("companies")
      .select(
        "id,name,public_slug,custom_domain,subscription_status,subscription_ends_at,plans(name,price,max_branches)"
      )
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    const companyIds = (companies ?? []).map((company) => company.id);
    const verificationByCompany = new Map<string, { status: string | null; email_verified_at: string | null }>();

    if (companyIds.length > 0) {
      const { data: verifications } = await supabase
        .from("onboarding_applications")
        .select("company_id,status,email_verified_at,created_at")
        .in("company_id", companyIds)
        .order("created_at", { ascending: false });

      for (const row of verifications ?? []) {
        if (!row.company_id || verificationByCompany.has(row.company_id)) continue;
        verificationByCompany.set(row.company_id, {
          status: row.status ?? null,
          email_verified_at: row.email_verified_at ?? null,
        });
      }
    }

    const data = (companies ?? []).map((company) => {
      const verification = verificationByCompany.get(company.id);
      return {
        ...company,
        status: verification?.status ?? null,
        email_verified_at: verification?.email_verified_at ?? null,
      };
    });

    return <CompaniesView companies={data} />;
  } catch (err) {
    console.error("[super-admin/companies]", err);
  
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        No se pudo cargar el listado de empresas.
      </div>
    );
  }
}
