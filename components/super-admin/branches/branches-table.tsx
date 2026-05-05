import { Card } from "@/components/ui/card";
import { BranchRow } from "./branch-row";

interface BranchesTableProps {
  branches: Array<{
    id: string;
    name: string;
    slug: string;
    address: string;
    phone: string;
    is_active: boolean;
    country: string;
    currency: string;
    instagram: string;
    schedule: string;
    payment_methods: string[];
    pago_movil?: {
      banco?: string;
      telefono?: string;
      ci?: string;
    } | null;
    zelle?: {
      email?: string;
      name?: string;
    } | null;
    transferencia_bancaria?: {
      banco?: string;
      nro_cuenta?: string;
      ci?: string;
      nombre?: string;
    } | null;
    stripe?: { [key: string]: string } | null;
    mercadopago?: { [key: string]: string } | null;
    efectivo?: { [key: string]: string } | null;
    tarjeta?: { [key: string]: string } | null;
    paypal?: { [key: string]: string } | null;
    company_id: string;
    delivery_settings?: unknown;
  }>;
}

export function BranchesTable({ branches }: BranchesTableProps) {
  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Sucursales</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Gestiona ubicaciones y disponibilidad.
        </p>
      </div>
      <div className="grid gap-4">
        {branches.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
            No hay sucursales registradas.
          </div>
        ) : (
          branches.map((branch) => <BranchRow key={branch.id} branch={branch} />)
        )}
      </div>
    </Card>
  );
}
