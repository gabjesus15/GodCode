"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Blocks, Pencil, Plus, Save, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAdminRole } from "@/components/super-admin/shell/admin-role-context";

type NavGroup = "root" | "sales" | "menu";
type RoleName = "admin" | "ceo" | "cashier";

interface AdminModule {
  id: string;
  tabId: string;
  label: string;
  description: string;
  navGroup: NavGroup;
  navOrder: number;
  allowedRoles: RoleName[];
  isActive: boolean;
}

const NAV_GROUP_OPTIONS: Array<{ value: NavGroup; label: string }> = [
  { value: "root", label: "Nivel raíz" },
  { value: "sales", label: "Grupo Ventas" },
  { value: "menu", label: "Grupo Menú" },
];

const ROLE_OPTIONS: RoleName[] = ["admin", "ceo", "cashier"];

const emptyForm = {
  tabId: "",
  label: "",
  description: "",
  navGroup: "root" as NavGroup,
  navOrder: 100,
  allowedRoles: ["admin", "ceo"] as RoleName[],
  isActive: true,
};

export default function AdminModulesManager() {
  const { readOnly } = useAdminRole();
  const [modules, setModules] = useState<AdminModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const sortedModules = useMemo(
    () =>
      [...modules].sort((a, b) => {
        if (a.navGroup !== b.navGroup) return a.navGroup.localeCompare(b.navGroup);
        if (a.navOrder !== b.navOrder) return a.navOrder - b.navOrder;
        return a.label.localeCompare(b.label);
      }),
    [modules]
  );

  const loadModules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/modules", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudieron cargar los módulos");
      setModules(data.modules ?? []);
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "No se pudieron cargar los módulos" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadModules();
  }, [loadModules]);

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

  const normalizeTabId = (value: string) => {
    const base = value.trim().toLowerCase().replace(/\s+/g, "-");
    if (!base) return "";
    return base.startsWith("module:") ? base : `module:${base}`;
  };

  const submit = async () => {
    if (readOnly) return;
    const tabId = normalizeTabId(form.tabId);
    if (!tabId) {
      setMessage({ type: "error", text: "Debes indicar una clave de módulo" });
      return;
    }

    if (!form.label.trim()) {
      setMessage({ type: "error", text: "Debes indicar un nombre de módulo" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: editingId,
        tabId,
        label: form.label.trim(),
        description: form.description.trim(),
        navGroup: form.navGroup,
        navOrder: Number(form.navOrder) || 100,
        allowedRoles: form.allowedRoles,
        isActive: form.isActive,
      };

      const res = await fetch("/api/super-admin/modules", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar el módulo");

      setMessage({ type: "success", text: editingId ? "Módulo actualizado" : "Módulo creado" });
      resetForm();
      await loadModules();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "No se pudo guardar el módulo" });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (module: AdminModule) => {
    if (readOnly) return;
    setEditingId(module.id);
    setForm({
      tabId: module.tabId,
      label: module.label,
      description: module.description,
      navGroup: module.navGroup,
      navOrder: module.navOrder,
      allowedRoles: module.allowedRoles,
      isActive: module.isActive,
    });
  };

  const handleDelete = async (module: AdminModule) => {
    if (readOnly) return;
    if (!confirm(`¿Eliminar el módulo "${module.label}"?`)) return;

    setSaving(true);
    try {
      const res = await fetch("/api/super-admin/modules", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: module.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo eliminar el módulo");
      setMessage({ type: "success", text: "Módulo eliminado" });
      await loadModules();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "No se pudo eliminar el módulo" });
    } finally {
      setSaving(false);
    }
  };

  const toggleRole = (role: RoleName) => {
    if (readOnly) return;
    setForm((prev) => {
      const exists = prev.allowedRoles.includes(role);
      const next = exists ? prev.allowedRoles.filter((item) => item !== role) : [...prev.allowedRoles, role];
      return { ...prev, allowedRoles: next.length > 0 ? next : ["admin", "ceo"] };
    });
  };

  return (
    <Card className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900/80">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Módulos dinámicos tenant admin</h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Crea módulos nuevos y define dónde aparecen en la navbar del panel admin de todos los negocios.
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
              placeholder="Clave (ej: module:helpdesk)"
              value={form.tabId}
              onChange={(event) => setField("tabId", event.target.value)}
            />
            <Input
              placeholder="Nombre visible (ej: Helpdesk)"
              value={form.label}
              onChange={(event) => setField("label", event.target.value)}
            />
          </div>

          <div className="mt-3">
            <Input
              placeholder="Descripción del módulo"
              value={form.description}
              onChange={(event) => setField("description", event.target.value)}
            />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <select title="Selecciona una opción"
              value={form.navGroup}
              onChange={(event) => setField("navGroup", event.target.value as NavGroup)}
              className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            >
              {NAV_GROUP_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <Input
              type="number"
              min={1}
              placeholder="Orden"
              value={String(form.navOrder)}
              onChange={(event) => setField("navOrder", Number(event.target.value) || 100)}
            />

            <label className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setField("isActive", event.target.checked)}
              />
              Activo
            </label>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {ROLE_OPTIONS.map((role) => {
              const checked = form.allowedRoles.includes(role);
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggleRole(role)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    checked
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  {role}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex gap-2">
            <Button onClick={() => void submit()} disabled={saving || loading} className="bg-zinc-900 hover:bg-zinc-800">
              {editingId ? <Save className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
              {editingId ? "Guardar cambios" : "Crear módulo"}
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
          <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Módulos actuales ({modules.length})</h4>
          <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-700 dark:border-zinc-700">
            {loading ? <div className="p-4 text-sm text-zinc-500 dark:text-zinc-400">Cargando módulos...</div> : null}

            {!loading && sortedModules.length === 0 ? (
              <div className="p-4 text-sm text-zinc-500 dark:text-zinc-400">Aún no hay módulos dinámicos.</div>
            ) : null}

            {sortedModules.map((module) => (
              <div key={module.id} className="flex items-center justify-between gap-4 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/60">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">{module.label}</p>
                    <span className="rounded-full border border-zinc-300 px-2 py-0.5 text-[11px] font-semibold text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
                      {module.tabId}
                    </span>
                    {!module.isActive ? (
                      <span className="rounded-full border border-red-300 px-2 py-0.5 text-[11px] font-semibold text-red-600 dark:border-red-900/70 dark:text-red-400">
                        Inactivo
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{module.description || "Sin descripción"}</p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Grupo: {module.navGroup} · Orden: {module.navOrder} · Roles: {module.allowedRoles.join(", ")}
                  </p>
                </div>

                {!readOnly ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => startEdit(module)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void handleDelete(module)}
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
          <Blocks className="mr-2 inline h-4 w-4" />
          Recomendación robusta: usa claves estables `module:algo` y no cambies `tabId` después de publicar el módulo en producción.
        </div>
      </div>
    </Card>
  );
}
