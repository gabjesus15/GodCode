"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { revalidateMenuCache } from "@/app/actions/revalidate";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { logAdminAction } from "@/utils/audit";
import { requireAdminRole, roleSets } from "@/utils/admin";
import { slugify } from "@/utils/slugify";
import { useAdminRole } from "@/components/super-admin/shell/admin-role-context";

interface BranchesCreateFormProps {
  companyId: string;
  businessInfo?: {
    country?: string | null;
    currency?: string | null;
  };
}

export function BranchesCreateForm({ companyId, businessInfo }: BranchesCreateFormProps) {
  const { readOnly } = useAdminRole();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    address: "",
    phone: "",
    is_active: true,
    country: businessInfo?.country ?? "",
    currency: businessInfo?.currency ?? "",
  });

  const [betaLimitReached, setBetaLimitReached] = useState(false);

  // Check beta plan branch limit on mount
  useEffect(() => {
    async function checkBetaLimit() {
      if (!companyId) return;
      try {
        const res = await fetch(`/api/super-admin/branches/limit-beta?company_id=${encodeURIComponent(companyId)}`);
        const json = await res.json();
        setBetaLimitReached(json.allowed === false);
      } catch {
        setBetaLimitReached(false);
      }
    }
    checkBetaLimit();
  }, [companyId]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const permission = await requireAdminRole(roleSets.billing);
      if (!permission.ok) {
        throw new Error(permission.error);
      }
      const finalSlug = form.slug.trim() || slugify(form.name);
      if (!finalSlug) {
        throw new Error("Define un slug valido para la sucursal.");
      }

      const res = await fetch("/api/super-admin/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: companyId,
          name: form.name,
          slug: finalSlug,
          address: form.address,
          phone: form.phone,
          is_active: form.is_active,
          country: form.country || null,
          currency: form.currency || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "No se pudo crear la sucursal");
      }

      await logAdminAction({
        action: "branch.create",
        targetType: "branch",
        targetId: data.branch?.id,
        companyId,
        metadata: { name: form.name, slug: finalSlug },
      });
      setBetaLimitReached(false);
      setForm({ name: "", slug: "", address: "", phone: "", is_active: true, country: businessInfo?.country ?? "", currency: businessInfo?.currency ?? "" });
      await revalidateMenuCache(companyId);
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo crear la sucursal.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const selectClass =
    "h-11 w-full min-w-0 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-500";

  return (
    <form className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-7" onSubmit={handleSubmit}>
      <div className="min-w-0 sm:col-span-2">
        <Input
          value={form.name}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, name: event.target.value }))
          }
          placeholder="Nombre de sucursal"
          required
          className="w-full min-w-0"
        />
      </div>
      {betaLimitReached && (
        <div className="text-indigo-600 text-sm mb-2">El plan beta solo permite 2 sucursales. No puedes crear más.</div>
      )}
      <div className="min-w-0">
        <Input
          value={form.slug}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, slug: event.target.value }))
          }
          placeholder="Slug"
          className="w-full min-w-0"
        />
      </div>
      <div className="min-w-0">
        <Input
          value={form.address}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, address: event.target.value }))
          }
          placeholder="Dirección"
          className="w-full min-w-0"
        />
      </div>
      <div className="min-w-0">
        <Input
          value={form.phone}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, phone: event.target.value }))
          }
          placeholder="Teléfono"
          className="w-full min-w-0"
        />
      </div>
      <div className="min-w-0">
        <select
          title="Selecciona país"
          value={form.country}
          onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value }))}
          className={selectClass}
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
      </div>
      <div className="min-w-0">
        <select
          title="Selecciona moneda"
          value={form.currency}
          onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value }))}
          className={selectClass}
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
      </div>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 sm:col-span-2 md:col-span-1">
        <label className="flex shrink-0 items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, is_active: event.target.checked }))
            }
            className="rounded border-zinc-300 dark:border-zinc-600 dark:bg-zinc-800"
          />
          Activa
        </label>
        <Button type="submit" size="sm" loading={loading} disabled={readOnly} className="shrink-0">
          Crear sucursal
        </Button>
      </div>
      {error ? (
        <div className="col-span-full rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300">
          {error}
        </div>
      ) : null}
    </form>
  );
}
