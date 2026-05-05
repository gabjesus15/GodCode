"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAdminRole } from "@/components/super-admin/shell/admin-role-context";

interface Role {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
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
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const customRolesCount = useMemo(
    () => roles.filter((role) => !role.isSystem).length,
    [roles],
  );

  const loadRoles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/roles", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "No se pudieron cargar los roles");
      setRoles(data.roles ?? []);
    } catch (err) {
      showMessage(
        "error",
        err instanceof Error ? err.message : "No se pudieron cargar los roles",
      );
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

  useEffect(() => {
    if (readOnly) cancelEditRole();
  }, [readOnly]);

  const handleAddRole = () => {
    void (async () => {
      if (readOnly) return;
      if (!newRole.trim()) {
        showMessage("error", "El nombre del rol es requerido");
        return;
      }

      if (
        roles.some((r) => r.name.toLowerCase() === newRole.trim().toLowerCase())
      ) {
        showMessage("error", "Ya existe un rol con ese nombre");
        return;
      }

      if (!/^[a-z_][a-z0-9_]*$/i.test(newRole)) {
        showMessage(
          "error",
          "Formato inválido. Usa solo letras, números y guión bajo",
        );
        return;
      }

      setSaving(true);
      try {
        const res = await fetch("/api/super-admin/roles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newRole.trim().toLowerCase(),
            description:
              newDescription.trim() ||
              `Rol personalizado: ${newRole.trim().toLowerCase()}`,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "No se pudo crear el rol");

        await loadRoles();
        setNewRole("");
        setNewDescription("");
        showMessage(
          "success",
          `Rol "${data.role?.name ?? newRole}" agregado correctamente.`,
        );
      } catch (err) {
        showMessage(
          "error",
          err instanceof Error ? err.message : "No se pudo crear el rol",
        );
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
        showMessage("error", "El nombre del rol es requerido");
        return;
      }

      if (!/^[a-z_][a-z0-9_]*$/i.test(editName.trim())) {
        showMessage(
          "error",
          "Formato inválido. Usa solo letras, números y guión bajo",
        );
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
        showMessage("success", "Rol actualizado correctamente.");
      } catch (err) {
        showMessage(
          "error",
          err instanceof Error ? err.message : "No se pudo editar el rol",
        );
      } finally {
        setSaving(false);
      }
    })();
  };

  const handleDeleteRole = (role: Role) => {
    void (async () => {
      if (readOnly) return;
      if (role.isSystem) {
        showMessage("error", "No puedes eliminar roles del sistema");
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
        if (!res.ok)
          throw new Error(data.error || "No se pudo eliminar el rol");

        await loadRoles();
        showMessage("success", `Rol "${role.name}" eliminado correctamente.`);
      } catch (err) {
        showMessage(
          "error",
          err instanceof Error ? err.message : "No se pudo eliminar el rol",
        );
      } finally {
        setSaving(false);
      }
    })();
  };

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  return (
    <Card className="rounded-2xl border border-zinc-200 bg-white p-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900">
            Gestión de Roles
          </h3>
          <p className="mt-1 text-sm text-zinc-500">
            Administra roles en base de datos (crear, editar, eliminar)
          </p>
        </div>

        {message && (
          <div
            className={`rounded-lg border p-3 text-sm ${
              message.type === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        {!readOnly && (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <h4 className="mb-3 text-sm font-medium text-zinc-900">
              Agregar Nuevo Rol
            </h4>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                placeholder="Nombre del rol (ej: manager)"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value.toLowerCase())}
                className="flex-1"
              />
              <Input
                placeholder="Descripción (opcional)"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleAddRole}
                disabled={!newRole.trim() || saving || loading}
                className="bg-zinc-900 hover:bg-zinc-800"
              >
                <Plus className="mr-2 h-4 w-4" />
                {saving ? "Guardando..." : "Agregar"}
              </Button>
            </div>
          </div>
        )}

        {/* Lista de roles */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-zinc-900">
            Roles Actuales ({roles.length})
          </h4>
          <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200">
            {loading && (
              <div className="p-4 text-sm text-zinc-500">Cargando roles...</div>
            )}
            {roles.map((role) => (
              <div
                key={role.id}
                className="flex items-center justify-between gap-4 p-4 hover:bg-zinc-50"
              >
                <div className="flex-1">
                  {editingRoleId === role.id ? (
                    <div className="space-y-2">
                      <Input
                        readOnly={readOnly}
                        value={editName}
                        onChange={(event) =>
                          setEditName(event.target.value.toLowerCase())
                        }
                        placeholder="Nombre del rol"
                      />
                      <Input
                        readOnly={readOnly}
                        value={editDescription}
                        onChange={(event) =>
                          setEditDescription(event.target.value)
                        }
                        placeholder="Descripción"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <code className="rounded bg-zinc-100 px-2 py-1 text-sm font-mono text-zinc-900">
                          {role.name}
                        </code>
                        {role.isSystem && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                            Sistema
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-zinc-500">
                        {role.description}
                      </p>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  {!readOnly && !role.isSystem && editingRoleId !== role.id && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startEditRole(role)}
                      className="text-zinc-700 hover:bg-zinc-100"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {!readOnly && !role.isSystem && editingRoleId === role.id && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleUpdateRole}
                        className="text-green-700 hover:bg-green-50"
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={cancelEditRole}
                        className="text-zinc-700 hover:bg-zinc-100"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {!readOnly && !role.isSystem && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteRole(role)}
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <strong>Nota:</strong> este panel usa la API interna para gestionar
          roles directamente en base de datos. Si ves errores de RPC/tablas,
          aplica la migración de roles incluida en{" "}
          <strong>supabase/migrations</strong>.
        </div>

        {customRolesCount > 0 && (
          <p className="text-xs text-zinc-500">
            Tienes {customRolesCount} rol(es) personalizado(s) activo(s).
          </p>
        )}
      </div>
    </Card>
  );
}
