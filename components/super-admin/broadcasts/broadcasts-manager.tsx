"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAdminRole } from "@/components/super-admin/shell/admin-role-context";
import { toast } from "sonner";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { SaasSelect } from "@/components/super-admin/shared/saas-select";
import { SaasSwitch } from "@/components/super-admin/shared/saas-switch";
import { SaasStatusBadge } from "@/components/super-admin/shared/saas-status-badge";
import { SaasEmptyState } from "@/components/super-admin/shared/saas-empty-state";

type BroadcastType = "general" | "maintenance" | "incident" | "billing" | "release";
type BroadcastPriority = "low" | "medium" | "high" | "critical";
type TargetScope = "all" | "plans" | "companies" | "subdomains";

interface BroadcastItem {
  id: string;
  title: string;
  message: string;
  broadcastType: BroadcastType;
  priority: BroadcastPriority;
  targetScope: TargetScope;
  targetPlanIds: string[];
  targetCompanyIds: string[];
  targetSubdomains: string[];
  startsAt: string;
  endsAt: string | null;
  requiresAck: boolean;
  isActive: boolean;
  createdAt: string;
}

const TYPE_OPTIONS = [
  { value: "general", label: "General" },
  { value: "maintenance", label: "Mantenimiento" },
  { value: "incident", label: "Incidente" },
  { value: "billing", label: "Facturación" },
  { value: "release", label: "Release" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Baja" },
  { value: "medium", label: "Media" },
  { value: "high", label: "Alta" },
  { value: "critical", label: "Crítica" },
];

const SCOPE_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "plans", label: "Planes" },
  { value: "companies", label: "Empresas" },
  { value: "subdomains", label: "Subdominios" },
];

const emptyForm = {
  title: "",
  message: "",
  broadcastType: "maintenance" as BroadcastType,
  priority: "high" as BroadcastPriority,
  targetScope: "all" as TargetScope,
  targetPlanIdsText: "",
  targetCompanyIdsText: "",
  targetSubdomainsText: "",
  startsAt: "",
  endsAt: "",
  requiresAck: true,
  isActive: true,
};

const parseLines = (value: string) =>
  value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const toDatetimeLocal = (iso: string | null) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const tzOffset = date.getTimezoneOffset() * 60000;
  const local = new Date(date.getTime() - tzOffset);
  return local.toISOString().slice(0, 16);
};

