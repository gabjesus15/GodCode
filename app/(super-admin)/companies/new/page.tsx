import { CompanyForm } from "../../../../components/super-admin/companies/company-form";
import { createSupabaseServerClient } from "../../../../utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function CompanyCreatePage() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("plans")
      .select("id,name,price,features")
      .eq("is_active", true)
      .order("price", { ascending: true });

    if (error) {
      throw error;
    }

    return (
      <div className="flex flex-col gap-6">
        <CompanyForm plans={data ?? []} />
      </div>
    );
  } catch {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        No se pudo cargar el formulario de empresas.
      </div>
    );
  }
}
