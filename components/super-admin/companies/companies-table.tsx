import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CompanyDeleteButton } from "./company-delete-button";
import { CompanyStatusToggle } from "./company-status-toggle";
import { SaasStatusBadge } from "@/components/super-admin/shared/saas-status-badge";
import { CopyFieldButton } from "@/components/super-admin/shared/copy-field-button";
import { getTenantHost, getTenantUrl } from "@/utils/tenant-url";
import { getEffectiveCustomDomain } from "@/lib/tenant/tenant-effective-custom-domain";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { companySubscriptionStatus } from "@/lib/super-admin/status-maps";

type PlanInfo = {
  name: string | null;
  price: number | null;
  max_branches: number | null;
};

type CompanyRow = {
  id: string;
  name: string | null;
  legal_rut?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  public_slug?: string | null;
  custom_domain?: string | null;
  plan_id?: string | null;
  subscription_status: string | null;
  subscription_ends_at?: string | null;
  country?: string | null;
  currency?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  status?: string | null;
  email_verified_at?: string | null;
  plans: PlanInfo | PlanInfo[] | null;
};

interface CompaniesTableProps {
  companies: CompanyRow[];
  readOnly?: boolean;
}

const dayMs = 1000 * 60 * 60 * 24;

const getExpiryBadge = (subscriptionEndsAt?: string | null) => {
  if (!subscriptionEndsAt) return null;
  const diffMs = new Date(subscriptionEndsAt).getTime() - Date.now();
  const days = Math.ceil(diffMs / dayMs);
  if (Number.isNaN(days)) return null;
  if (days <= 0) return { label: "Vencido", variant: "danger" as const };
  if (days <= 7) return { label: `Vence en ${days} días`, variant: "warning" as const };
  return { label: `Vence en ${days} días`, variant: "neutral" as const };
};

export function CompaniesTable({ companies, readOnly = false }: CompaniesTableProps) {
  const [listRef] = useAutoAnimate();

  const buildTenantHost = (
    slug: string | null | undefined,
    customDomain?: string | null,
    subscriptionEndsAt?: string | null,
    subscriptionStatus?: string | null
  ) =>
    slug
      ? getTenantHost(slug, getEffectiveCustomDomain(customDomain, subscriptionEndsAt, subscriptionStatus))
      : "";

  const buildTenantUrl = (
    slug: string | null | undefined,
    customDomain?: string | null,
    subscriptionEndsAt?: string | null,
    subscriptionStatus?: string | null
  ) =>
    slug
      ? getTenantUrl(slug, getEffectiveCustomDomain(customDomain, subscriptionEndsAt, subscriptionStatus))
      : "";

  return (
    <div ref={listRef} className="grid gap-4">
      {companies.map((company) => {
        const plan = Array.isArray(company.plans) ? company.plans[0] : company.plans;
        const status = companySubscriptionStatus(company.subscription_status);
        const expiry = getExpiryBadge(company.subscription_ends_at);
        const host = buildTenantHost(
          company.public_slug,
          company.custom_domain,
          company.subscription_ends_at,
          company.subscription_status
        );

        return (
          <Card
            key={company.id}
            className="rounded-3xl border border-zinc-200/60 bg-white p-4 dark:border-zinc-800/60 dark:bg-zinc-900/80 sm:p-5"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-start md:gap-x-6">
              {/* Main info */}
              <div className="min-w-0 md:col-span-5">
                <Link
                  href={`/companies/${company.id}`}
                  className="text-base font-semibold text-zinc-900 hover:underline dark:text-zinc-100"
                >
                  {company.name ?? "Sin nombre"}
                </Link>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">ID: {company.id}</p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <CopyFieldButton value={company.id} label="ID" />
                  {company.public_slug ? <CopyFieldButton value={company.public_slug} label="Slug" /> : null}
                  {company.email ? <CopyFieldButton value={company.email} label="Email" /> : null}
                </div>

                {host && (
                  <a
                    href={buildTenantUrl(
                      company.public_slug,
                      company.custom_domain,
                      company.subscription_ends_at,
                      company.subscription_status
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    {host}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {/* Plan */}
              <div className="min-w-0 md:col-span-3">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Plan</p>
                <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">{plan?.name ?? "Sin plan"}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {plan?.price ? `$${plan.price}` : "--"} · {plan?.max_branches ?? 0} sucursales
                </p>
                {expiry && (
                  <div className="mt-2">
                    <SaasStatusBadge label={expiry.label} variant={expiry.variant} />
                  </div>
                )}
              </div>

              {/* Status */}
              <div className="min-w-0 md:col-span-4">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Estado</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <SaasStatusBadge label={status.label} variant={status.variant} />
                  {expiry && <SaasStatusBadge label={expiry.label} variant={expiry.variant} />}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <CompanyStatusToggle companyId={company.id} currentStatus={company.subscription_status} />
              <Link
                href="/dashboard/salud-pagos"
                className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Salud pagos
              </Link>
              <Link
                href={`/companies/${company.id}`}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Gestionar
              </Link>
              <CompanyDeleteButton
                companyId={company.id}
                companyName={company.name ?? null}
                publicSlug={company.public_slug ?? null}
                readOnly={readOnly}
              />
            </div>
          </Card>
        );
      })}
    </div>
  );
}
