"use client";

import { useMemo, useState } from "react";
import { Building2, Plus } from "lucide-react";
import Link from "next/link";

import type { StatusTone } from "@/lib/status/status-labels";
import { CompaniesTable } from "./companies-table";
import { SaasPageHeader } from "@/components/super-admin/shared/saas-page-header";
import { SaasFilterBar, SaasSearchInput } from "@/components/super-admin/shared/saas-filter-bar";
import { useAdminRole } from "@/components/super-admin/shell/admin-role-context";

/** Fila ya lista para pintar: la arma el servidor (ver la página de Empresas). */
export type CompanyListRow = {
  id: string;
  name: string;
  email: string | null;
  publicSlug: string | null;
  subscriptionStatus: string | null;
  host: string;
  url: string;
  status: { label: string; variant: StatusTone };
  expiry: { label: string; variant: StatusTone } | null;
  planName: string | null;
  planDetail: string | null;
};

type StatusFilter = "all" | "attention" | "suspended";

export function CompaniesView({ companies }: { companies: CompanyListRow[] }) {
  const { readOnly } = useAdminRole();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const needsAttention = (company: CompanyListRow) =>
    company.status.variant === "danger" || company.expiry?.variant === "warning";

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return companies.filter((company) => {
      if (statusFilter === "attention" && !needsAttention(company)) return false;
      if (statusFilter === "suspended" && company.subscriptionStatus !== "suspended") return false;
      if (!term) return true;
      return [company.name, company.publicSlug, company.host, company.email, company.id]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [companies, query, statusFilter]);

  const counts = {
    all: companies.length,
    attention: companies.filter(needsAttention).length,
    suspended: companies.filter((company) => company.subscriptionStatus === "suspended").length,
  };

  return (
    <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
      <SaasPageHeader
        title="Empresas"
        description={`${companies.length} ${companies.length === 1 ? "empresa" : "empresas"} en la plataforma.`}
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
          placeholder="Nombre, subdominio, correo o ID…"
          wrapperClassName="w-full sm:w-72"
          aria-label="Buscar empresas"
        />
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar empresas">
          {(
            [
              { value: "all", label: "Todas" },
              { value: "attention", label: "Requieren atención" },
              { value: "suspended", label: "Suspendidas" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={statusFilter === option.value}
              onClick={() => setStatusFilter(option.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                statusFilter === option.value
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              {option.label} · {counts[option.value]}
            </button>
          ))}
        </div>
      </SaasFilterBar>

      {filtered.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-zinc-200 px-6 py-10 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          Ninguna empresa coincide con la búsqueda.
        </p>
      ) : (
        <CompaniesTable companies={filtered} readOnly={readOnly} />
      )}
    </div>
  );
}
