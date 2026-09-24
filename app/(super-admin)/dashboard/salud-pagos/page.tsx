import { HeartPulse } from "lucide-react";
import { fetchPaymentHealthRows } from "@/lib/super-admin/super-admin-metrics";
import { SaludPagosClient } from "@/components/super-admin/dashboard/salud-pagos-client";
import { SaasPageHeader } from "@/components/super-admin/shared/saas-page-header";
import { requireSuperAdminSession } from "@/lib/super-admin/require-super-admin-session";

export const metadata = { title: "Salud de pagos" };

export const dynamic = "force-dynamic";

export default async function SaludPagosPage() {
  await requireSuperAdminSession();
  const { rows, error } = await fetchPaymentHealthRows(60);

  return (
    <div className="min-w-0 space-y-6">
      <SaasPageHeader
        title="Salud de pagos"
        description="Empresas cuyo estado no cuadra con sus pagos: activas sin ningún pago confirmado o suspendidas con un pago confirmado en los últimos 90 días."
        icon={HeartPulse}
        backHref="/dashboard"
        backLabel="Volver al inicio"
      />
      <SaludPagosClient rows={rows} error={error} />
    </div>
  );
}
