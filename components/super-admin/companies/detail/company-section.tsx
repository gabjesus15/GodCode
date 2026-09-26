"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAdminRole } from "@/components/super-admin/shell/admin-role-context";
import { cn } from "@/utils/cn";

/**
 * Cada sección del detalle de empresa guarda solo lo suyo. El `updated_at` vigente vive
 * aquí: al guardar una sección se actualiza, y la siguiente sección que guarde no choca con
 * el control de ediciones simultáneas (antes todo iba en un único formulario enorme).
 */

type CompanyEditContextValue = {
  companyId: string;
  updatedAt: string | null;
  setUpdatedAt: (value: string | null) => void;
};

const CompanyEditContext = createContext<CompanyEditContextValue | null>(null);

export function CompanyEditProvider({
  companyId,
  initialUpdatedAt,
  children,
}: {
  companyId: string;
  initialUpdatedAt: string | null;
  children: React.ReactNode;
}) {
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);
  const value = useMemo(() => ({ companyId, updatedAt, setUpdatedAt }), [companyId, updatedAt]);
  return <CompanyEditContext.Provider value={value}>{children}</CompanyEditContext.Provider>;
}

function useCompanyEdit(): CompanyEditContextValue {
  const ctx = useContext(CompanyEditContext);
  if (!ctx) throw new Error("useCompanySection necesita <CompanyEditProvider>");
  return ctx;
}

export type SaveResponse = {
  ok?: boolean;
  error?: string;
  updatedAt?: string;
  company?: Record<string, unknown> | null;
};

export function useCompanySection<T extends Record<string, unknown>>(initial: T) {
  const router = useRouter();
  const { companyId, updatedAt, setUpdatedAt } = useCompanyEdit();
  const [baseline, setBaseline] = useState<T>(initial);
  const [values, setValues] = useState<T>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const dirty = JSON.stringify(values) !== JSON.stringify(baseline);

  const set = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setJustSaved(false);
  }, []);

  const reset = useCallback(() => {
    setValues(baseline);
    setError(null);
  }, [baseline]);

  /**
   * Guarda con el cuerpo que arma `buildBody`. `afterSave` puede devolver los valores ya
   * normalizados por el servidor (p. ej. el dominio sin https://).
   */
  const save = useCallback(
    async (buildBody: (current: T) => Record<string, unknown>, afterSave?: (response: SaveResponse, current: T) => T) => {
      setSaving(true);
      setError(null);
      try {
        const res = await fetch(`/api/super-admin/companies/${companyId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expectedUpdatedAt: updatedAt, ...buildBody(values) }),
        });
        const data = (await res.json().catch(() => ({}))) as SaveResponse;
        if (!res.ok) {
          setError(data.error ?? "No se pudieron guardar los cambios.");
          return false;
        }
        if (data.updatedAt) setUpdatedAt(data.updatedAt);
        const next = afterSave ? afterSave(data, values) : values;
        setBaseline(next);
        setValues(next);
        setJustSaved(true);
        router.refresh();
        return true;
      } catch {
        setError("No pudimos conectar. Revisa tu conexión.");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [companyId, updatedAt, setUpdatedAt, values, router],
  );

  return { values, baseline, set, setValues, dirty, saving, error, justSaved, save, reset };
}

export function SectionCard({
  title,
  description,
  children,
  footer,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("min-w-0 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900", className)}>
      <div className="p-4 sm:p-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">{title}</h2>
          {description ? <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p> : null}
        </div>
        {children}
      </div>
      {footer}
    </section>
  );
}

/** Pie con el estado de la sección y sus botones. */
export function SectionSaveBar({
  dirty,
  saving,
  error,
  justSaved,
  onSave,
  onReset,
  saveLabel = "Guardar",
}: {
  dirty: boolean;
  saving: boolean;
  error: string | null;
  justSaved: boolean;
  onSave: () => void;
  onReset: () => void;
  saveLabel?: string;
}) {
  const { readOnly } = useAdminRole();
  if (readOnly) return null;
  return (
    <div className="flex flex-col gap-3 border-t border-zinc-100 px-5 py-3.5 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <p
        className={cn(
          "text-sm",
          error ? "text-red-600 dark:text-red-400" : dirty ? "text-amber-700 dark:text-amber-300" : "text-zinc-500 dark:text-zinc-400",
        )}
        role={error ? "alert" : "status"}
      >
        {error ? (
          error
        ) : dirty ? (
          "Cambios sin guardar"
        ) : justSaved ? (
          <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
            <Check className="h-4 w-4" aria-hidden /> Guardado
          </span>
        ) : (
          "Sin cambios"
        )}
      </p>
      <div className="flex gap-2">
        {dirty ? (
          <Button type="button" variant="ghost" size="sm" onClick={onReset} disabled={saving}>
            Descartar
          </Button>
        ) : null}
        <Button type="button" size="sm" onClick={onSave} loading={saving} disabled={!dirty}>
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}

/** Campo con etiqueta y ayuda opcional. */
export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300", className)}>
      {label}
      {children}
      {hint ? <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">{hint}</span> : null}
    </label>
  );
}
