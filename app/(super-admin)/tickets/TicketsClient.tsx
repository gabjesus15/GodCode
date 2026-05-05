"use client";
import dynamic from "next/dynamic";

const TicketsManager = dynamic(() => import("@/components/super-admin/tickets/tickets-manager").then(mod => mod.default), { ssr: false });

export function TicketsClient() {
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 sm:text-2xl">Tickets</h2>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          Mesa unificada de soporte para todos los negocios con SLA básico.
        </p>
      </div>

      <TicketsManager />
    </div>
  );
}
