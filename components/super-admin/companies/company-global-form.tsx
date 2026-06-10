"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { revalidateMenuCache } from "@/app/actions/revalidate";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CompanyUberCredentialsForm } from "./company-uber-credentials-form";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import { logAdminAction } from "@/utils/audit";
import { requireAdminRole, roleSets } from "@/utils/admin";
import { getTenantBaseDomainStatic, normalizeBaseDomain } from "@/utils/tenant-url";
import { slugify } from "@/utils/slugify";
import { uploadImage } from "@/components/tenant/utils/cloudinary";
import { useAdminRole } from "@/components/super-admin/shell/admin-role-context";
import { TENANT_ADMIN_TAB_OPTIONS } from "@/lib/super-admin/tenant-admin-tabs";
import {
  buildCompanyPanelAccessFromPlanFeatures,
  normalizeCompanyPanelAccess,
} from "@/lib/super-admin/company-panel-access";

const BrandingPreview = dynamic(
  () =>
    import("@/components/super-admin/branches/branding-preview").then(
      (mod) => mod.BrandingPreview,
    ),
  { ssr: false }
);

// ============================================================================
// INTERFACES
// ============================================================================

interface PlanOption {
  id: string;
  name: string | null;
  price: number | null;
  max_branches: number | null;
  features?: unknown;
}

interface CompanyData {
  id: string;
  name: string | null;
  legal_rut: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  public_slug: string | null;
  custom_domain?: string | null;
  plan_id: string | null;
  subscription_status: string | null;
  country?: string | null;
  currency?: string | null;
  subscription_ends_at?: string | null;
  theme_config?: {
    primaryColor?: string;
    secondaryColor?: string;
    priceColor?: string;
    discountColor?: string;
    hoverColor?: string;
    logoUrl?: string;
    backgroundColor?: string;
    backgroundImageUrl?: string;
    displayName?: string;
    panelAccess?: string[];
    roleNavPermissions?: Record<string, string[]>;
  } | null;
}

const ADMIN_TAB_OPTIONS = TENANT_ADMIN_TAB_OPTIONS;

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

interface BusinessInfo {
  name: string | null;
  phone: string | null;
  address: string | null;
  instagram: string | null;
  schedule: string | null;
  country?: string | null;
  currency?: string | null;
}

interface PaymentHistory {
  id: string;
  amount_paid: number | null;
  payment_method: string | null;
  status: string | null;
  payment_date: string | null;
  payment_reference: string | null;
  months_paid: number | null;
  reference_file_url?: string | null;
}

interface CompanyGlobalFormProps {
  company: CompanyData;
  businessInfo: BusinessInfo | null;
  plans: PlanOption[];
  payments: PaymentHistory[];
  uberIntegration: {
    clientId: string;
    hasClientSecret: boolean;
    allowTenantExternalDelivery: boolean;
  };
}

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

// ============================================================================
// SUB-COMPONENTE: GESTIÓN DE USUARIOS (Sin <form> anidados)
// ============================================================================




