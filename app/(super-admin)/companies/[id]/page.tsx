import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BranchesCreateForm } from "../../../../components/super-admin/branches/branches-create-form";
import { BranchesTable } from "../../../../components/super-admin/branches/branches-table";
import { CompanyGlobalTab } from "../../../../components/super-admin/companies/company-global-tab";
import { CompanyTabs } from "../../../../components/super-admin/companies/company-tabs";
import { isTenantExternalDeliveryAllowed } from "@/lib/integrations/company-integration-policy";
import { parseCompanyIntegrationSettingsJson } from "@/lib/integrations/company-integration-json";
import { createSupabaseServerClient } from "../../../../utils/supabase/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const supabase = await createSupabaseServerClient();
  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", resolvedParams.id)
    .maybeSingle();

  const name = company?.name?.trim() || "Empresa";
  return {
    title: {
      absolute: `${name} · GodCode`,
    },
  };
}

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  try {
    const supabase = await createSupabaseServerClient();

    const [
      { data: company, error: companyError },
      { data: businessInfo, error: businessError },
      { data: branches, error: branchesError },
      { data: plans, error: plansError },
      { data: payments, error: paymentsError },
    ] = await Promise.all([
      supabase
        .from("companies")
        .select(
          "id,name,legal_rut,email,phone,address,public_slug,custom_domain,plan_id,subscription_status,subscription_ends_at,theme_config,country,currency,integration_settings"
        )
        .eq("id", resolvedParams.id)
        .maybeSingle(),
      supabase
        .from("business_info")
        .select("name,phone,address,instagram,schedule,country,currency")
        .eq("company_id", resolvedParams.id)
        .maybeSingle(),
      supabase
        .from("branches")
          .select(
            "id,name,slug,address,phone,is_active,country,currency,instagram,schedule,payment_methods,pago_movil,zelle,transferencia_bancaria,stripe,mercadopago,efectivo,tarjeta,paypal,company_id,delivery_settings"
          )
        .eq("company_id", resolvedParams.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("plans")
        .select("id,name,price,max_branches,features")
        .order("price", { ascending: true }),
      supabase
        .from("payments_history")
        .select("id,amount_paid,payment_method,status,payment_date,payment_reference,months_paid,reference_file_url")
        .eq("company_id", resolvedParams.id)
        .order("payment_date", { ascending: false })
        .limit(10),
    ]);

    if (companyError || businessError || branchesError || plansError || paymentsError) {
      throw (
        companyError ??
        businessError ??
        branchesError ??
        plansError ??
        paymentsError
      );
    }

    if (!company) {
      notFound();
    }

    const integ = parseCompanyIntegrationSettingsJson(company.integration_settings);
    const uberIntegration = {
      clientId: integ.uber?.clientId ?? "",
      hasClientSecret: Boolean(integ.uber?.clientSecretEncrypted),
      allowTenantExternalDelivery: isTenantExternalDeliveryAllowed(company.integration_settings),
    };

    return (
      <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            Empresa
          </p>
          <h2 className="truncate text-xl font-semibold text-zinc-900 dark:text-zinc-100 sm:text-2xl">
            {company.name ?? "Sin nombre"}
          </h2>
          <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">ID: {company.id}</p>
        </div>

        <CompanyTabs
          tabs={[
            {
              id: "global",
              label: "Global",
              content: (
                <CompanyGlobalTab
                  company={company}
                  uberIntegration={uberIntegration}
                  businessInfo={businessInfo}
                  plans={plans ?? []}
                  payments={payments ?? []}
                />
              ),
            },
            {
              id: "branches",
              label: "Sucursales",
              content: (
                <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
                  <div className="min-w-0 rounded-2xl border border-zinc-200 bg-white/80 p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80 sm:p-5">
                    <div className="mb-3 sm:mb-4">
                      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 sm:text-lg">
                        Nueva sucursal
                      </h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Agrega una ubicacion y activala.
                      </p>
                    </div>
                    <BranchesCreateForm companyId={company.id} />
                  </div>
                  <BranchesTable branches={branches ?? []} />
                </div>
              ),
            },
          ]}
        />
      </div>
    );
  } catch (err) {
    console.error("[super-admin/companies/[id]]", err);
  
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300">
        No se pudo cargar la empresa.
      </div>
    );
  }
}
