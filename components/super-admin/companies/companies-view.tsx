"use client";

import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { CompaniesTable } from "./companies-table";
import { useAdminRole } from "@/components/super-admin/shell/admin-role-context";
import Link from "next/link";

interface CompaniesViewProps {
  companies: Array<{
    id: string;
    name: string | null;
    public_slug?: string | null;
    custom_domain?: string | null;
    subscription_status: string | null;
    subscription_ends_at?: string | null;
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
    if (!term) {
      return companies;
    }

    return companies.filter((company) =>
      (company.name ?? "").toLowerCase().includes(term)
    );
  }, [companies, query]);

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 sm:text-2xl">
            Empresas
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            Busca y gestiona empresas rápidamente.
          </p>
        </div>
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-3 md:max-w-lg">
          <div className="w-full min-w-0 sm:max-w-xs">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar empresa..."
              className="w-full"
            />
          </div>
          {!readOnly && (
            <Link
              href="/companies/new"
              className="inline-flex h-10 min-w-0 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 sm:h-11"
            >
              Nueva empresa
            </Link>
          )}
        </div>
      </div>
      <div className="min-w-0 overflow-x-auto">
        <CompaniesTable companies={filtered} readOnly={readOnly} />
      </div>
    </div>
  );
}