function UserManagement({ companyId }: { companyId: string }) {
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

    return [
      ...roleOptions,
      { value: editRole, label: editRole.toUpperCase() },
    ];
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

      if (options.length > 0) {
        setRoleOptions(options);
      }
    } catch {
      setRoleOptions(USER_ROLE_OPTIONS);
    }
  }, []);


  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/super-admin-user?companyId=${companyId}`, { cache: "no-store" });
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
        body: JSON.stringify({ email: emailToSave, password: passwordToSave, role: newRole, company_id: companyId, branch_id: branchToSave })
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
        body: JSON.stringify({ id })
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
    const normalizedRole = user.role.trim().toLowerCase() === "staff" ? "cashier" : user.role.trim().toLowerCase();
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
        body: JSON.stringify({ id, email: editEmail, role: editRole, password: editPassword, branch_id: branchToSave })
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

  return (
    <>
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-600">
        Puedes dejar la sucursal en &quot;Todos los locales&quot; para acceso global, o asignar una sucursal fija por correo.
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200">
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Correo</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Rol</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Sucursal</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-4 text-center text-zinc-500">Cargando usuarios...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-4 text-center text-zinc-400">Sin usuarios registrados</td></tr>
            ) : users.map((user) => (
              <tr key={user.id} className="hover:bg-zinc-50 transition-colors">
                <td className="px-4 py-3 text-zinc-700">{user.email}</td>
                <td className="px-4 py-3">
                  <Badge variant="neutral" className="capitalize">{user.role}</Badge>
                </td>
                <td className="px-4 py-3 text-zinc-600">{user.branch_name ?? "Todos los locales"}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex flex-wrap justify-end gap-2">
                  <Button size="sm" type="button" onClick={() => startEditUser(user)} disabled={readOnly}>
                    {editingId === user.id ? "Editando" : "Editar"}
                  </Button>
                  <Button size="sm" variant="destructive" type="button" onClick={() => handleRemoveUser(user.id)} disabled={removingId === user.id || readOnly}>
                    {removingId === user.id ? "Quitando..." : "Quitar"}
                  </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingId ? (
        <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-zinc-900">Editar usuario</h4>
            <p className="text-xs text-zinc-500">Actualiza correo, rol, sucursal y contraseña del usuario seleccionado.</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
              Correo
              <Input value={editEmail} onChange={e => setEditEmail(e.target.value)} />
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
              Rol
              <select
                value={editRole}
                onChange={e => setEditRole(e.target.value)}
                className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
              >
                {editRoleOptions.map((roleOption) => (
                  <option key={roleOption.value} value={roleOption.value}>{roleOption.label}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
              Sucursal asignada
              <select
                value={editBranchId}
                onChange={e => setEditBranchId(e.target.value)}
                className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
              >
                <option value="">Todos los locales</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name ?? "Sucursal"}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
              Nueva contraseña (opcional)
              <Input
                type="password"
                value={editPassword}
                onChange={e => setEditPassword(e.target.value)}
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

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-sm font-medium text-zinc-700">
          Nuevo correo
          <Input
            type="email"
            placeholder="usuario@empresa.com"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            disabled={adding}
          />
        </label>
        <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-sm font-medium text-zinc-700">
          Rol
          <select
            className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 disabled:opacity-50"
            value={newRole}
            onChange={e => setNewRole(e.target.value)}
            disabled={adding}
          >
            {roleOptions.map((roleOption) => (
              <option key={roleOption.value} value={roleOption.value}>{roleOption.label}</option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-sm font-medium text-zinc-700">
          Sucursal asignada
          <select
            className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 disabled:opacity-50"
            value={newBranchId}
            onChange={e => setNewBranchId(e.target.value)}
            disabled={adding}
          >
            <option value="">Todos los locales</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.name ?? "Sucursal"}</option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-sm font-medium text-zinc-700">
          Contraseña
          <Input
            type="password"
            placeholder="Contraseña"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
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
    </>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL: FORMULARIO GLOBAL DE EMPRESA
// ============================================================================

export function CompanyGlobalForm({
  company,
  businessInfo,
  plans,
  payments,
  uberIntegration,
}: CompanyGlobalFormProps) {
  const { readOnly } = useAdminRole();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extendLoading, setExtendLoading] = useState(false);
  const [extendError, setExtendError] = useState<string | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billingLoading, setBillingLoading] = useState<"stripe" | "mp" | null>(null);
  const [backgroundUploading, setBackgroundUploading] = useState(false);
  const [backgroundUploadError, setBackgroundUploadError] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);

  // Estados del formulario
  const [companyForm, setCompanyForm] = useState({
    name: company.name ?? "",
    legal_rut: company.legal_rut ?? "",
    email: company.email ?? "",
    phone: company.phone ?? "",
    address: company.address ?? "",
    public_slug: company.public_slug ?? "",
    custom_domain: company.custom_domain ?? "",
    plan_id: company.plan_id ?? "",
    subscription_status: company.subscription_status ?? "active",
    country: company.country ?? "",
    currency: company.currency ?? "",
  });

  const [themeForm, setThemeForm] = useState({
    displayName: company.theme_config?.displayName ?? "",
    primaryColor: company.theme_config?.primaryColor ?? "#111827",
    secondaryColor: company.theme_config?.secondaryColor ?? company.theme_config?.primaryColor ?? "#111827",
    priceColor: company.theme_config?.priceColor ?? "#ff4757",
    discountColor: company.theme_config?.discountColor ?? "#25d366",
    hoverColor: company.theme_config?.hoverColor ?? "#ff2e40",
    backgroundColor: company.theme_config?.backgroundColor ?? "#0a0a0a",
    backgroundImageUrl: company.theme_config?.backgroundImageUrl ?? "",
    logoUrl: company.theme_config?.logoUrl ?? "",
    panelAccess: normalizeCompanyPanelAccess(company.theme_config?.panelAccess ?? company.theme_config?.roleNavPermissions),
  });

  const [businessForm] = useState({
    name: businessInfo?.name ?? "",
    phone: businessInfo?.phone ?? "",
    address: businessInfo?.address ?? "",
    instagram: businessInfo?.instagram ?? "",
    schedule: businessInfo?.schedule ?? "",
    country: businessInfo?.country ?? "",
    currency: businessInfo?.currency ?? "",
  });

  const [monthsToAdd, setMonthsToAdd] = useState(1);
  const [monthsToBill, setMonthsToBill] = useState(1);
  
  const initialPlanId = company.plan_id;
  const initialStatus = company.subscription_status;
  const baseDomain = getTenantBaseDomainStatic();

  // Utilidades y Formateadores
  const currency = useMemo(() => new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }), []);

  const dateFormatter = useMemo(() => new Intl.DateTimeFormat("es-CL", { dateStyle: "medium" }), []);

  const statusMap: Record<string, "success" | "warning" | "destructive" | "neutral"> = {
    paid: "success",
    approved: "success",
    pending: "warning",
    pending_validation: "warning",
    rejected: "destructive",
    cancelled: "destructive",
  };

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === companyForm.plan_id) ?? null,
    [plans, companyForm.plan_id]
  );

  const isDevPlan = selectedPlan?.name?.toLowerCase().includes("dev") ?? false;
  const isBetaPlan = selectedPlan?.name?.toLowerCase().includes("beta") ?? false;
  const currentEndsAt = company.subscription_ends_at ? new Date(company.subscription_ends_at) : null;

  const addDays = (date: Date, days: number) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  };

  // Manejadores de subida de imágenes
  const handleBackgroundUpload = async (file: File | null) => {
    if (!file) return;
    setBackgroundUploading(true);
    setBackgroundUploadError(null);

    try {
      const url = await uploadImage(file, "tenant");
      setThemeForm((prev) => ({ ...prev, backgroundImageUrl: url }));
    } catch (err) {
      setBackgroundUploadError(err instanceof Error ? err.message : "No se pudo subir la imagen.");
    } finally {
      setBackgroundUploading(false);
    }
  };

  const handleLogoUpload = async (file: File | null) => {
    if (!file) return;
    setLogoUploading(true);
    setLogoUploadError(null);

    try {
      const url = await uploadImage(file, "tenant");
      setThemeForm((prev) => ({ ...prev, logoUrl: url }));
    } catch (err) {
      setLogoUploadError(err instanceof Error ? err.message : "No se pudo subir el logo.");
    } finally {
      setLogoUploading(false);
    }
  };

  const panelAccessByPlan = useMemo(
    () => buildCompanyPanelAccessFromPlanFeatures(selectedPlan?.features),
    [selectedPlan?.features]
  );

  // Manejador de Cobros (Stripe / MP)
  const handleCheckout = async (provider: "stripe" | "mp") => {
    setBillingError(null);
    setBillingLoading(provider);

    try {
      const permission = await requireAdminRole(roleSets.billing);
      if (!permission.ok) throw new Error(permission.error);
      if (!selectedPlan?.id) throw new Error("Selecciona un plan antes de cobrar.");
      if (isDevPlan) throw new Error("El plan interno no se puede cobrar.");
      if (monthsToBill <= 0) throw new Error("Define una cantidad valida de meses.");

      const supabase = createSupabaseBrowserClient("super-admin");
      const functionName = provider === "stripe" ? "stripe-checkout" : "mercadopago-preference";

      const { data, error: invokeError } = await supabase.functions.invoke(
        functionName,
        {
          body: {
            company_id: company.id,
            plan_id: selectedPlan.id,
            months: monthsToBill,
          },
        }
      );

      if (invokeError) throw invokeError;

      const url = provider === "stripe" ? (data?.url as string) : (data?.init_point as string);
      if (!url) throw new Error("No se pudo generar el link de pago.");

      await logAdminAction({
        action: "billing.checkout",
        targetType: "company",
        targetId: company.id,
        companyId: company.id,
        metadata: { provider, months: monthsToBill },
      });

      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setBillingError(err instanceof Error ? err.message : "No se pudo iniciar el cobro.");
    } finally {
      setBillingLoading(null);
    }
  };

  // Guardar todos los cambios del formulario
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const permission = await requireAdminRole(roleSets.billing);
      if (!permission.ok) throw new Error(permission.error);

      const supabase = createSupabaseBrowserClient("super-admin");
      
      // Preparar data asegurando limpieza de strings
      const normalizedCustomDomain = normalizeBaseDomain(companyForm.custom_domain);
      let nextSubscriptionEnds: string | null = company.subscription_ends_at ?? null;

      const companyUpdate: Record<string, unknown> = {
        name: companyForm.name.trim(),
        legal_rut: companyForm.legal_rut.trim(),
        email: companyForm.email.trim(),
        phone: companyForm.phone.trim(),
        address: companyForm.address.trim(),
        public_slug: companyForm.public_slug.trim(),
        custom_domain: normalizedCustomDomain || null,
        plan_id: companyForm.plan_id || null,
        subscription_status: companyForm.subscription_status,
        country: companyForm.country || null,
        currency: companyForm.currency || null,
        updated_at: new Date().toISOString(),
      };

      if (isDevPlan) {
        companyUpdate.subscription_ends_at = null;
        nextSubscriptionEnds = null;
      } else if (isBetaPlan) {
        const betaEnd = addDays(new Date(), 30).toISOString();
        companyUpdate.subscription_ends_at = betaEnd;
        nextSubscriptionEnds = betaEnd;
      }

      companyUpdate.custom_domain_expires_at = normalizedCustomDomain ? nextSubscriptionEnds : null;

      // Guardar Empresa y Theme
      const { error: companyError } = await supabase
        .from("companies")
        .update({
          ...companyUpdate,
          theme_config: {
            displayName: themeForm.displayName.trim() || null,
            primaryColor: themeForm.primaryColor,
            secondaryColor: themeForm.secondaryColor,
            priceColor: themeForm.priceColor,
            discountColor: themeForm.discountColor,
            hoverColor: themeForm.hoverColor,
            logoUrl: themeForm.logoUrl,
            backgroundColor: themeForm.backgroundColor,
            backgroundImageUrl: themeForm.backgroundImageUrl.trim() || null,
            panelAccess: panelAccessByPlan,
          },
        })
        .eq("id", company.id);

      if (companyError) throw companyError;

      // Guardar Info Pública de Negocio
      const { error: businessError } = await supabase
        .from("business_info")
        .upsert(
          {
            company_id: company.id,
            name: businessForm.name.trim(),
            phone: businessForm.phone.trim(),
            address: businessForm.address.trim(),
            instagram: businessForm.instagram.trim(),
            schedule: businessForm.schedule.trim(),
            country: businessForm.country || null,
            currency: businessForm.currency || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "company_id" }
        );

      if (businessError) throw businessError;

      // Auditoría
      await logAdminAction({
        action: "company.update",
        targetType: "company",
        targetId: company.id,
        companyId: company.id,
        metadata: {
          plan_changed: initialPlanId !== companyForm.plan_id,
          status_changed: initialStatus !== companyForm.subscription_status,
        },
      });

      // Purge Next.js cache for this tenant
      await revalidateMenuCache(company.id);

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron guardar los cambios.");
    } finally {
      setLoading(false);
    }
  };

  // Extender suscripción manualmente
  const handleExtend = async () => {
    setExtendLoading(true);
    setExtendError(null);

    try {
      const permission = await requireAdminRole(roleSets.billing);
      if (!permission.ok) throw new Error(permission.error);
      if (isDevPlan) throw new Error("El plan interno no requiere vencimiento.");
      if (monthsToAdd <= 0) throw new Error("Define una cantidad valida de meses.");

      const supabase = createSupabaseBrowserClient("super-admin");
      const now = new Date();
      const baseDate = currentEndsAt && currentEndsAt > now ? currentEndsAt : now;

      // Usamos meses comerciales de 30 dias
      const newEndsAt = addDays(baseDate, monthsToAdd * 30);
      const amount = Number(selectedPlan?.price ?? 0) * monthsToAdd;

      const { error: updateError } = await supabase
        .from("companies")
        .update({
          subscription_ends_at: newEndsAt.toISOString(),
          subscription_status: "active",
          updated_at: now.toISOString(),
          ...(company.custom_domain?.trim()
            ? { custom_domain_expires_at: newEndsAt.toISOString() }
            : {}),
        })
        .eq("id", company.id);

      if (updateError) throw updateError;

      const { error: paymentError } = await supabase
        .from("payments_history")
        .insert({
          company_id: company.id,
          plan_id: selectedPlan?.id ?? companyForm.plan_id ?? null,
          amount_paid: amount,
          payment_method: "manual",
          payment_reference: "admin-extension",
          payment_date: now.toISOString(),
          status: "paid",
          months_paid: monthsToAdd,
        });

      if (paymentError) throw paymentError;

      await logAdminAction({
        action: "billing.extend",
        targetType: "company",
        targetId: company.id,
        companyId: company.id,
        metadata: { months: monthsToAdd, amount },
      });

      router.refresh();
    } catch (err) {
      setExtendError(err instanceof Error ? err.message : "No se pudo extender la suscripción.");
    } finally {
      setExtendLoading(false);
    }
  };

  return (
    <form className="mx-auto flex w-full max-w-6xl flex-col gap-8" onSubmit={handleSubmit}>
      <fieldset disabled={loading} className="flex flex-col gap-8">
        
        <Card className="flex flex-col gap-6">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Empresa</h2>
            <p className="text-sm text-zinc-500">Datos generales del cliente y su plan actual.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
              País
              <select
                value={companyForm.country || ""}
                onChange={(e) => setCompanyForm((prev) => ({ ...prev, country: e.target.value }))}
                className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
              >
                <option value="">Selecciona país</option>
                <option value="CL">Chile</option>
                <option value="VE">Venezuela</option>
                <option value="US">Estados Unidos</option>
                <option value="MX">México</option>
                <option value="CO">Colombia</option>
                <option value="AR">Argentina</option>
                <option value="PE">Perú</option>
                <option value="EC">Ecuador</option>
                <option value="BR">Brasil</option>
                <option value="ES">España</option>
                <option value="PA">Panamá</option>
                <option value="OTRO">Otro</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
              Moneda
              <select
                value={companyForm.currency || ""}
                onChange={(e) => setCompanyForm((prev) => ({ ...prev, currency: e.target.value }))}
                className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
              >
                <option value="">Selecciona moneda</option>
                <option value="CLP">Peso chileno (CLP)</option>
                <option value="VES">Bolívar (VES)</option>
                <option value="USD">Dólar estadounidense (USD)</option>
                <option value="MXN">Peso mexicano (MXN)</option>
                <option value="COP">Peso colombiano (COP)</option>
                <option value="ARS">Peso argentino (ARS)</option>
                <option value="PEN">Sol peruano (PEN)</option>
                <option value="BRL">Real brasileño (BRL)</option>
                <option value="EUR">Euro (EUR)</option>
                <option value="OTRO">Otro</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
              Nombre
              <Input
                value={companyForm.name}
                onChange={(e) => setCompanyForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Nombre comercial"
                required
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
              RUT legal
              <Input
                value={companyForm.legal_rut}
                onChange={(e) => setCompanyForm((prev) => ({ ...prev, legal_rut: e.target.value }))}
                placeholder="99.999.999-9"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
              Email
              <Input
                type="email"
                value={companyForm.email}
                onChange={(e) => setCompanyForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="contacto@empresa.com"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
              Teléfono
              <Input
                value={companyForm.phone}
                onChange={(e) => setCompanyForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="+56 9 1234 5678"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
              Dirección
              <Input
                value={companyForm.address}
                onChange={(e) => setCompanyForm((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Av. Siempre Viva 742"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
              Public slug
              <div className="flex items-center rounded-xl border border-zinc-200 bg-white px-3">
                <Input
                  className="h-11 border-none px-0 focus:border-none"
                  value={companyForm.public_slug}
                  onChange={(e) => setCompanyForm((prev) => ({ ...prev, public_slug: slugify(e.target.value) }))}
                  placeholder="empresa-demo"
                  required
                />
                <span className="text-xs text-zinc-400">.{baseDomain}</span>
              </div>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
              Estado (no se borran empresas, solo se suspenden o reactivan)
              <select
                value={companyForm.subscription_status}
                onChange={(e) => setCompanyForm((prev) => ({ ...prev, subscription_status: e.target.value }))}
                className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
              >
                <option value="active">Activo</option>
                <option value="suspended">Suspendido</option>
                <option value="payment_pending">Pago pendiente</option>
                <option value="trial">Prueba</option>
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
              Plan
              <select
                value={companyForm.plan_id}
                onChange={(e) => setCompanyForm((prev) => ({ ...prev, plan_id: e.target.value }))}
                className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
              >
                <option value="">Sin plan</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name ?? "Plan"} - {currency.format(Number(plan.price ?? 0))}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700 md:col-span-2">
              Dominio personalizado (opcional)
              <Input
                value={companyForm.custom_domain}
                onChange={(e) =>
                  setCompanyForm((prev) => ({ ...prev, custom_domain: e.target.value }))
                }
                placeholder="menu.tunegocio.com (sin https://)"
              />
              <span className="text-xs font-normal text-zinc-500">
                Si está vacío, el negocio sigue usando{" "}
                <span className="font-medium">
                  {companyForm.public_slug}.{baseDomain}
                </span>
                . Añade el mismo host en Vercel y en DNS. La vigencia del dominio personalizado sigue la{" "}
                <span className="font-medium">fecha de vencimiento de la suscripción</span> (sección Suscripción):
                si la suscripción vence o el estado pasa a suspendido/cancelado, el menú y el proxy vuelven al
                dominio del SaaS hasta que reactivas y renuevas.
              </span>
            </label>
          </div>
        </Card>
        <Card className="flex flex-col gap-6">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">Branding</h3>
            <p className="text-sm text-zinc-500">Configura color y logo para el tenant.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
              Nombre visible
              <Input
                value={themeForm.displayName}
                onChange={(e) => setThemeForm((prev) => ({ ...prev, displayName: e.target.value }))}
                placeholder={companyForm.name || "Nombre visible"}
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
              Color primario
              <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2">
                <input
                  type="color"
                  value={themeForm.primaryColor}
                  onChange={(e) => setThemeForm((prev) => ({ ...prev, primaryColor: e.target.value }))}
                  className="h-8 w-12 cursor-pointer rounded-lg border border-zinc-200"
                />
                <span className="text-xs text-zinc-500">{themeForm.primaryColor}</span>
              </div>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
              Color secundario
              <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2">
                <input
                  type="color"
                  value={themeForm.secondaryColor}
                  onChange={(e) => setThemeForm((prev) => ({ ...prev, secondaryColor: e.target.value }))}
                  className="h-8 w-12 cursor-pointer rounded-lg border border-zinc-200"
                />
                <span className="text-xs text-zinc-500">{themeForm.secondaryColor}</span>
              </div>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
              Color precio
              <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2">
                <input
                  type="color"
                  value={themeForm.priceColor}
                  onChange={(e) => setThemeForm((prev) => ({ ...prev, priceColor: e.target.value }))}
                  className="h-8 w-12 cursor-pointer rounded-lg border border-zinc-200"
                />
                <span className="text-xs text-zinc-500">{themeForm.priceColor}</span>
              </div>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
              Color descuento
              <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2">
                <input
                  type="color"
                  value={themeForm.discountColor}
                  onChange={(e) => setThemeForm((prev) => ({ ...prev, discountColor: e.target.value }))}
                  className="h-8 w-12 cursor-pointer rounded-lg border border-zinc-200"
                />
                <span className="text-xs text-zinc-500">{themeForm.discountColor}</span>
              </div>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
              Color hover botones
              <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2">
                <input
                  type="color"
                  value={themeForm.hoverColor}
                  onChange={(e) => setThemeForm((prev) => ({ ...prev, hoverColor: e.target.value }))}
                  className="h-8 w-12 cursor-pointer rounded-lg border border-zinc-200"
                />
                <span className="text-xs text-zinc-500">{themeForm.hoverColor}</span>
              </div>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
              Fondo principal
              <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2">
                <input
                  type="color"
                  value={themeForm.backgroundColor}
                  onChange={(e) => setThemeForm((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                  className="h-8 w-12 cursor-pointer rounded-lg border border-zinc-200"
                />
                <span className="text-xs text-zinc-500">{themeForm.backgroundColor}</span>
              </div>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
              Subir imagen de fondo
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleBackgroundUpload(e.target.files?.[0] ?? null)}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600"
                disabled={backgroundUploading}
              />
              {backgroundUploading && <span className="text-xs text-zinc-500">Subiendo...</span>}
              {backgroundUploadError && <span className="text-xs text-red-600">{backgroundUploadError}</span>}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
              Subir logo
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleLogoUpload(e.target.files?.[0] ?? null)}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600"
                disabled={logoUploading}
              />
              {logoUploading && <span className="text-xs text-zinc-500">Subiendo...</span>}
              {logoUploadError && <span className="text-xs text-red-600">{logoUploadError}</span>}
            </label>
          </div>

          <BrandingPreview
            displayName={themeForm.displayName}
            name={companyForm.name}
            publicSlug={companyForm.public_slug}
            primaryColor={themeForm.primaryColor}
            secondaryColor={themeForm.secondaryColor}
            backgroundColor={themeForm.backgroundColor}
            backgroundImageUrl={themeForm.backgroundImageUrl}
            logoUrl={themeForm.logoUrl}
            priceColor={themeForm.priceColor}
            discountColor={themeForm.discountColor}
            hoverColor={themeForm.hoverColor}
          />
        </Card>

        <Card className="flex flex-col gap-6">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">Accesos del panel de la empresa</h3>
            <p className="text-sm text-zinc-500">
              Define qué secciones puede ver la empresa completa según su plan/membresía.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              {ADMIN_TAB_OPTIONS.map((tab) => {
                const checked = panelAccessByPlan.includes(tab.id);
                return (
                  <label key={tab.id} className="flex items-center gap-2 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      checked={checked}
                      readOnly
                      disabled
                      className="h-4 w-4 rounded border-zinc-300 accent-zinc-900"
                    />
                    <span>{tab.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-zinc-500">
            Para cambiar estos accesos, edita las funciones del plan en la sección de Planes.
          </p>
        </Card>

        <CompanyUberCredentialsForm
          companyId={company.id}
          initialClientId={uberIntegration.clientId}
          hasClientSecret={uberIntegration.hasClientSecret}
          initialAllowTenantExternalDelivery={
            uberIntegration.allowTenantExternalDelivery
          }
        />

        <Card className="flex flex-col gap-6">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">Suscripción</h3>
            <p className="text-sm text-zinc-500">
              Extiende el acceso manualmente usando meses de 30 días. Esta fecha también limita el dominio
              personalizado (si lo configuraste): al vencer, el cron puede marcar la cuenta como suspendida y
              el menú público deja de mostrarse hasta renovar.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-600">
            <span className="font-semibold text-zinc-900">Vence:</span>
            {isDevPlan ? (
              <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white">
                Ilimitado (interno)
              </span>
            ) : currentEndsAt ? (
              <span>{dateFormatter.format(currentEndsAt)}</span>
            ) : (
              <span>Sin fecha definida</span>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
              Meses a agregar
              <Input
                type="number"
                min={1}
                value={monthsToAdd}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setMonthsToAdd(Number.isNaN(value) ? 0 : value);
                }}
                disabled={isDevPlan}
              />
            </label>
            <div className="flex items-end">
              <Button type="button" onClick={handleExtend} loading={extendLoading} disabled={readOnly || isDevPlan || monthsToAdd <= 0}>
                Extender suscripción
              </Button>
            </div>
            <div className="text-xs text-zinc-500 self-end mb-2">
              Se calcula desde hoy o desde la fecha de vencimiento actual.
            </div>
          </div>

          {extendError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {extendError}
            </div>
          )}
        </Card>

        <Card className="flex flex-col gap-6">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">Cobros</h3>
            <p className="text-sm text-zinc-500">Genera links de pago con Stripe o MercadoPago.</p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
              Meses a cobrar
              <Input
                type="number"
                min={1}
                value={monthsToBill}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setMonthsToBill(Number.isNaN(value) ? 0 : value);
                }}
                disabled={!selectedPlan?.id || isDevPlan}
              />
            </label>
            <div className="flex items-end gap-2">
              <Button
                type="button"
                onClick={() => handleCheckout("stripe")}
                loading={billingLoading === "stripe"}
                disabled={readOnly || !selectedPlan?.id || isDevPlan || monthsToBill <= 0}
              >
                Pagar con Stripe
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleCheckout("mp")}
                loading={billingLoading === "mp"}
                disabled={readOnly || !selectedPlan?.id || isDevPlan || monthsToBill <= 0}
              >
                Pagar con MercadoPago
              </Button>
            </div>
            <div className="text-xs text-zinc-500 self-end mb-2">
              El cobro usa la regla de 30 días por mes.
            </div>
          </div>

          {billingError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {billingError}
            </div>
          )}
        </Card>

        <Card className="flex flex-col gap-6">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">Historial de pagos</h3>
            <p className="text-sm text-zinc-500">Últimos movimientos registrados.</p>
          </div>

          {payments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-sm text-zinc-500">
              No hay pagos registrados.
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200">
              {payments.map((payment) => {
                const statusKey = payment.status?.toLowerCase() ?? "neutral";
                const badge = statusMap[statusKey] ?? "neutral";
                return (
                  <div key={payment.id} className="grid gap-3 px-4 py-3 text-sm md:grid-cols-5">
                    <div>
                      <p className="text-xs text-zinc-500">Fecha</p>
                      <p className="font-medium text-zinc-900">
                        {payment.payment_date ? dateFormatter.format(new Date(payment.payment_date)) : "--"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Monto</p>
                      <p className="font-medium text-zinc-900">
                        {currency.format(Number(payment.amount_paid ?? 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Método</p>
                      <p className="font-medium text-zinc-900 capitalize">
                        {payment.payment_method ?? "--"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Estado</p>
                      <Badge variant={badge} className="capitalize">{payment.status ?? "--"}</Badge>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Referencia</p>
                      <p className="font-medium text-zinc-900 truncate" title={payment.payment_reference ?? ""}>
                        {payment.payment_reference ?? "--"}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {payment.months_paid ? `${payment.months_paid} mes(es)` : ""}
                      </p>
                      {payment.reference_file_url && (
                        <a
                          href={payment.reference_file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-block text-xs text-blue-600 hover:underline"
                        >
                          Ver comprobante
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="flex flex-col gap-6">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">Usuarios y roles</h3>
            <p className="text-sm text-zinc-500">Gestiona los correos y roles asignados a esta empresa.</p>
          </div>
          <UserManagement companyId={company.id} />
        </Card>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}
      </fieldset>

      <div className="sticky bottom-4 z-10 flex justify-end rounded-2xl border border-zinc-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur">
        <Button type="submit" loading={loading} disabled={readOnly} className="shadow-lg shadow-zinc-200" size="lg">
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}