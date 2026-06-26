import { HeartPulse } from "lucide-react";
import { fetchPaymentHealthRows } from "@/lib/super-admin/super-admin-metrics";
import { SaludPagosClient } from "@/components/super-admin/dashboard/salud-pagos-client";
import { SaasPageHeader } from "@/components/super-admin/shared/saas-page-header";

export const dynamic = "force-dynamic";

export default async function SaludPagosPage() {
  const { rows, error } = await fetchPaymentHealthRows(60);

  return (
    <div className="min-w-0 space-y-6">
      <SaasPageHeader
        title="Salud de pagos"
        description="Heurísticas para detectar desalineación entre estado de suscripción y último pago registrado."
        icon={HeartPulse}
        backHref="/dashboard"
        backLabel="Volver al dashboard"
      />
      <SaludPagosClient rows={rows} error={error} />
    </div>
  );
}
