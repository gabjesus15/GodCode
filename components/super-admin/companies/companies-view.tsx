"use client";

import { useMemo, useState } from "react";
import { Building2, Plus } from "lucide-react";
import Link from "next/link";

import { CompaniesTable } from "./companies-table";
import { SaasPageHeader } from "@/components/super-admin/shared/saas-page-header";
import { SaasFilterBar, SaasSearchInput } from "@/components/super-admin/shared/saas-filter-bar";
import { useAdminRole } from "@/components/super-admin/shell/admin-role-context";

interface CompaniesViewProps {
  companies: Array<{
    id: string;
    name: string | null;
    public_slug?: string | null;
    custom_domain?: string | null;
    subscription_status: string | null;
    subscription_ends_at?: string | null;
    country?: string | null;
    currency?: string | null;
    plans: {
      name: string | null;
      price: number | null;
      max_branches: number | null;
    } | { name: string | null; price: number | null; max_branches: number | null }[] | null;
  }>;
}

export function CompaniesView({ companies }: CompaniesViewProps) {
  const { readOnly } = useAdminRole();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return companies;
    return companies.filter((company) =>
      (company.name ?? "").toLowerCase().includes(term)
    );
  }, [companies, query]);

  return (
    <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
      <SaasPageHeader
        title="Empresas"
        description="Busca y gestiona empresas rápidamente."
        icon={Building2}
        action={
          !readOnly ? (
            <Link
              href="/companies/new"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <Plus className="h-4 w-4" />
              Nueva empresa
            </Link>
          ) : null
        }
      />

      <SaasFilterBar>
        <SaasSearchInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar empresa..."
          wrapperClassName="w-full sm:w-auto"
        />
      </SaasFilterBar>

      <div className="min-w-0 overflow-x-auto">
        <CompaniesTable companies={filtered} readOnly={readOnly} />
      </div>
    </div>
  );
}
