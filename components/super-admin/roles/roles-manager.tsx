"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Pencil, Save, X, Users, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useAdminRole } from "@/components/super-admin/shell/admin-role-context";
import { toast } from "sonner";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { SaasStatusBadge } from "@/components/super-admin/shared/saas-status-badge";
import { SaasEmptyState } from "@/components/super-admin/shared/saas-empty-state";
import { ROLE_ACTION_OPTIONS, ROLE_TAB_OPTIONS } from "@/lib/super-admin/role-permissions";
import { DEFAULT_ROLE_NAV_PERMISSIONS } from "@/lib/super-admin/tenant-admin-tabs";

interface Role {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  /** admin/ceo/super_admin: ven y hacen todo, sin permisos que editar. */
  fullAccess?: boolean;
  /** false si la base aún no tiene las columnas de permisos. */
  permissionsReady?: boolean;
  /** null = lo del código (para un rol nuevo, lo mismo que el cajero). */
  navTabs?: string[] | null;
  actions?: string[];
}

/** Pestañas que el panel le da hoy a un rol sin pestañas guardadas. */
const FALLBACK_ROLE_TABS = DEFAULT_ROLE_NAV_PERMISSIONS.cashier;

function toggleIn(list: string[], value: string, checked: boolean): string[] {
  if (checked) return list.includes(value) ? list : [...list, value];
  return list.filter((item) => item !== value);
}

