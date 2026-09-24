import { Receipt } from "lucide-react";

import { PaymentsReviewClient } from "@/components/super-admin/payments/payments-review-client";
import { SaasPageHeader } from "@/components/super-admin/shared/saas-page-header";
import { loadPaymentReviewQueue } from "@/lib/super-admin/payment-review-queue";
import { requireSuperAdminSession } from "@/lib/super-admin/require-super-admin-session";

export const dynamic = "force-dynamic";

export const metadata = { title: "Pagos por validar" };

export default async function PagosPorValidarPage() {
  const session = await requireSuperAdminSession();
  const { items, awaitingCustomerCount, error } = await loadPaymentReviewQueue();

  return (
    <div className="min-w-0 space-y-6">
      <SaasPageHeader
        title="Pagos por validar"
        description="Transferencias y otros pagos manuales de altas y de clientes activos. Al validar, se aplica lo comprado y avisamos al cliente."
        icon={Receipt}
      />
      <PaymentsReviewClient
        items={items}
        awaitingCustomerCount={awaitingCustomerCount}
        error={error}
        readOnly={session.role !== "super_admin"}
      />
    </div>
  );
}
