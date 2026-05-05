"use client";

import WorldMap, { regions, type ISOCode } from "react-svg-worldmap";

type CountryRow = {
  countryCode: string;
  views: number;
  uniqueVisitors: number;
};

type Props = {
  countriesTop: CountryRow[];
};

const regionNameByCode = new Map(
  regions.map((r) => [String(r.code).toUpperCase(), String(r.name)]),
);
const validIsoCodes = new Set(regions.map((r) => String(r.code).toUpperCase()));

function nameForCode(countryCode: string): string {
  return regionNameByCode.get(countryCode.toUpperCase()) || countryCode.toUpperCase();
}

export function AnalyticsCountryMap({ countriesTop }: Props) {
  const mapData = countriesTop
    .map((row) => ({
      countryCode: row.countryCode.toUpperCase(),
      value: row.views,
    }))
    .filter((row) => row.value > 0 && validIsoCodes.has(row.countryCode))
    .map((row) => ({
      country: row.countryCode.toLowerCase() as ISOCode,
      value: row.value,
    }));

  const previewRows = countriesTop.slice(0, 8);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/90 p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
      <p className="text-sm font-semibold">Mapa visual por país</p>
      <p className="mt-1 text-xs text-zinc-500">Intensidad por volumen de visitas en el periodo seleccionado.</p>

      <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-2 dark:border-zinc-700 dark:bg-zinc-950/40">
        {mapData.length === 0 ? (
          <div className="flex min-h-[260px] items-center justify-center text-sm text-zinc-500">
            Sin datos de país todavía.
          </div>
        ) : (
          <WorldMap
            data={mapData}
            color="#2563eb"
            backgroundColor="transparent"
            title="Visitas por país"
            valueSuffix=" visitas"
            size="responsive"
            tooltipBgColor="#111827"
            tooltipTextColor="#f9fafb"
            frame
            frameColor="#e5e7eb"
            borderColor="#d1d5db"
          />
        )}
      </div>

      {previewRows.length > 0 ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {previewRows.map((row) => (
            <div key={row.countryCode} className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900">
              <p className="truncate font-medium text-zinc-700 dark:text-zinc-200">{nameForCode(row.countryCode)}</p>
              <p className="text-zinc-500">{row.views} vistas · {row.uniqueVisitors} únicos</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
