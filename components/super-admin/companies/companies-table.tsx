import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { useAutoAnimate } from "@formkit/auto-animate/react";

import { Card } from "@/components/ui/card";
import { CopyFieldButton } from "@/components/super-admin/shared/copy-field-button";
import { SaasStatusBadge } from "@/components/super-admin/shared/saas-status-badge";
import { CompanyDeleteButton } from "./company-delete-button";
import { CompanyStatusToggle } from "./company-status-toggle";
import type { CompanyListRow } from "./companies-view";

interface CompaniesTableProps {
  companies: CompanyListRow[];
  readOnly?: boolean;
}

export function CompaniesTable({ companies, readOnly = false }: CompaniesTableProps) {
  const [listRef] = useAutoAnimate();

  return (
    <div ref={listRef} className="grid gap-4">
      {companies.map((company) => (
        <Card
          key={company.id}
          className="rounded-3xl border border-zinc-200/60 bg-white p-4 dark:border-zinc-800/60 dark:bg-zinc-900/80 sm:p-5"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-start md:gap-x-6">
            <div className="min-w-0 md:col-span-5">
              <Link href={`/companies/${company.id}`} className="text-base font-semibold text-zinc-900 hover:underline dark:text-zinc-100">
                {company.name}
              </Link>
              {company.host ? (
                <a
                  href={company.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 flex w-fit max-w-full items-center gap-1.5 truncate text-xs font-medium text-zinc-500 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  <span className="truncate">{company.host}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
                </a>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-1.5">
                <CopyFieldButton value={company.id} label="ID" />
                {company.publicSlug ? <CopyFieldButton value={company.publicSlug} label="Subdominio" /> : null}
                {company.email ? <CopyFieldButton value={company.email} label="Correo" /> : null}
              </div>
            </div>

            <div className="min-w-0 md:col-span-4">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Plan</p>
              <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">{company.planName ?? "Sin plan"}</p>
              {company.planDetail ? <p className="text-xs text-zinc-500 dark:text-zinc-400">{company.planDetail}</p> : null}
            </div>

            <div className="min-w-0 md:col-span-3">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Estado</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <SaasStatusBadge label={company.status.label} variant={company.status.variant} />
                {company.expiry ? <SaasStatusBadge label={company.expiry.label} variant={company.expiry.variant} /> : null}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <Link
              href={`/companies/${company.id}`}
              className="inline-flex h-9 items-center justify-center rounded-xl bg-zinc-900 px-3 text-xs font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Gestionar
            </Link>
            <CompanyStatusToggle companyId={company.id} currentStatus={company.subscriptionStatus} />
            <div className="ml-auto">
              <CompanyDeleteButton companyId={company.id} companyName={company.name} publicSlug={company.publicSlug} readOnly={readOnly} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
