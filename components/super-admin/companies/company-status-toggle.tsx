"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useAdminRole } from "@/components/super-admin/shell/admin-role-context";
import { companySubscriptionStatus } from "@/lib/super-admin/status-maps";

interface CompanyStatusToggleProps {
  companyId: string;
  currentStatus: string | null;
}

/** Suspender o reactivar desde la lista. Pasa por el servidor, que valida y deja auditoría. */
export function CompanyStatusToggle({ companyId, currentStatus }: CompanyStatusToggleProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { readOnly } = useAdminRole();

  if (readOnly) {
    return (
      <div className="text-xs text-zinc-500 dark:text-zinc-400">
        Estado: <span className="font-medium text-zinc-700 dark:text-zinc-300">{companySubscriptionStatus(currentStatus).label}</span>
      </div>
    );
  }

  const nextStatus = currentStatus === "suspended" ? "active" : "suspended";

  const handleToggle = async () => {
    if (nextStatus === "suspended" && !window.confirm("¿Suspender esta empresa? Su tienda queda fuera de línea hasta que la reactives.")) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/super-admin/companies/${companyId}/subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_status", status: nextStatus }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "No se pudo cambiar el estado.");
        return;
      }
      router.refresh();
    } catch {
      setError("No pudimos conectar. Revisa tu conexión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inline-flex max-w-[min(100%,14rem)] flex-col gap-1.5">
      <Button
        size="sm"
        variant={nextStatus === "active" ? "default" : "outline"}
        loading={loading}
        onClick={handleToggle}
        className="w-full shrink-0 sm:w-auto"
      >
        {nextStatus === "active" ? "Reactivar" : "Suspender"}
      </Button>
      {error ? <span className="text-xs leading-snug text-red-600">{error}</span> : null}
    </div>
  );
}
