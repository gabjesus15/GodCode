import { Card } from "@/components/ui/card";
import MetricCard from "@/components/super-admin/analytics/metric-card";
import { createSupabaseServerClient } from "@/utils/supabase/server";

interface CompanyHealthProps {
  companyId: string;
  /** Moneda de la tienda: las ventas del negocio no son en dólares. */
  currency?: string | null;
}

const dateFormatter = new Intl.DateTimeFormat("es-CL", { dateStyle: "medium" });

function formatSales(value: number, currency: string | null | undefined): string {
  const code = String(currency ?? "").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) return new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(value);
  try {
    const noDecimals = ["CLP", "COP", "ARS", "PYG", "VES"].includes(code);
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: code, maximumFractionDigits: noDecimals ? 0 : 2 }).format(value);
  } catch {
    return `${code} ${value.toFixed(0)}`;
  }
}

export async function CompanyHealth({ companyId, currency }: CompanyHealthProps) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("get_company_health", {
      p_company_id: companyId,
    });

    if (error) {
      throw error;
    }

    const metrics = data?.[0];

    return (
      <Card className="flex flex-col gap-5">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Actividad del negocio</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Pedidos y ventas de su tienda, para ver si la está usando.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Pedidos" value={`${metrics?.total_orders ?? 0}`} helper="Desde el inicio" />
          <MetricCard label="Ventas" value={formatSales(Number(metrics?.total_revenue ?? 0), currency)} helper="Total acumulado" />
          <MetricCard
            label="Último pedido"
            value={metrics?.last_order_at ? dateFormatter.format(new Date(metrics.last_order_at)) : "Sin pedidos"}
            helper="Última actividad"
          />
          <MetricCard label="Sucursales activas" value={`${metrics?.active_branches ?? 0}`} helper="En operación" />
        </div>
      </Card>
    );
  } catch {
    return (
      <Card className="border-red-200 bg-red-50 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300">
        No se pudo cargar la actividad del negocio.
      </Card>
    );
  }
}
