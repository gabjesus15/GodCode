"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import { logAdminAction } from "@/utils/audit";
import { requireAdminRole, roleSets } from "@/utils/admin";
import { useAdminRole } from "@/components/super-admin/shell/admin-role-context";

interface CompanyStatusToggleProps {
  companyId: string;
  currentStatus: "active" | "suspended" | string | null;
}

export function CompanyStatusToggle({
  companyId,
  currentStatus,
}: CompanyStatusToggleProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { readOnly } = useAdminRole();

  if (readOnly) {
    return (
      <div className="text-xs text-zinc-500 dark:text-zinc-400">
        Estado:{" "}
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          {String(currentStatus ?? "—")}
        </span>
      </div>
    );
  }

  const nextStatus = currentStatus === "active" ? "suspended" : "active";

  const handleToggle = async () => {
    setLoading(true);
    setError(null);

    try {
      const permission = await requireAdminRole(roleSets.billing);
      if (!permission.ok) {
        throw new Error(permission.error);
      }

      const supabase = createSupabaseBrowserClient("super-admin");
      const { error: updateError } = await supabase
        .from("companies")
        .update({ subscription_status: nextStatus })
        .eq("id", companyId);

      if (updateError) {
        throw updateError;
      }

      await logAdminAction({
        action: "company.status.update",
        targetType: "company",
        targetId: companyId,
        metadata: { to: nextStatus },
      });

      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo actualizar el estado.";
      setError(message);
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
        {nextStatus === "active" ? "Activar" : "Suspender"}
      </Button>
      {error ? <span className="text-xs leading-snug text-red-600">{error}</span> : null}
    </div>
  );
}