export default function RolesManager() {
  const { readOnly } = useAdminRole();
  const [roles, setRoles] = useState<Role[]>([]);
  const [newRole, setNewRole] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  /** Rol con el editor de permisos abierto, y lo marcado sin guardar. */
  const [permissionsRoleId, setPermissionsRoleId] = useState<string | null>(null);
  const [draftTabs, setDraftTabs] = useState<string[]>([]);
  const [draftActions, setDraftActions] = useState<string[]>([]);
  const [listRef] = useAutoAnimate();

  const customRolesCount = useMemo(
    () => roles.filter((role) => !role.isSystem).length,
    [roles],
  );

  const loadRoles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/roles", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudieron cargar los roles");
      setRoles(data.roles ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudieron cargar los roles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const cancelEditRole = () => {
    setEditingRoleId(null);
    setEditName("");
    setEditDescription("");
  };

  const closePermissions = () => {
    setPermissionsRoleId(null);
    setDraftTabs([]);
    setDraftActions([]);
  };

  useEffect(() => {
    if (readOnly) {
      cancelEditRole();
      closePermissions();
    }
  }, [readOnly]);

  const openPermissions = (role: Role) => {
    if (readOnly || role.fullAccess) return;
    setPermissionsRoleId(role.id);
    setDraftTabs(Array.isArray(role.navTabs) ? role.navTabs : [...FALLBACK_ROLE_TABS]);
    setDraftActions(Array.isArray(role.actions) ? role.actions : []);
  };

  const handleSavePermissions = () => {
    void (async () => {
      if (readOnly || !permissionsRoleId) return;
      setSaving(true);
      try {
        const res = await fetch("/api/super-admin/roles", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: permissionsRoleId, navTabs: draftTabs, actions: draftActions }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "No se pudieron guardar los permisos");

        await loadRoles();
        closePermissions();
        toast.success(`Permisos de "${data.role?.name ?? "rol"}" guardados.`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "No se pudieron guardar los permisos");
      } finally {
        setSaving(false);
      }
    })();
  };

  const handleAddRole = () => {
    void (async () => {
      if (readOnly) return;
      if (!newRole.trim()) {
        toast.error("El nombre del rol es requerido");
        return;
      }

      if (roles.some((r) => r.name.toLowerCase() === newRole.trim().toLowerCase())) {
        toast.error("Ya existe un rol con ese nombre");
        return;
      }

      if (!/^[a-z_][a-z0-9_]*$/i.test(newRole)) {
        toast.error("Formato inválido. Usa solo letras, números y guión bajo");
        return;
      }

      setSaving(true);
      try {
        const res = await fetch("/api/super-admin/roles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newRole.trim().toLowerCase(),
            description: newDescription.trim() || `Rol personalizado: ${newRole.trim().toLowerCase()}`,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "No se pudo crear el rol");

        await loadRoles();
        setNewRole("");
        setNewDescription("");
        toast.success(`Rol "${data.role?.name ?? newRole}" agregado correctamente.`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "No se pudo crear el rol");
      } finally {
        setSaving(false);
      }
    })();
  };

  const startEditRole = (role: Role) => {
    if (readOnly) return;
    setEditingRoleId(role.id);
    setEditName(role.name);
    setEditDescription(role.description || "");
  };

  const handleUpdateRole = () => {
    void (async () => {
      if (readOnly) return;
      if (!editingRoleId) return;
      if (!editName.trim()) {
        toast.error("El nombre del rol es requerido");
        return;
      }

      if (!/^[a-z_][a-z0-9_]*$/i.test(editName.trim())) {
        toast.error("Formato inválido. Usa solo letras, números y guión bajo");
        return;
      }

      setSaving(true);
      try {
        const res = await fetch("/api/super-admin/roles", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingRoleId,
            name: editName.trim().toLowerCase(),
            description: editDescription.trim() || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "No se pudo editar el rol");

        await loadRoles();
        cancelEditRole();
        toast.success("Rol actualizado correctamente.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "No se pudo editar el rol");
      } finally {
        setSaving(false);
      }
    })();
  };

  const handleDeleteRole = (role: Role) => {
    void (async () => {
      if (readOnly) return;
      if (role.isSystem) {
        toast.error("No puedes eliminar roles del sistema");
        return;
      }

      if (!confirm(`¿Eliminar el rol "${role.name}"?`)) {
        return;
      }

      setSaving(true);
      try {
        const res = await fetch("/api/super-admin/roles", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: role.id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "No se pudo eliminar el rol");

        await loadRoles();
        toast.success(`Rol "${role.name}" eliminado correctamente.`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "No se pudo eliminar el rol");
      } finally {
        setSaving(false);
      }
    })();
  };

  return (
    <Card className="shadow-none rounded-2xl border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
            <Users className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 sm:text-lg">Gestión de roles</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Crea roles y define qué ve y qué puede hacer cada uno en el panel del local.</p>
          </div>
        </div>

        {!readOnly && (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-700/60 dark:bg-zinc-900/50">
            <h4 className="mb-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">Agregar nuevo rol</h4>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                placeholder="Nombre del rol (ej: manager)"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value.toLowerCase())}
                className="h-10 flex-1 rounded-xl"
              />
              <Input
                placeholder="Descripción (opcional)"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="h-10 flex-1 rounded-xl"
              />
              <Button
                onClick={handleAddRole}
                disabled={!newRole.trim() || saving || loading}
              >
                <Plus className="mr-2 h-4 w-4" />
                {saving ? "Guardando..." : "Agregar"}
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Roles actuales ({roles.length})</h4>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
              ))}
            </div>
          ) : roles.length === 0 ? (
            <SaasEmptyState icon={Users} title="Sin roles" description="Aún no hay roles configurados." />
          ) : (
            <div ref={listRef} className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
              {roles.map((role) => (
                <div key={role.id}>
                <div
                  className="flex items-center justify-between gap-4 p-4 transition hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40"
                >
                  <div className="min-w-0 flex-1">
                    {editingRoleId === role.id ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input
                          readOnly={readOnly}
                          value={editName}
                          onChange={(event) => setEditName(event.target.value.toLowerCase())}
                          placeholder="Nombre del rol"
                          className="h-10 rounded-xl"
                        />
                        <Input
                          readOnly={readOnly}
                          value={editDescription}
                          onChange={(event) => setEditDescription(event.target.value)}
                          placeholder="Descripción"
                          className="h-10 rounded-xl"
                        />
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          <code className="rounded-lg bg-zinc-100 px-2 py-0.5 text-sm font-mono text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
                            {role.name}
                          </code>
                          {role.isSystem && <SaasStatusBadge label="Sistema" variant="info" />}
                          {role.fullAccess && role.name !== "super_admin" && (
                            <SaasStatusBadge label="Ve y hace todo" variant="neutral" />
                          )}
                        </div>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{role.description}</p>
                      </>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {!readOnly && !role.fullAccess && permissionsRoleId !== role.id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openPermissions(role)}
                        disabled={saving || role.permissionsReady === false}
                        title={
                          role.permissionsReady === false
                            ? "Falta aplicar en la base sql/2026-10-16_role_permissions.sql"
                            : "Qué ve y qué puede hacer este rol en el panel del local"
                        }
                      >
                        <SlidersHorizontal className="mr-1.5 h-4 w-4" />
                        Permisos
                      </Button>
                    )}
                    {!readOnly && !role.isSystem && editingRoleId !== role.id && (
                      <Button size="sm" variant="ghost" onClick={() => startEditRole(role)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {!readOnly && !role.isSystem && editingRoleId === role.id && (
                      <>
                        <Button size="sm" variant="ghost" onClick={handleUpdateRole} className="text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40">
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelEditRole}>
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {!readOnly && !role.isSystem && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteRole(role)}
                        className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                {permissionsRoleId === role.id && (
                  <div className="space-y-4 border-t border-zinc-100 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                    {!role.isSystem && (
                      <p className="rounded-xl border border-amber-200/60 bg-amber-50/60 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                        Este rol todavía no puede entrar al panel del local: por ahora los permisos se aplican al cajero.
                      </p>
                    )}
                    <fieldset className="space-y-2">
                      <legend className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Pestañas que ve</legend>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Solo aparecen si además el plan de la empresa las incluye.
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {ROLE_TAB_OPTIONS.map((tab) => (
                          <label key={tab.id} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                            <Checkbox
                              checked={draftTabs.includes(tab.id)}
                              disabled={saving}
                              onCheckedChange={(checked) => setDraftTabs((prev) => toggleIn(prev, tab.id, checked))}
                            />
                            {tab.label}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <fieldset className="space-y-2">
                      <legend className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Acciones que puede hacer</legend>
                      <div className="space-y-2">
                        {ROLE_ACTION_OPTIONS.map((action) => (
                          <label key={action.key} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                            <Checkbox
                              className="mt-0.5"
                              checked={draftActions.includes(action.key)}
                              disabled={saving}
                              onCheckedChange={(checked) => setDraftActions((prev) => toggleIn(prev, action.key, checked))}
                            />
                            <span>
                              <span className="font-medium text-zinc-900 dark:text-zinc-100">{action.label}</span>
                              <span className="block text-xs text-zinc-500 dark:text-zinc-400">{action.description}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Vale para todas las empresas. Owner, admin y CEO siempre ven y hacen todo.
                    </p>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={closePermissions} disabled={saving}>
                        Cancelar
                      </Button>
                      <Button size="sm" onClick={handleSavePermissions} disabled={saving}>
                        <Save className="mr-1.5 h-4 w-4" />
                        {saving ? "Guardando..." : "Guardar permisos"}
                      </Button>
                    </div>
                  </div>
                )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-amber-200/60 bg-amber-50/60 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          <strong>Nota:</strong> este panel usa la API interna para gestionar roles directamente en base de datos. Si ves errores de RPC/tablas, falta aplicar en la base las funciones y tablas de roles.
        </div>

        {customRolesCount > 0 && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Tienes {customRolesCount} rol(es) personalizado(s) activo(s).
          </p>
        )}
      </div>
    </Card>
  );
}
