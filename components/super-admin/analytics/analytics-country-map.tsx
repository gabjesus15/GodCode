"use client";

import { useMemo, useState } from "react";
import type { Feature, GeoJsonProperties, Geometry } from "geojson";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import { Globe2, MapPin } from "lucide-react";
import countriesTopology from "world-atlas/countries-110m.json";
import { numericToAlpha2, registerLocale, getName } from "i18n-iso-countries";
import esLocale from "i18n-iso-countries/langs/es.json";

import { countryFlagEmoji } from "@/utils/country-flag";
import { cn } from "@/utils/cn";

registerLocale(esLocale);

type CountryRow = {
  countryCode: string;
  views: number;
  uniqueVisitors: number;
};

type Props = {
  countriesTop: CountryRow[];
};

const topology = countriesTopology as unknown as Topology;
const countriesCollection = topology.objects.countries as GeometryCollection;
const geoFeatures = (feature(topology, countriesCollection) as { features: Array<Feature<Geometry, GeoJsonProperties>> }).features;

function getAlpha2FromNumeric(numericCode: string): string | null {
  return numericToAlpha2(numericCode) || null;
}

function interpolateColor(value: number, max: number): string {
  if (max === 0 || value === 0) return "#f4f4f5";
  const t = Math.min(1, value / max);
  // From zinc-100 to iOS blue
  const start = { r: 244, g: 244, b: 245 };
  const end = { r: 0, g: 122, b: 255 };
  return `rgb(${Math.round(start.r + (end.r - start.r) * t)}, ${Math.round(
    start.g + (end.g - start.g) * t,
  )}, ${Math.round(start.b + (end.b - start.b) * t)})`;
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

export function AnalyticsCountryMap({ countriesTop }: Props) {
  const [hovered, setHovered] = useState<{ name: string; code: string; views: number; unique: number } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const dataByCode = useMemo(() => {
    const map = new Map<string, CountryRow>();
    for (const row of countriesTop) {
      map.set(row.countryCode.toUpperCase(), row);
    }
    return map;
  }, [countriesTop]);

  const maxViews = countriesTop[0]?.views ?? 0;
  const previewRows = countriesTop.slice(0, 8);

  const handleMouseMove = (evt: React.MouseEvent) => {
    const rect = (evt.currentTarget as SVGElement).getBoundingClientRect();
    setMousePos({ x: evt.clientX - rect.left, y: evt.clientY - rect.top });
  };

  return (
    <div className="rounded-3xl border border-zinc-200/60 bg-white p-5 shadow-sm dark:border-zinc-800/60 dark:bg-zinc-900/80 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/30">
            <Globe2 className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Mapa por país</h3>
            <p className="text-xs text-zinc-500">Intensidad por volumen de visitas.</p>
          </div>
        </div>
        {countriesTop.length > 0 && (
          <div className="inline-flex items-center gap-1.5 self-start rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            <MapPin className="h-3 w-3" />
            {countriesTop.length} {countriesTop.length === 1 ? "país" : "países"}
          </div>
        )}
      </div>

      <div
        className="relative overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-950/30"
        onMouseLeave={() => setHovered(null)}
      >
        {countriesTop.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center gap-2 text-sm text-zinc-400">
            <Globe2 className="h-8 w-8 text-zinc-300 dark:text-zinc-700" />
            <p>Sin datos de país todavía.</p>
          </div>
        ) : (
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{ scale: 120, center: [0, 30] }}
            className="h-[320px] w-full"
            onMouseMove={handleMouseMove}
          >
            <ZoomableGroup zoom={1} minZoom={1} maxZoom={4}>
              <Geographies geography={geoFeatures}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const numericId = String(geo.id);
                    const alpha2 = getAlpha2FromNumeric(numericId);
                    const row = alpha2 ? dataByCode.get(alpha2.toUpperCase()) : undefined;
                    const hasData = row && row.views > 0;
                    const fill = hasData ? interpolateColor(row.views, maxViews) : "#f4f4f5";
                    const name = (geo.properties?.name as string) ?? alpha2 ?? "Desconocido";

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={fill}
                        stroke="#e4e4e7"
                        strokeWidth={0.5}
                        className="outline-none transition duration-200"
                        style={{
                          default: { outline: "none" },
                          hover: { outline: "none", fill: hasData ? "#2563eb" : "#e5e5ea" },
                          pressed: { outline: "none" },
                        }}
                        onMouseEnter={() => {
                          if (hasData && row) {
                            setHovered({
                              name,
                              code: alpha2!,
                              views: row.views,
                              unique: row.uniqueVisitors,
                            });
                          }
                        }}
                        onMouseLeave={() => setHovered(null)}
                      />
                    );
                  })
                }
              </Geographies>
            </ZoomableGroup>
          </ComposableMap>
        )}

        {hovered && (
          <div
            className="pointer-events-none absolute z-10 rounded-xl border border-zinc-200/80 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/95"
            style={{
              left: Math.min(mousePos.x + 12, 300),
              top: Math.min(mousePos.y + 12, 200),
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">{countryFlagEmoji(hovered.code)}</span>
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{hovered.name}</span>
            </div>
            <div className="mt-1 flex gap-3 text-xs text-zinc-500">
              <span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {hovered.views.toLocaleString("es-CL")}
                </span>{" "}
                vistas
              </span>
              <span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {hovered.unique.toLocaleString("es-CL")}
                </span>{" "}
                únicos
              </span>
            </div>
          </div>
        )}
      </div>

      {previewRows.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {previewRows.map((row, index) => (
            <div
              key={row.countryCode}
              className={cn(
                "rounded-2xl border border-zinc-100 bg-zinc-50/50 p-3 transition hover:bg-zinc-100/50 dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:bg-zinc-800/40",
                index === 0 && "border-blue-100 bg-blue-50/30 dark:border-blue-900/30 dark:bg-blue-950/20",
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{countryFlagEmoji(row.countryCode)}</span>
                  <span className="truncate text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                    {getName(row.countryCode, "es") || row.countryCode.toUpperCase()}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-zinc-400">#{index + 1}</span>
              </div>
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {row.views.toLocaleString("es-CL")}
                  </span>
                  <span className="text-zinc-400">{row.uniqueVisitors.toLocaleString("es-CL")} únicos</span>
                </div>
                <ProgressBar value={row.views} max={maxViews} />
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