export default function BroadcastsManager() {
  const { readOnly } = useAdminRole();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [listRef] = useAutoAnimate();

  const { data: broadcastsData, isLoading: loading, error: queryError } = useQuery<BroadcastItem[]>({
    queryKey: ["super-admin", "broadcasts"],
    queryFn: async () => {
      const res = await fetch("/api/super-admin/broadcasts");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudieron cargar los comunicados");
      return data.broadcasts ?? [];
    },
  });

  useEffect(() => {
    if (queryError) {
      toast.error(queryError instanceof Error ? queryError.message : "No se pudieron cargar los comunicados");
    }
  }, [queryError]);

  const items = broadcastsData ?? [];

  const sortedItems = useMemo(
    () =>
      [...(broadcastsData ?? [])].sort((a, b) => {
        const start = new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime();
        if (start !== 0) return start;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }),
    [broadcastsData],
  );

  const setField = <K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  useEffect(() => {
    if (readOnly) {
      setForm(emptyForm);
      setEditingId(null);
    }
  }, [readOnly]);

  const submit = async () => {
    if (readOnly) return;
    if (!form.title.trim()) {
      toast.error("Debes indicar un título");
      return;
    }

    if (!form.message.trim()) {
      toast.error("Debes indicar un mensaje");
      return;
    }

    if (!form.startsAt) {
      toast.error("Debes indicar fecha/hora de inicio");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: editingId,
        title: form.title.trim(),
        message: form.message.trim(),
        broadcastType: form.broadcastType,
        priority: form.priority,
        targetScope: form.targetScope,
        targetPlanIds: parseLines(form.targetPlanIdsText),
        targetCompanyIds: parseLines(form.targetCompanyIdsText),
        targetSubdomains: parseLines(form.targetSubdomainsText).map((item) => item.toLowerCase()),
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
        requiresAck: form.requiresAck,
        isActive: form.isActive,
      };

      const res = await fetch("/api/super-admin/broadcasts", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar el comunicado");

      toast.success(editingId ? "Comunicado actualizado correctamente" : "Comunicado creado correctamente");
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ["super-admin", "broadcasts"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar el comunicado");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item: BroadcastItem) => {
    if (readOnly) return;
    setEditingId(item.id);
    setForm({
      title: item.title,
      message: item.message,
      broadcastType: item.broadcastType,
      priority: item.priority,
      targetScope: item.targetScope,
      targetPlanIdsText: item.targetPlanIds.join("\n"),
      targetCompanyIdsText: item.targetCompanyIds.join("\n"),
      targetSubdomainsText: item.targetSubdomains.join("\n"),
      startsAt: toDatetimeLocal(item.startsAt),
      endsAt: toDatetimeLocal(item.endsAt),
      requiresAck: item.requiresAck,
      isActive: item.isActive,
    });
  };

  const handleDelete = async (item: BroadcastItem) => {
    if (readOnly) return;
    if (!confirm(`¿Eliminar comunicado "${item.title}"?`)) return;

    setSaving(true);
    try {
      const res = await fetch("/api/super-admin/broadcasts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo eliminar el comunicado");
      toast.success("Comunicado eliminado correctamente");
      await queryClient.invalidateQueries({ queryKey: ["super-admin", "broadcasts"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar el comunicado");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="rounded-3xl border-zinc-200/60 bg-white p-5 shadow-sm dark:border-zinc-800/60 dark:bg-zinc-900/80 sm:p-6">
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
            <Megaphone className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 sm:text-lg">Comunicados globales</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Publica avisos masivos para todos los negocios o por segmentos (plan, empresa, subdominio).</p>
          </div>
        </div>

        {!readOnly ? (
          <div className="rounded-2xl border border-zinc-200/60 bg-zinc-50/60 p-4 dark:border-zinc-700/60 dark:bg-zinc-900/50">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="Título del comunicado"
                value={form.title}
                onChange={(event) => setField("title", event.target.value)}
                className="h-10 rounded-xl"
              />
              <SaasSelect
                label="Tipo"
                options={TYPE_OPTIONS}
                value={form.broadcastType}
                onChange={(value) => setField("broadcastType", value as BroadcastType)}
              />
            </div>

            <div className="mt-3">
              <Textarea
                value={form.message}
                onChange={(event) => setField("message", event.target.value)}
                placeholder="Mensaje que se mostrará en los paneles admin tenant"
                rows={4}
              />
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <SaasSelect
                label="Prioridad"
                options={PRIORITY_OPTIONS}
                value={form.priority}
                onChange={(value) => setField("priority", value as BroadcastPriority)}
              />
              <SaasSelect
                label="Alcance"
                options={SCOPE_OPTIONS}
                value={form.targetScope}
                onChange={(value) => setField("targetScope", value as TargetScope)}
              />
              <div className="flex items-end">
                <SaasSwitch
                  label="Requiere acuse"
                  checked={form.requiresAck}
                  onChange={(checked) => setField("requiresAck", checked)}
                />
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Inicio
                <input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(event) => setField("startsAt", event.target.value)}
                  className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-500"
                />
              </label>

              <label className="grid gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Fin (opcional)
                <input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(event) => setField("endsAt", event.target.value)}
                  className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-500"
                />
              </label>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Textarea
                value={form.targetPlanIdsText}
                onChange={(event) => setField("targetPlanIdsText", event.target.value)}
                placeholder="Plan IDs (uno por línea)"
                rows={3}
                className="text-xs"
              />
              <Textarea
                value={form.targetCompanyIdsText}
                onChange={(event) => setField("targetCompanyIdsText", event.target.value)}
                placeholder="Company IDs (uno por línea)"
                rows={3}
                className="text-xs"
              />
              <Textarea
                value={form.targetSubdomainsText}
                onChange={(event) => setField("targetSubdomainsText", event.target.value)}
                placeholder="Subdominios (uno por línea)"
                rows={3}
                className="text-xs"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <SaasSwitch
                label="Activo"
                checked={form.isActive}
                onChange={(checked) => setField("isActive", checked)}
              />
              <div className="flex-1" />
              <Button onClick={() => void submit()} disabled={saving || loading}>
                {editingId ? <Save className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                {editingId ? "Guardar" : "Crear comunicado"}
              </Button>
              {editingId ? (
                <Button variant="outline" onClick={resetForm}>
                  <X className="mr-2 h-4 w-4" />
                  Cancelar edición
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Comunicados ({items.length})</h4>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
              ))}
            </div>
          ) : sortedItems.length === 0 ? (
            <SaasEmptyState icon={Megaphone} title="Sin comunicados" description="Aún no hay comunicados publicados." />
          ) : (
            <div ref={listRef} className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200/60 dark:divide-zinc-800 dark:border-zinc-800/60">
              {sortedItems.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-4 p-4 transition hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">{item.title}</p>
                      <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {item.broadcastType}
                      </span>
                      <SaasStatusBadge label={item.priority} variant={item.priority === "critical" ? "danger" : item.priority === "high" ? "warning" : item.priority === "medium" ? "info" : "neutral"} />
                      <SaasStatusBadge label={item.isActive ? "Activo" : "Inactivo"} variant={item.isActive ? "success" : "neutral"} />
                    </div>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{item.message}</p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      Alcance: {item.targetScope} · Inicia: {new Date(item.startsAt).toLocaleString("es-CL")} · {item.requiresAck ? "Con acuse" : "Sin acuse"}
                    </p>
                  </div>

                  {!readOnly ? (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void handleDelete(item)}
                        className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-amber-200/60 bg-amber-50/60 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          <Megaphone className="mr-2 inline h-4 w-4" />
          Recomendación: para mantenimiento usa prioridad <code>high</code> o <code>critical</code> y activa <code>requiere acuse</code>.
        </div>
      </div>
    </Card>
  );
}
