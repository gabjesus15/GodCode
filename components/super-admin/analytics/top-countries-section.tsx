"use client";

import { Globe } from "lucide-react";

import { SaasDataTable } from "@/components/super-admin/shared/saas-data-table";
import { useSaasListAnimate } from "@/components/super-admin/shared/use-saas-list-animate";
import { countryFlagEmoji } from "@/utils/country-flag";

interface CountryRow {
  countryCode: string;
  views: number;
  uniqueVisitors: number;
}

interface Props {
  countriesTop: CountryRow[];
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.max(1, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
      <div
        className="h-full rounded-full bg-blue-500 transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function TopCountriesSection({ countriesTop }: Props) {
  const [ref] = useSaasListAnimate<HTMLDivElement>();
  const maxViews = countriesTop[0]?.views ?? 0;

  return (
    <div ref={ref}>
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
          <Globe className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
        </div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Top países</h3>
      </div>
      <div className="rounded-3xl border border-zinc-200/60 bg-white p-1 shadow-sm dark:border-zinc-800/60 dark:bg-zinc-900/80">
        <SaasDataTable
          data={countriesTop}
          rowKey={(r) => r.countryCode}
          emptyMessage="Sin datos de país todavía."
          variant="apple"
          columns={[
            {
              key: "rank",
              header: "#",
              className: "w-10 text-center text-zinc-400",
              render: (_, index) => <span className="text-xs font-semibold text-zinc-400">#{index + 1}</span>,
            },
            {
              key: "country",
              header: "País",
              render: (r) => (
                <div className="flex items-center gap-2">
                  <span className="text-base">{countryFlagEmoji(r.countryCode)}</span>
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {r.countryCode.toUpperCase()}
                  </span>
                </div>
              ),
            },
            {
              key: "views",
              header: "Vistas",
              className: "w-32",
              render: (r) => (
                <div className="space-y-1.5">
                  <span className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    {r.views.toLocaleString("es-CL")}
                  </span>
                  <ProgressBar value={r.views} max={maxViews} />
                </div>
              ),
            },
            {
              key: "visitors",
              header: "Únicos",
              className: "w-24 text-right",
              render: (r) => (
                <span className="text-xs text-zinc-500">{r.uniqueVisitors.toLocaleString("es-CL")}</span>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
