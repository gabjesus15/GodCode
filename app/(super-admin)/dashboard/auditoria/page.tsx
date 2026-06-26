import { Download, ShieldCheck } from "lucide-react";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { AuditoriaClient } from "@/components/super-admin/dashboard/auditoria-client";
import { SaasPageHeader } from "@/components/super-admin/shared/saas-page-header";
import type { Json } from "@/types/supabase-database";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  created_at: string;
  actor_email: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata: Json | null;
};

export default async function AuditoriaPage() {
  const { data, error } = await supabaseAdmin
    .from("admin_audit_logs")
    .select("id,created_at,actor_email,action,target_type,target_id,metadata")
    .order("created_at", { ascending: false })
    .limit(120);

  const rows = (data ?? []) as Row[];

  return (
    <div className="min-w-0 space-y-6">
      <SaasPageHeader
        title="Auditoría de mutaciones"
        description="Registro de mutaciones del API super-admin (tabla admin_audit_logs). El rol del actor se guarda dentro de metadata."
        icon={ShieldCheck}
        backHref="/dashboard"
        backLabel="Volver al dashboard"
        action={
          <a
            href="/api/super-admin/audit-log?format=csv&limit=2000"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            download
          >
            <Download className="h-4 w-4" aria-hidden />
            Descargar CSV
          </a>
        }
      />

      <AuditoriaClient rows={rows} error={error?.message ?? null} />
    </div>
  );
}
