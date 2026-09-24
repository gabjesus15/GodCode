/** Tooltip común de los gráficos de analítica (área y barras): una fila por serie con su valor. */
export function AppleChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/95">
      <p className="mb-1 text-xs font-medium text-zinc-500">{label}</p>
      <div className="space-y-1">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-zinc-600 dark:text-zinc-300">{entry.name}</span>
            <span className="ml-auto text-xs font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
              {entry.value.toLocaleString("es-CL")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
