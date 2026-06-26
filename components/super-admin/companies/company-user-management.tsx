"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SaasSelect } from "@/components/super-admin/shared/saas-select";
import { useAdminRole } from "@/components/super-admin/shell/admin-role-context";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";

const USER_ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "ceo", label: "CEO" },
  { value: "cashier", label: "Cashier" },
];

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  ceo: "CEO",
  cashier: "Cashier",
};

const RESERVED_NON_TENANT_ROLES = new Set(["super_admin", "owner"]);

interface CompanyUser {
  id: string;
  email: string;
  role: string;
  branch_id?: string | null;
  branch_name?: string | null;
}

interface BranchOption {
  id: string;
  name: string | null;
}

interface CompanyUserManagementProps {
  companyId: string;
}

export function CompanyUserManagement({ companyId }: CompanyUserManagementProps) {
  const { readOnly } = useAdminRole();
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("cashier");
  const [newBranchId, setNewBranchId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editBranchId, setEditBranchId] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [roleOptions, setRoleOptions] = useState(USER_ROLE_OPTIONS);

  const editRoleOptions = useMemo(() => {
    if (!editRole || roleOptions.some((option) => option.value === editRole)) {
      return roleOptions;
    }
    return [...roleOptions, { value: editRole, label: editRole.toUpperCase() }];
  }, [editRole, roleOptions]);

  const fetchRoleOptions = useCallback(async () => {
    try {
      const res = await fetch("/api/super-admin/roles", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        roles?: Array<{ name: string; isSystem: boolean }>;
      };
      const options = (data.roles ?? [])
        .filter((role) => !RESERVED_NON_TENANT_ROLES.has(role.name))
        .map((role) => ({ value: role.name, label: ROLE_LABELS[role.name] ?? role.name.toUpperCase() }));
      if (options.length > 0) setRoleOptions(options);
    } catch {
      setRoleOptions(USER_ROLE_OPTIONS);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/super-admin-user?companyId=${companyId}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cargar usuarios");
      const mappedUsers = (data.users || []).map(
        (row: {
          id: string | number;
          email: string;
          role: string;
          branch_id?: string | null;
          branch?: { name?: string | null } | null;
        }) => ({
          id: String(row.id),
          email: String(row.email),
          role: String(row.role),
          branch_id: row.branch_id ?? null,
          branch_name: row.branch?.name ?? null,
        })
      );
      setUsers(mappedUsers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const fetchBranches = useCallback(async () => {
    try {
      const supabase = createSupabaseBrowserClient("super-admin");
      const { data, error } = await supabase
        .from("branches")
        .select("id,name")
        .eq("company_id", companyId)
        .order("name");
      if (error) throw error;
      setBranches((data as BranchOption[]) || []);
    } catch {
      setBranches([]);
    }
  }, [companyId]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  useEffect(() => {
    fetchRoleOptions();
  }, [fetchRoleOptions]);

  async function handleAddUser() {
    const emailToSave = newEmail.trim();
    const passwordToSave = newPassword.trim();
    if (!emailToSave || !passwordToSave) return;
    setAdding(true);
    setError(null);
    try {
      const branchToSave = newBranchId || null;
      const res = await fetch("/api/auth/super-admin-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailToSave,
          password: passwordToSave,
          role: newRole,
          company_id: companyId,
          branch_id: branchToSave,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al agregar usuario");
      setNewEmail("");
      setNewRole("cashier");
      setNewBranchId("");
      setNewPassword("");
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al agregar usuario");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemoveUser(id: string) {
    if (!window.confirm("¿Estás seguro de quitar este usuario?")) return;
    setRemovingId(id);
    setError(null);
    try {
      const res = await fetch("/api/auth/super-admin-user", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al quitar usuario");
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al quitar usuario");
    } finally {
      setRemovingId(null);
    }
  }

  function startEditUser(user: CompanyUser) {
    setEditingId(user.id);
    setEditEmail(user.email);
    const normalizedRole =
      user.role.trim().toLowerCase() === "staff" ? "cashier" : user.role.trim().toLowerCase();
    setEditRole(normalizedRole);
    setEditBranchId(user.branch_id ?? "");
    setEditPassword("");
  }

  async function handleEditUser(id: string) {
    setError(null);
    try {
      const branchToSave = editBranchId || null;
      const res = await fetch("/api/auth/super-admin-user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          email: editEmail,
          role: editRole,
          password: editPassword,
          branch_id: branchToSave,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al editar usuario");
      setEditingId(null);
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al editar usuario");
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setEditEmail("");
    setEditRole("");
    setEditBranchId("");
    setEditPassword("");
  }

  const branchOptions = useMemo(
    () => [
      { value: "", label: "Todos los locales" },
      ...branches.map((b) => ({ value: b.id, label: b.name ?? "Sucursal" })),
    ],
    [branches]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-zinc-100 bg-zinc-50/50 px-4 py-3 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
        Puedes dejar la sucursal en &quot;Todos los locales&quot; para acceso global, o asignar una sucursal fija por
        correo.
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-100 dark:border-zinc-800">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
              <th className="px-4 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Correo</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Rol</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Sucursal</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-4 text-center text-zinc-500 dark:text-zinc-400">
                  Cargando usuarios...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-4 text-center text-zinc-400 dark:text-zinc-500">
                  Sin usuarios registrados
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{user.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant="neutral" className="capitalize">
                      {user.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {user.branch_name ?? "Todos los locales"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button size="sm" type="button" onClick={() => startEditUser(user)} disabled={readOnly}>
                        {editingId === user.id ? "Editando" : "Editar"}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        type="button"
                        onClick={() => handleRemoveUser(user.id)}
                        disabled={removingId === user.id || readOnly}
                      >
                        {removingId === user.id ? "Quitando..." : "Quitar"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editingId ? (
        <div className="mt-2 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Editar usuario</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Actualiza correo, rol, sucursal y contraseña del usuario seleccionado.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Correo
              <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            </label>

            <SaasSelect
              label="Rol"
              value={editRole}
              onChange={setEditRole}
              options={editRoleOptions}
            />

            <SaasSelect
              label="Sucursal asignada"
              value={editBranchId}
              onChange={setEditBranchId}
              options={branchOptions}
            />

            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Nueva contraseña (opcional)
              <Input
                type="password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="Dejar vacío para mantener"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button size="sm" type="button" onClick={() => handleEditUser(editingId)} disabled={readOnly}>
              Guardar cambios
            </Button>
            <Button
              size="sm"
              type="button"
              variant="outline"
              className="border-zinc-300 bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
              onClick={cancelEdit}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap items-end gap-3">
        <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Nuevo correo
          <Input
            type="email"
            placeholder="usuario@empresa.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            disabled={adding}
          />
        </label>
        <SaasSelect
          label="Rol"
          value={newRole}
          onChange={setNewRole}
          options={roleOptions}
          disabled={adding}
          className="min-w-[140px] flex-1"
        />
        <SaasSelect
          label="Sucursal asignada"
          value={newBranchId}
          onChange={setNewBranchId}
          options={branchOptions}
          disabled={adding}
          className="min-w-[220px] flex-1"
        />
        <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Contraseña
          <Input
            type="password"
            placeholder="Contraseña"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={adding}
          />
        </label>
        <div className="flex min-w-[190px] flex-1 items-end">
          <Button
            type="button"
            onClick={handleAddUser}
            className="w-full"
            loading={adding}
            disabled={adding || readOnly || !newEmail.trim() || !newPassword.trim()}
          >
            Agregar usuario
          </Button>
        </div>
      </div>
      {error && <div className="mt-2 text-sm font-medium text-red-600">{error}</div>}
    </div>
  );
}
