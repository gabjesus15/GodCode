"use client";
import dynamic from "next/dynamic";

import { SaasPageHeader } from "@/components/super-admin/shared/saas-page-header";

const TicketsManager = dynamic(() => import("@/components/super-admin/tickets/tickets-manager").then(mod => mod.default), { ssr: false });

export function TicketsClient() {
  return (
    <div className="min-w-0 space-y-6">
      <SaasPageHeader title="Tickets" description="Mesa unificada de soporte para todos los negocios con SLA básico." />

      <TicketsManager />
    </div>
  );
}
