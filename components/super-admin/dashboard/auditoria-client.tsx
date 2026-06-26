"use client";

import { useMemo, useState } from "react";
import type { Json } from "@/types/supabase-database";

import { SaasMetricCard } from "@/components/super-admin/shared/saas-metric-card";
import { SaasDataTable } from "@/components/super-admin/shared/saas-data-table";
import { Drawer } from "@/components/ui/drawer";

type Row = {
  id: string;
  created_at: string;
  actor_email: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata: Json | null;
};

function metadataPreview(meta: Json | null): string {
  if (meta == null || typeof meta !== "object" || Array.isArray(meta)) return "—";
  const o = meta as Record<string, unknown>;
  const keys = Object.keys(o).slice(0, 4);
  if (keys.length === 0) return "—";
  return keys.map((k) => `${k}: ${JSON.stringify(o[k])}`).join("; ").slice(0, 120);
}

interface AuditoriaClientProps {
  rows: Row[];
  error: string | null;
}

export function AuditoriaClient({ rows, error }: AuditoriaClientProps) {
  const [selectedMeta, setSelectedMeta] = useState<{ id: string; json: string } | null>(null);

  const eventsToday = useMemo(() => {
    const today = new Date().toDateString();
    return rows.filter((r) => new Date(r.created_at).toDateString() === today).length;
  }, [rows]);

  const topAction = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) counts.set(r.action, (counts.get(r.action) ?? 0) + 1);
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    return sorted[0] ? `${sorted[0][0]} (${sorted[0][1]})` : "—";
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <SaasMetricCard label="Eventos hoy" value={`${eventsToday}`} helper="Registros del día actual." />
        <SaasMetricCard label="Acción más frecuente" value={topAction} helper="Entre los últimos 120 eventos." />
      </div>

      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          No se pudo leer auditoría: {error}
        </div>
      ) : null}

      <SaasDataTable
        data={rows}
        rowKey={(r) => r.id}
        emptyMessage={error ? "Corrige el error anterior." : "Aún no hay eventos registrados."}
        columns={[
          {
            key: "date",
            header: "Fecha",
            className: "whitespace-nowrap",
            render: (r) => new Date(r.created_at).toLocaleString("es-CL"),
          },
          {
            key: "actor",
            header: "Actor",
            render: (r) => <span className="max-w-[140px] truncate">{r.actor_email ?? "—"}</span>,
          },
          { key: "action", header: "Acción", render: (r) => <span className="font-mono">{r.action}</span> },
          {
            key: "target",
            header: "Tipo / id",
            render: (r) => (
              <span className="max-w-[180px] truncate">
                {r.target_type}
                {r.target_id ? ` · ${r.target_id.slice(0, 10)}${r.target_id.length > 10 ? "…" : ""}` : ""}
              </span>
            ),
          },
          {
            key: "detail",
            header: "Detalle",
            render: (r) => (
              <button
                type="button"
                onClick={() =>
                  setSelectedMeta({
                    id: r.id,
                    json: JSON.stringify(r.metadata, null, 2) ?? "null",
                  })
                }
                className="max-w-[220px] truncate text-left text-indigo-600 hover:underline dark:text-indigo-400"
              >
                {metadataPreview(r.metadata)}
              </button>
            ),
          },
        ]}
      />

      <Drawer
        open={!!selectedMeta}
        onOpenChange={(o) => !o && setSelectedMeta(null)}
        title="Metadata completa"
        description={selectedMeta ? `Evento ${selectedMeta.id}` : undefined}
      >
        <pre className="max-h-[60vh] overflow-auto rounded-xl bg-zinc-50 p-4 text-xs dark:bg-zinc-900">
          {selectedMeta?.json}
        </pre>
      </Drawer>
    </div>
  );
}
