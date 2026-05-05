"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Megaphone, Pencil, Plus, Save, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAdminRole } from "@/components/super-admin/shell/admin-role-context";

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

const TYPE_OPTIONS: BroadcastType[] = ["general", "maintenance", "incident", "billing", "release"];
const PRIORITY_OPTIONS: BroadcastPriority[] = ["low", "medium", "high", "critical"];
const SCOPE_OPTIONS: TargetScope[] = ["all", "plans", "companies", "subdomains"];

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
  const [items, setItems] = useState<BroadcastItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) => {
        const start = new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime();
        if (start !== 0) return start;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }),
    [items]
  );

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/broadcasts", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudieron cargar los comunicados");
      setItems(data.broadcasts ?? []);
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "No se pudieron cargar los comunicados" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

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
      setMessage({ type: "error", text: "Debes indicar un título" });
      return;
    }

    if (!form.message.trim()) {
      setMessage({ type: "error", text: "Debes indicar un mensaje" });
      return;
    }

    if (!form.startsAt) {
      setMessage({ type: "error", text: "Debes indicar fecha/hora de inicio" });
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

      setMessage({ type: "success", text: editingId ? "Comunicado actualizado" : "Comunicado creado" });
      resetForm();
      await loadItems();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "No se pudo guardar el comunicado" });
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
      setMessage({ type: "success", text: "Comunicado eliminado" });
      await loadItems();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "No se pudo eliminar el comunicado" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900/80">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Comunicados globales</h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Publica avisos masivos para todos los negocios o por segmentos (plan, empresa, subdominio).
          </p>
        </div>

        {message && (
          <div
            className={`rounded-lg border p-3 text-sm ${
              message.type === "success"
                ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900/70 dark:bg-green-950/40 dark:text-green-300"
                : "border-red-200 bg-red-50 text-red-800 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300"
            }`}
          >
            {message.text}
          </div>
        )}

        {!readOnly ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder="Título del comunicado"
              value={form.title}
              onChange={(event) => setField("title", event.target.value)}
            />
            <select title="Tipo de comunicado"
              value={form.broadcastType}
              onChange={(event) => setField("broadcastType", event.target.value as BroadcastType)}
              className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3">
            <textarea
              value={form.message}
              onChange={(event) => setField("message", event.target.value)}
              placeholder="Mensaje que se mostrará en los paneles admin tenant"
              rows={4}
              className="w-full rounded-xl border border-zinc-200 bg-white p-3 text-sm text-zinc-700 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <select title="Prioridad del comunicado"
              value={form.priority}
              onChange={(event) => setField("priority", event.target.value as BroadcastPriority)}
              className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            >
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  prioridad: {option}
                </option>
              ))}
            </select>

            <select title="Alcance del comunicado"
              value={form.targetScope}
              onChange={(event) => setField("targetScope", event.target.value as TargetScope)}
              className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            >
              {SCOPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  alcance: {option}
                </option>
              ))}
            </select>

            <label className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
              <input
                type="checkbox"
                checked={form.requiresAck}
                onChange={(event) => setField("requiresAck", event.target.checked)}
              />
              Requiere acuse
            </label>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm text-zinc-700 dark:text-zinc-300">
              Inicio
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(event) => setField("startsAt", event.target.value)}
                className="h-10 rounded-xl border border-zinc-200 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>

            <label className="grid gap-1 text-sm text-zinc-700 dark:text-zinc-300">
              Fin (opcional)
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(event) => setField("endsAt", event.target.value)}
                className="h-10 rounded-xl border border-zinc-200 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <textarea
              value={form.targetPlanIdsText}
              onChange={(event) => setField("targetPlanIdsText", event.target.value)}
              placeholder="Plan IDs (uno por línea)"
              rows={3}
              className="rounded-xl border border-zinc-200 bg-white p-3 text-xs text-zinc-700 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            />
            <textarea
              value={form.targetCompanyIdsText}
              onChange={(event) => setField("targetCompanyIdsText", event.target.value)}
              placeholder="Company IDs (uno por línea)"
              rows={3}
              className="rounded-xl border border-zinc-200 bg-white p-3 text-xs text-zinc-700 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            />
            <textarea
              value={form.targetSubdomainsText}
              onChange={(event) => setField("targetSubdomainsText", event.target.value)}
              placeholder="Subdominios (uno por línea)"
              rows={3}
              className="rounded-xl border border-zinc-200 bg-white p-3 text-xs text-zinc-700 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            />
          </div>

          <div className="mt-3 flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setField("isActive", event.target.checked)}
              />
              Activo
            </label>

            <Button onClick={() => void submit()} disabled={saving || loading} className="bg-zinc-900 hover:bg-zinc-800">
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
          <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-700 dark:border-zinc-700">
            {loading ? <div className="p-4 text-sm text-zinc-500 dark:text-zinc-400">Cargando comunicados...</div> : null}
            {!loading && sortedItems.length === 0 ? (
              <div className="p-4 text-sm text-zinc-500 dark:text-zinc-400">Aún no hay comunicados.</div>
            ) : null}
            {sortedItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/60">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">{item.title}</p>
                    <span className="rounded-full border border-zinc-300 px-2 py-0.5 text-[11px] font-semibold text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
                      {item.broadcastType}
                    </span>
                    <span className="rounded-full border border-zinc-300 px-2 py-0.5 text-[11px] font-semibold text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
                      {item.priority}
                    </span>
                    {!item.isActive ? (
                      <span className="rounded-full border border-red-300 px-2 py-0.5 text-[11px] font-semibold text-red-600 dark:border-red-900/70 dark:text-red-400">
                        Inactivo
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{item.message}</p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    alcance: {item.targetScope} · inicia: {new Date(item.startsAt).toLocaleString("es-CL")} · {item.requiresAck ? "con acuse" : "sin acuse"}
                  </p>
                </div>

                {!readOnly ? (
                <div className="flex gap-2">
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
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300">
          <Megaphone className="mr-2 inline h-4 w-4" />
          Recomendación: para mantenimiento usa prioridad `high` o `critical` y activa `requiere acuse`.
        </div>
      </div>
    </Card>
  );
}
